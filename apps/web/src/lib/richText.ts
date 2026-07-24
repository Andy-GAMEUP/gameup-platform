export function stripRichText(html?: string) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export function isEmptyRichText(html?: string) {
  return stripRichText(html).length === 0
}
