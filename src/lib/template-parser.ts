export function renderTemplate(body: string, data: Record<string, string>): string {
  return body.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    return Object.prototype.hasOwnProperty.call(data, trimmedKey) ? data[trimmedKey] : match;
  });
}
