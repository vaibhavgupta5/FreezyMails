import * as cheerio from "cheerio";

export interface ScrapeResult {
  emails: string[];
  companyName: string;
  personName: string;
  subLinks: string[];
}

// Helper: De-obfuscate HTML entities and text replacements like [at], (dot)
export function deobfuscateHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  // 1. Basic HTML Entity decoding (decimal & hex & common names)
  let clean = rawHtml
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&commat;/gi, "@")
    .replace(/&period;/gi, ".");

  // 2. De-obfuscate text patterns: e.g. "john [at] company [dot] com" -> "john@company.com"
  clean = clean.replace(/([a-zA-Z0-9._%+-]+)\s*[\(\[]\s*at\s*[\)\]]\s*([a-zA-Z0-9.-]+)\s*[\(\[]\s*dot\s*[\)\]]\s*([a-zA-Z]{2,24})/gi, "$1@$2.$3");

  return clean;
}

// Helper: Scrape a single URL HTML and extract candidates
export async function fetchAndScrapePage(
  url: string,
  targetDomain: string,
  baseHostname: string,
  isSubPage = false
): Promise<ScrapeResult> {
  const emails: string[] = [];
  const subLinks: string[] = [];
  let companyName = "";
  let personName = "";
  let linkedinUrl: string | undefined;
  let twitterUrl: string | undefined;
  let phone: string | undefined;

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

    const rawHtml = await res.text();
    const html = deobfuscateHtml(rawHtml);
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

    // 3. Extract Social & Phone Links
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!linkedinUrl && href.includes("linkedin.com/company/")) {
        linkedinUrl = href.trim();
      }
      if (!twitterUrl && (href.includes("twitter.com/") || href.includes("x.com/")) && !href.includes("intent/tweet")) {
        twitterUrl = href.trim();
      }
      if (!phone && href.startsWith("tel:")) {
        phone = href.replace(/^tel:/i, "").trim();
      }
    });

    // 4. Extract Company Name (if not subpage or if strong)
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
          } catch {
            // Ignore parse error
          }
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

    // 5. Extract Person Name
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
      } catch {
        // Ignore parse error
      }
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

    // 6. If main page, find subLinks to explore careers / contact / about pages
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
          } catch {
            // Ignore URL parse error
          }
        }
      });
    }

    return { emails, companyName, personName, subLinks };
  } catch {
    clearTimeout(timeoutId);
    return { emails, companyName, personName, subLinks };
  }
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length < 5 || email.length > 70) return false;
  if (!email.includes("@") || !email.includes(".")) return false;

  const forbiddenStrings = [
    ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".js", ".css",
    "@2x", "@3x", "sentry.io", "wixpress.com", "schema.org", "w3.org",
    "example.com", "domain.com", "yourdomain.com", "react.js", "node.js",
    "next.js", "xxx@", "email@", "info@example", "user@domain", "test@",
    "@babel/", "@types/", "@emotion/", "@radix-ui/", "@tanstack/", "npm@",
    "bootstrap@", "react-dom@", "typescript@"
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

export function isCareerEmail(email: string): boolean {
  const prefix = email.split("@")[0].toLowerCase();
  const careerPrefixes = ["career", "careers", "job", "jobs", "hiring", "talent", "recruiting", "recruitment", "hr", "people", "join", "work"];
  return careerPrefixes.some(p => prefix === p || prefix.startsWith(p + ".") || prefix.startsWith(p + "-") || prefix.endsWith("." + p));
}

export function isGenericEmail(email: string): boolean {
  const prefix = email.split("@")[0].toLowerCase();
  const generics = [
    "career", "careers", "job", "jobs", "hiring", "talent", "recruiting", "hr",
    "info", "contact", "hello", "hi", "support", "sales", "help", "team", "inquiry",
    "inquiries", "general", "admin", "office", "billing", "press", "media", "privacy", "security"
  ];
  return generics.includes(prefix);
}

export function sortEmailsByPriority(emails: string[], targetDomain: string): string[] {
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

export function generateFallbackEmails(domain: string): string[] {
  if (!domain) return [];
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  return [
    `careers@${cleanDomain}`,
    `contact@${cleanDomain}`,
    `info@${cleanDomain}`,
    `hello@${cleanDomain}`,
    `support@${cleanDomain}`
  ];
}

export function derivePersonNameFromEmail(email: string): string {
  try {
    const prefix = email.split("@")[0];
    if (!prefix || isGenericEmail(email)) return "";

    // Split by dot, hyphen, or underscore (e.g. john.smith, alex-rivera, sarah_c)
    const parts = prefix.split(/[._-]/).filter(p => p.length > 1);
    if (parts.length === 0) return capitalize(prefix);
    if (parts.length === 1) return capitalize(parts[0]);

    return parts.map(p => capitalize(p)).join(" ");
  } catch {
    return "";
  }
}

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
