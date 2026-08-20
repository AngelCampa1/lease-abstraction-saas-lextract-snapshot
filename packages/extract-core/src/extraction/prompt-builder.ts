import type { LextractRegistry } from '../schema/registry.js'

const DIRECT_LEASE_PARTY_RULES = [
  'Direct lease party rules:',
  '- Extract landlord_legal_name and tenant_legal_name only for the direct lease counterparties.',
  '- For tenant_legal_name, cross-references to member accounts, billing profiles, subscription profiles, or Cobot Member Account tenant information override generic platform captions.',
  '- Generic labels like "New Incubator Space LLC Member", "Member of Cobot Rental Platform", "new member", or similar are placeholder tenant labels. Do not choose the placeholder when the referenced account/profile names a real legal company.',
  '- Prefer role-labeled caption, introductory clause, between clause, signature block, and notice block evidence.',
  '- If a labeled party says to see a member account, subscription profile, billing profile, or Cobot Member Account for tenant information, resolve the tenant from that referenced account/profile instead of copying the placeholder label.',
  '- Ignore companies appearing only as subscription/payment vendors, rental platforms, brokers, property managers, law firms, title companies, lenders, affiliates, registered agents, or email/footer boilerplate.',
  '- Do not use a DBA, brand, trade name, platform name, or property manager when a legal entity for the same party is available.',
  '- source_text for landlord_legal_name and tenant_legal_name should quote the role label, between clause, signature block, or cross-reference that supports the chosen direct party.',
].join('\n')

export function buildExtractionPrompt(registry: LextractRegistry): string {
  const fieldLines = registry.fields
    .map(
      (field) =>
        `- ${field.fieldName} (${field.displayLabel}, ${field.dataType}): ${field.description}`,
    )
    .join('\n')

  return [
    'You are extracting structured data from a commercial lease PDF.',
    'Return only valid JSON. Do not include markdown, commentary, or code fences.',
    'Use this exact response shape:',
    '{"fields":{"field_name":{"value":null,"confidence":0,"source_text":""}}}',
    'Every field value must include "value", "confidence", and "source_text".',
    'Use null when a term is not found. Confidence is a number from 0 to 1.',
    DIRECT_LEASE_PARTY_RULES,
    'Fields:',
    fieldLines,
  ].join('\n\n')
}
