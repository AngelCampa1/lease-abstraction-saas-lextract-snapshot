/**
 * Substitute $variable and ${variable} placeholders in an HTML template string.
 * Matches Python string.Template.safe_substitute — unrecognised keys are left as-is.
 */
export function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\$\{(\w+)\}|\$(\w+)/g, (match, braceKey?: string, bareKey?: string) => {
    const key = braceKey ?? bareKey ?? ''
    return key in vars ? vars[key] : match
  })
}
