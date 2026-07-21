import { ImapFlow } from "imapflow";
import { EmailAccount, MailEventType } from "@prisma/client";
import { decryptString } from "./encrypt";
import prisma from "./prisma";
import { simpleParser } from "mailparser";
import { getValidAccessToken } from "./google-auth";
import { renderTemplate } from "./template-parser";

async function classifyReply(replyId: string, body: string) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const prompt = `Classify this email reply. Reply with ONLY one of: INTERESTED, NOT_INTERESTED, OUT_OF_OFFICE, SPAM, OTHER\n\n${body.substring(0, 800)}`
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim().toUpperCase().replace(/[^A-Z_]/g, '')
    const valid = ['INTERESTED', 'NOT_INTERESTED', 'OUT_OF_OFFICE', 'SPAM', 'OTHER']
    const classification = valid.includes(text) ? text : 'OTHER'
    await prisma.reply.update({ where: { id: replyId }, data: { classification: classification as import('@prisma/client').ReplyCategory } })
  } catch (err) {
    console.error('Reply classification failed:', err)
  }
}

export async function pollReplies(account: EmailAccount) {
  let client;

  if (account.provider === "google") {
    const accessToken = await getValidAccessToken(account.id);
    client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: account.fromEmail,
        accessToken,
      },
      logger: false,
    });
  } else {
    const decryptedPass = account.imapPassEncrypted
      ? decryptString(account.imapPassEncrypted)
      : "";
    client = new ImapFlow({
      host: account.imapHost!,
      port: account.imapPort!,
      secure: account.imapPort === 993,
      auth: {
        user: account.imapUser!,
        pass: decryptedPass,
      },
      logger: false,
    });
  }

  await client.connect();

  const lock = await client.getMailboxLock("INBOX");
  try {
    const searchCriteria: Record<string, unknown> = {};
    if (account.lastPollAt) {
      searchCriteria.since = account.lastPollAt;
    } else {
      searchCriteria.since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const messages = client.fetch(searchCriteria, {
      envelope: true,
      source: true,
    });

    for await (const message of messages) {
      const envelope = message.envelope;
      if (!envelope) continue;

      // Bounce Detection
      const sender = envelope.from?.[0]?.address?.toLowerCase() || '';
      const subject = envelope.subject?.toLowerCase() || '';
      const isDaemon = sender.includes('mailer-daemon') || sender.includes('postmaster') || sender.includes('noreply');
      const isBounceSubject = subject.includes('delivery status') || subject.includes('undeliverable') || subject.includes('failed') || subject.includes('mail delivery') || subject.includes('returned mail') || subject.includes('bounce');

      if (isDaemon && isBounceSubject && message.source) {
        const parsedMail = await simpleParser(message.source);
        const text = parsedMail.text || '';
        
        // Try to extract original recipient
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const matches = text.match(emailRegex) || [];
        
        // Find matching recipient in DB
        let bouncedRecipient = null;
        for (const email of matches) {
          bouncedRecipient = await prisma.recipient.findFirst({
            where: {
              email: { equals: email, mode: 'insensitive' },
              status: 'SENT',
              campaign: { emailAccounts: { some: { id: account.id } } }
            },
            include: { campaign: true }
          });
          if (bouncedRecipient) break;
        }

        if (bouncedRecipient) {
          await prisma.recipient.update({
            where: { id: bouncedRecipient.id },
            data: { status: 'BOUNCED' }
          });
          
          await prisma.mailEvent.create({
            data: {
              recipientId: bouncedRecipient.id,
              campaignId: bouncedRecipient.campaignId,
              type: MailEventType.BOUNCED,
            }
          });

          // Check threshold
          const campaign = bouncedRecipient.campaign;
          const bounceCount = await prisma.recipient.count({
            where: { campaignId: campaign.id, status: 'BOUNCED' }
          });
          const totalCount = await prisma.recipient.count({
            where: { campaignId: campaign.id }
          });
          
          if (totalCount > 0 && (bounceCount / totalCount * 100) > campaign.bounceThreshold) {
            await prisma.campaign.update({
              where: { id: campaign.id },
              data: { status: 'PAUSED' }
            });
            console.log(`Paused campaign ${campaign.id} due to high bounce rate.`);
          }
        }
        continue; // Skip normal reply processing
      }

      const inReplyTo = envelope.inReplyTo;
      const references =
        ((envelope as Record<string, unknown>).references as string[]) || [];

      const possibleMessageIds = [inReplyTo, ...references].filter(
        (id): id is string => typeof id === "string",
      );

      const matchingCampaigns = await prisma.campaign.findMany({
        where: { emailAccounts: { some: { id: account.id } } },
        select: { id: true },
      });
      const campaignIds = matchingCampaigns.map((c) => c.id);

      const recentSentEvents = await prisma.mailEvent.findMany({
        where: {
          campaignId: { in: campaignIds },
          type: "SENT",
        },
        include: {
          recipient: true,
          campaign: {
            include: {
              template: { select: { subject: true } },
              abTemplateVariants: {
                include: {
                  subjectVariants: { select: { subject: true } }
                }
              }
            }
          }
        },
      });

      let matchedEvent = null;

      if (possibleMessageIds.length > 0) {
        matchedEvent = recentSentEvents.find((e) => {
          const meta = e.metadata as Record<string, unknown>;
          return (
            meta &&
            meta.messageId &&
            possibleMessageIds.includes(meta.messageId as string)
          );
        });
      }

      if (!matchedEvent) {
        // Fallback matching
        const replyFrom = envelope.from?.[0]?.address;
        if (replyFrom) {
          const cleanReplySubject = (envelope.subject || "")
            .replace(/^[Rr][Ee]:\s*/i, "")
            .trim()
            .toLowerCase();

          matchedEvent = recentSentEvents.find((e) => {
            if (e.recipient.email.toLowerCase() !== replyFrom.toLowerCase()) {
              return false;
            }

            const possibleSubjects = [e.campaign.template.subject];
            for (const tv of e.campaign.abTemplateVariants) {
              for (const sv of tv.subjectVariants) {
                possibleSubjects.push(sv.subject);
              }
            }

            return possibleSubjects.some((subj) => {
              const dynamicData: Record<string, string> = {};
              if (e.recipient.dynamicData && typeof e.recipient.dynamicData === "object") {
                for (const [k, v] of Object.entries(e.recipient.dynamicData as Record<string, unknown>)) {
                  dynamicData[k] = String(v);
                }
              }
              
              try {
                const renderedSubj = renderTemplate(subj, dynamicData)
                  .trim()
                  .toLowerCase();
                return renderedSubj === cleanReplySubject;
              } catch (err) {
                return subj.trim().toLowerCase() === cleanReplySubject;
              }
            });
          });
        }
      }

      if (matchedEvent) {
        const recipient = matchedEvent.recipient;

        if (!message.source) continue;
        const parsedMail = await simpleParser(message.source);

        let newReplyId = null;

        await prisma.$transaction(async (tx) => {
          const existingReply = await tx.reply.findFirst({
            where: {
              campaignId: matchedEvent!.campaignId,
              recipientId: recipient.id,
              subject: envelope.subject,
            },
          });

          if (!existingReply) {
            const createdReply = await tx.reply.create({
              data: {
                campaignId: matchedEvent!.campaignId,
                recipientId: recipient.id,
                emailAccountId: account.id,
                fromEmail: envelope.from?.[0]?.address || "unknown",
                subject: envelope.subject || "No Subject",
                body: parsedMail.text || "No text body",
                receivedAt: envelope.date || new Date(),
              },
            });
            newReplyId = createdReply.id;

            await tx.mailEvent.create({
              data: {
                recipientId: recipient.id,
                campaignId: matchedEvent!.campaignId,
                type: MailEventType.REPLIED,
              },
            });

            const dynamicData = recipient.dynamicData as Record<string, unknown> || {};
            const tVariantId = dynamicData._templateVariantId as string | undefined;
            const sVariantId = dynamicData._subjectVariantId as string | undefined;

            const campaign = await tx.campaign.findUnique({
              where: { id: matchedEvent!.campaignId },
            });

            if (tVariantId) {
              await tx.aBTemplateVariant.update({
                where: { id: tVariantId },
                data: {
                  replyCount: { increment: 1 },
                  firstReplyAt: { set: new Date() },
                }
              });
            }

            if (sVariantId) {
              await tx.aBSubjectVariant.update({
                where: { id: sVariantId },
                data: {
                  replyCount: { increment: 1 },
                  firstReplyAt: { set: new Date() },
                }
              });
            }

            // Statistical Election Check
            if (campaign && campaign.abEnabled) {
              const { calculateZScore, zScoreToConfidence } = await import('./stats');
              
              if (!campaign.winnerTemplateVariantId) {
                const templates = await tx.aBTemplateVariant.findMany({ where: { campaignId: campaign.id } });
                
                let bestTemplate = null;
                let highestReplies = -1;
                
                for (const t of templates) {
                  const sends = await tx.recipient.count({
                    where: { campaignId: campaign.id, status: 'SENT', dynamicData: { path: ['_templateVariantId'], equals: t.id } }
                  });
                  if (sends >= 30) {
                    if (t.replyCount > highestReplies) {
                      highestReplies = t.replyCount;
                      bestTemplate = { ...t, sends };
                    }
                  }
                }

                if (bestTemplate) {
                  let hasSignificantLead = true;
                  for (const t of templates) {
                    if (t.id === bestTemplate.id) continue;
                    const sends = await tx.recipient.count({
                      where: { campaignId: campaign.id, status: 'SENT', dynamicData: { path: ['_templateVariantId'], equals: t.id } }
                    });
                    
                    const z = calculateZScore(bestTemplate.replyCount, bestTemplate.sends, t.replyCount, sends);
                    if (z === null || zScoreToConfidence(z) < 0.95) {
                      hasSignificantLead = false;
                      break;
                    }
                  }

                  if (hasSignificantLead) {
                    await tx.campaign.update({
                      where: { id: campaign.id },
                      data: { winnerTemplateVariantId: bestTemplate.id }
                    });
                    await tx.aBTemplateVariant.update({
                      where: { id: bestTemplate.id },
                      data: { isWinner: true }
                    });
                    campaign.winnerTemplateVariantId = bestTemplate.id;
                  }
                }
              }

              if (campaign.winnerTemplateVariantId && !campaign.winnerSubjectVariantId) {
                const subjects = await tx.aBSubjectVariant.findMany({ where: { templateVariantId: campaign.winnerTemplateVariantId } });
                
                let bestSubject = null;
                let highestReplies = -1;
                
                for (const s of subjects) {
                  const sends = await tx.recipient.count({
                    where: { campaignId: campaign.id, status: 'SENT', dynamicData: { path: ['_subjectVariantId'], equals: s.id } }
                  });
                  if (sends >= 30) {
                    if (s.replyCount > highestReplies) {
                      highestReplies = s.replyCount;
                      bestSubject = { ...s, sends };
                    }
                  }
                }

                if (bestSubject) {
                  let hasSignificantLead = true;
                  for (const s of subjects) {
                    if (s.id === bestSubject.id) continue;
                    const sends = await tx.recipient.count({
                      where: { campaignId: campaign.id, status: 'SENT', dynamicData: { path: ['_subjectVariantId'], equals: s.id } }
                    });
                    
                    const z = calculateZScore(bestSubject.replyCount, bestSubject.sends, s.replyCount, sends);
                    if (z === null || zScoreToConfidence(z) < 0.95) {
                      hasSignificantLead = false;
                      break;
                    }
                  }

                  if (hasSignificantLead) {
                    await tx.campaign.update({
                      where: { id: campaign.id },
                      data: { winnerSubjectVariantId: bestSubject.id }
                    });
                    await tx.aBSubjectVariant.update({
                      where: { id: bestSubject.id },
                      data: { isWinner: true }
                    });
                  }
                }
              }
            }
          }
        });

        if (newReplyId) {
          classifyReply(newReplyId, parsedMail.text || '');
        }
      }
    }

    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { lastPollAt: new Date() },
    });
  } finally {
    lock.release();
    await client.logout();
  }
}
