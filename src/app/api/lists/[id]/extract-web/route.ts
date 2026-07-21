import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import * as cheerio from "cheerio";

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
          
          let emails = new Set<string>(mainResult.emails);
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
          let fallbackDomain = cleanInput.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
          let baseHostname = fallbackDomain.split(".")[0] || "Website";
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

// Helper: Scrape a single URL HTML and extract candidates
async function fetchAndScrapePage(
  url: string,
  targetDomain: string,
  baseHostname: string,
  isSubPage = false
): Promise<{ emails: string[]; companyName: string; personName: string; subLinks: string[] }> {
  const emails: string[] = [];
  const subLinks: string[] = [];
  let companyName = "";
  let personName = "";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), isSubPage ? 4000 : 6000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { emails, companyName, personName, subLinks };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return { emails, companyName, personName, subLinks };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. Extract mailto: links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const rawEmail = href.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
      if (isValidEmail(rawEmail)) emails.push(rawEmail);
    });

    // 2. Extract emails via regex across text and HTML attributes
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/g;
    const matches = html.match(emailRegex) || [];
    matches.forEach((m) => {
      const cleaned = m.trim().toLowerCase().replace(/[.,;:]$/, "");
      if (isValidEmail(cleaned)) emails.push(cleaned);
    });

    // 3. Extract Company Name (if not subpage or if strong)
    if (!isSubPage) {
      const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
      const appName = $('meta[name="application-name"]').attr("content")?.trim();
      
      if (ogSiteName && ogSiteName.length < 50) {
        companyName = ogSiteName;
      } else if (appName && appName.length < 50) {
        companyName = appName;
      } else {
        // Try JSON-LD Organization
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const json = JSON.parse($(el).html() || "{}");
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
              if (item && (item["@type"] === "Organization" || item["@type"] === "Corporation") && item.name) {
                companyName = item.name.trim();
                break;
              }
            }
          } catch (e) {}
        });

        // Try title
        if (!companyName) {
          const titleText = $("title").text().trim();
          if (titleText) {
            // Split by separator like '|', '-', ':' to get exact brand
            const parts = titleText.split(/[-|—–:]/);
            const candidate = parts[0].trim();
            if (candidate && candidate.length <= 40 && !candidate.toLowerCase().includes("page")) {
              companyName = candidate;
            } else {
              companyName = titleText.substring(0, 40);
            }
          }
        }
      }
    }

    // 4. Extract Person Name
    // Check JSON-LD Person
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item && item["@type"] === "Person" && item.name) {
            personName = item.name.trim();
            break;
          }
          if (item && (item["@type"] === "Organization" || item["@type"] === "Article") && item.author && item.author.name) {
            personName = item.author.name.trim();
            break;
          }
        }
      } catch (e) {}
    });

    // Check author meta
    if (!personName) {
      const authorMeta = $('meta[name="author"]').attr("content")?.trim();
      if (authorMeta && authorMeta.length < 40 && !authorMeta.toLowerCase().includes("team") && !authorMeta.toLowerCase().includes("inc")) {
        personName = authorMeta;
      }
    }

    // Check common team/about page person selectors
    if (!personName) {
      const teamSelector = $('[itemtype*="Person"] [itemprop="name"], .team-member .name, .profile-name, .member-name, .person h3, .author-name').first().text().trim();
      if (teamSelector && teamSelector.length < 35 && teamSelector.includes(" ")) {
        personName = teamSelector;
      }
    }

    // 5. If main page, find subLinks to explore careers / contact / about pages
    if (!isSubPage) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().toLowerCase().trim();
        const lowerHref = href.toLowerCase();

        const isContactOrCareer =
          text.includes("career") ||
          text.includes("job") ||
          text.includes("contact") ||
          text.includes("about") ||
          text.includes("team") ||
          lowerHref.includes("career") ||
          lowerHref.includes("job") ||
          lowerHref.includes("contact") ||
          lowerHref.includes("about") ||
          lowerHref.includes("team");

        if (isContactOrCareer) {
          try {
            const absoluteUrl = new URL(href, url).toString();
            const subDomain = new URL(absoluteUrl).hostname.replace(/^www\./, "");
            if (subDomain === targetDomain && !subLinks.includes(absoluteUrl)) {
              subLinks.push(absoluteUrl);
            }
          } catch (e) {}
        }
      });
    }

    return { emails, companyName, personName, subLinks };
  } catch (e) {
    clearTimeout(timeoutId);
    return { emails, companyName, personName, subLinks };
  }
}

function isValidEmail(email: string): boolean {
  if (!email || email.length < 5 || email.length > 70) return false;
  if (!email.includes("@") || !email.includes(".")) return false;

  const forbiddenStrings = [
    ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".js", ".css",
    "@2x", "@3x", "sentry.io", "wixpress.com", "schema.org", "w3.org",
    "example.com", "domain.com", "yourdomain.com", "react.js", "node.js",
    "next.js", "xxx@", "email@", "info@example", "user@domain", "test@"
  ];

  for (const forbidden of forbiddenStrings) {
    if (email.includes(forbidden)) return false;
  }

  // Ensure it has a valid TLD structure (at least 2 letters after the last dot)
  const parts = email.split(".");
  const tld = parts[parts.length - 1];
  if (!/^[a-z]{2,15}$/i.test(tld)) return false;

  return true;
}

function isCareerEmail(email: string): boolean {
  const prefix = email.split("@")[0].toLowerCase();
  const careerPrefixes = ["career", "careers", "job", "jobs", "hiring", "talent", "recruiting", "recruitment", "hr", "people", "join", "work"];
  return careerPrefixes.some(p => prefix === p || prefix.startsWith(p + ".") || prefix.startsWith(p + "-") || prefix.endsWith("." + p));
}

function isGenericEmail(email: string): boolean {
  const prefix = email.split("@")[0].toLowerCase();
  const generics = [
    "career", "careers", "job", "jobs", "hiring", "talent", "recruiting", "hr",
    "info", "contact", "hello", "hi", "support", "sales", "help", "team", "inquiry",
    "inquiries", "general", "admin", "office", "billing", "press", "media", "privacy", "security"
  ];
  return generics.includes(prefix);
}

function sortEmailsByPriority(emails: string[], targetDomain: string): string[] {
  // Deduplicate
  const unique = Array.from(new Set(emails.map(e => e.toLowerCase().trim())));

  return unique.sort((a, b) => {
    // 1. Prioritize emails matching target domain
    const aDomainMatch = a.includes(targetDomain) ? 1 : 0;
    const bDomainMatch = b.includes(targetDomain) ? 1 : 0;
    if (aDomainMatch !== bDomainMatch) return bDomainMatch - aDomainMatch;

    // 2. Prioritize career / jobs emails as requested by user
    const aCareer = isCareerEmail(a) ? 1 : 0;
    const bCareer = isCareerEmail(b) ? 1 : 0;
    if (aCareer !== bCareer) return bCareer - aCareer;

    // 3. Prioritize non-generic / personal emails over general info/support
    const aGeneric = isGenericEmail(a) ? 1 : 0;
    const bGeneric = isGenericEmail(b) ? 1 : 0;
    if (aGeneric !== bGeneric) return aGeneric - bGeneric;

    // 4. Shorter / cleaner email length wins ties
    return a.length - b.length;
  });
}

function derivePersonNameFromEmail(email: string): string {
  try {
    const prefix = email.split("@")[0];
    if (!prefix || isGenericEmail(email)) return "";

    // Split by dot, hyphen, or underscore (e.g. john.smith, alex-rivera, sarah_c)
    const parts = prefix.split(/[._-]/).filter(p => p.length > 1);
    if (parts.length === 0) return capitalize(prefix);
    if (parts.length === 1) return capitalize(parts[0]);

    return parts.map(p => capitalize(p)).join(" ");
  } catch (e) {
    return "";
  }
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
