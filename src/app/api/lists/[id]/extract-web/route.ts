import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import {
  fetchAndScrapePage,
  isCareerEmail,
  isGenericEmail,
  sortEmailsByPriority,
  derivePersonNameFromEmail,
  capitalize
} from "@/lib/extractor";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await prisma.mailingList.findFirst({
      where: { id, userId: user.id },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const body = await req.json();
    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
    }

    // Process URLs in parallel (up to 20 at a time)
    const results = await Promise.all(
      urls.slice(0, 30).map(async (rawUrl) => {
        const cleanInput = rawUrl.trim();
        if (!cleanInput) return null;

        let normalizedUrl = cleanInput;
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
          normalizedUrl = `https://${normalizedUrl}`;
        }

        try {
          const urlObj = new URL(normalizedUrl);
          const domain = urlObj.hostname.replace(/^www\./, "");
          const baseHostname = domain.split(".")[0];

          // 1. Fetch main page
          const mainResult = await fetchAndScrapePage(normalizedUrl, domain, baseHostname);
          
          const emails = new Set<string>(mainResult.emails);
          let companyName = mainResult.companyName;
          let personName = mainResult.personName;

          // 2. If no career or strong contact email found, or no person name, check internal contact/careers links
          const hasCareerEmail = Array.from(emails).some(e => isCareerEmail(e));
          if (!hasCareerEmail && mainResult.subLinks.length > 0) {
            const subResults = await Promise.all(
              mainResult.subLinks.slice(0, 3).map(link => fetchAndScrapePage(link, domain, baseHostname, true))
            );

            for (const sub of subResults) {
              sub.emails.forEach(e => emails.add(e));
              if (!companyName || companyName === capitalize(baseHostname)) {
                if (sub.companyName && sub.companyName !== capitalize(baseHostname)) {
                  companyName = sub.companyName;
                }
              }
              if (!personName && sub.personName) {
                personName = sub.personName;
              }
            }
          }

          // Filter out garbage emails and prioritize
          const sortedEmails = sortEmailsByPriority(Array.from(emails), domain);
          const bestEmail = sortedEmails.length > 0 ? sortedEmails[0] : "";

          // If personName is still empty, derive from email if email is personal
          if (!personName && bestEmail && !isGenericEmail(bestEmail)) {
            personName = derivePersonNameFromEmail(bestEmail);
          }

          return {
            url: cleanInput,
            normalizedUrl,
            email: bestEmail,
            allEmails: sortedEmails,
            companyName: companyName || capitalize(baseHostname),
            personName: personName || "",
          };
        } catch (_err: unknown) { const err = _err as Error;
          console.error(`Error extracting from ${cleanInput}:`, err.message);
          // Return fallback domain-based structure if fetch completely failed
          const fallbackDomain = cleanInput.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
          const baseHostname = fallbackDomain.split(".")[0] || "Website";
          return {
            url: cleanInput,
            normalizedUrl,
            email: "",
            allEmails: [],
            companyName: capitalize(baseHostname),
            personName: "",
            error: "Failed to connect to website",
          };
        }
      })
    );

    const validResults = results.filter(Boolean);

    return NextResponse.json({ success: true, extracted: validResults });
  } catch (_error: unknown) { const error = _error as Error;
    console.error("Error in extract-web API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

