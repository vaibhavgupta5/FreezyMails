export function renderTemplate(body: string, data: Record<string, string>, fallbacks: Record<string, string> = {}): string {
  return body.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    const val = data[trimmedKey];
    
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val);
    }
    
    const fallbackVal = fallbacks[trimmedKey];
    if (fallbackVal !== undefined && fallbackVal !== null && String(fallbackVal).trim() !== "") {
      return String(fallbackVal);
    }

    return match;
  });
}

export function wrapLinksForTracking(html: string, recipientId: string, appUrl: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    if (url.includes('/api/unsubscribe/')) {
      return match;
    }
    const trackingUrl = `${appUrl}/api/track/click/${recipientId}?url=${encodeURIComponent(url)}`;
    return `href="${trackingUrl}"`;
  });
}
