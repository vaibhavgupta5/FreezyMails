export function renderTemplate(body: string, data: Record<string, string>): string {
  return body.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    return Object.prototype.hasOwnProperty.call(data, trimmedKey) ? data[trimmedKey] : match;
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
