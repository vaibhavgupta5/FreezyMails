import { NextRequest, NextResponse } from "next/server";
import {
  fetchAndScrapePage,
  isCareerEmail,
  isGenericEmail,
  sortEmailsByPriority,
  derivePersonNameFromEmail,
  capitalize
} from "@/lib/extractor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const cleanInput = url.trim();
    if (!cleanInput) {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
    }

    let normalizedUrl = cleanInput;
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

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

    const result = {
      url: cleanInput,
      normalizedUrl,
      email: bestEmail,
      allEmails: sortedEmails,
      companyName: companyName || capitalize(baseHostname),
      personName: personName || "",
    };

    return NextResponse.json({ success: true, extracted: result });
  } catch (error) {
    console.error("Error in public extract API:", error);
    // Return fallback domain-based structure if fetch completely failed
    try {
      const body = await req.clone().json().catch(() => ({ url: "" }));
      const cleanInput = (body.url || "").trim();
      const fallbackDomain = cleanInput.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
      const baseHostname = fallbackDomain.split(".")[0] || "Website";
      return NextResponse.json({ 
        success: true, 
        extracted: {
          url: cleanInput,
          normalizedUrl: cleanInput,
          email: "",
          allEmails: [],
          companyName: capitalize(baseHostname),
          personName: "",
          error: "Failed to connect to website",
        } 
      });
    } catch  {
      return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
    }
  }
}
