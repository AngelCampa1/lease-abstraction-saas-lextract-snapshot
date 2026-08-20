import type { TeaserResponse } from '@/hooks/use-teaser'

/**
 * Hard-coded sample extraction data for the "Try a Sample" flow.
 * Shows realistic commercial lease terms so cold traffic can see
 * what Lextract output looks like without uploading their own file.
 */
export const SAMPLE_EXTRACTION_ID = 'sample'

export const SAMPLE_TEASER: TeaserResponse = {
  id: SAMPLE_EXTRACTION_ID,
  status: 'completed',
  payment_status: 'unpaid',
  document_filename: 'Sample - Office Lease (Austin, TX).pdf',
  total_field_count: 126,
  category_count: 12,
  red_flag_count: 3,
  red_flag_severity_high: 1,
  red_flag_categories: ['Termination', 'CAM Escalation', 'Insurance'],
  confidence_distribution: {
    high: 89,
    medium: 24,
    low: 8,
    not_found: 5,
  },
  visible_fields: [
    {
      field_name: 'tenant_name',
      label: 'Tenant Name',
      value: 'Acme Software, Inc.',
    },
    {
      field_name: 'landlord_name',
      label: 'Landlord Name',
      value: 'Capitol Tower Partners, LLC',
    },
    {
      field_name: 'premises_address',
      label: 'Premises Address',
      value: '200 Congress Ave, Suite 1400, Austin, TX 78701',
    },
    {
      field_name: 'lease_commencement_date',
      label: 'Lease Commencement Date',
      value: '2025-07-01',
    },
    {
      field_name: 'lease_expiration_date',
      label: 'Lease Expiration Date',
      value: '2030-06-30',
    },
    {
      field_name: 'base_rent_monthly',
      label: 'Base Rent (Monthly)',
      value: '$14,583.33',
    },
    {
      field_name: 'rentable_square_footage',
      label: 'Rentable Square Footage',
      value: '5,000 RSF',
    },
    {
      field_name: 'rent_escalation',
      label: 'Rent Escalation',
      value: '3% annually on each anniversary',
    },
    {
      field_name: 'security_deposit',
      label: 'Security Deposit',
      value: '$29,166.66 (2 months base rent)',
    },
    {
      field_name: 'cam_charges',
      label: 'CAM Charges',
      value: '$8.50/RSF annually, NNN',
    },
  ],
}
