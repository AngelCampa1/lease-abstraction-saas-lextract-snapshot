import type { EmailsKnowledge } from './schema'

export const EMAILS_KNOWLEDGE: EmailsKnowledge = {
  senderIdentities: [
    {
      id: 'founder',
      from: 'Angel Campa <angel.campa@lextract.io>',
      purpose: 'Founder-led transactional and sales emails.',
    },
    {
      id: 'support',
      from: 'Angel Campa <angel.campa@lextract.io>',
      purpose: 'Support follow-up when a user asks for help.',
    },
  ],
  transactional: [
    {
      id: 'extraction-complete',
      subjectTemplate: 'Your lease extraction is ready - {document_name}',
      purpose: 'Notify a signed-in user when extraction results are ready.',
      plainTextSummary:
        'Includes document name, field count, confidence summary, results link, and notification preferences link.',
    },
    {
      id: 'cam-flags-found',
      subjectTemplate: '{flag_count} potential issues found in {document_name}',
      purpose: 'Notify a signed-in user when CAM-sensitive red flags were found.',
      plainTextSummary:
        'Lists detected red flags and routes the user to the CamAudit partner workflow.',
    },
    {
      id: 'guest-account-setup',
      subjectTemplate: 'Complete your Lextract account',
      purpose: 'Help a guest checkout user finish account setup after payment.',
      plainTextSummary: 'Includes results URL and account setup URL.',
    },
    {
      id: 'anonymous-notification',
      subjectTemplate: 'Your Lextract preview is ready',
      purpose: 'Notify anonymous upload users when a preview can be viewed.',
      plainTextSummary: 'Points anonymous users back to their preview and account creation path.',
      bodyTemplates: {
        htmlTemplate:
          'Your lease extraction for <strong>{document_name}</strong> is complete.',
        textTemplate: 'Your lease extraction for {document_name} is complete.',
      },
    },
    {
      id: 'lead-magnet-delivery',
      subjectTemplate: 'Your {magnet_name} is ready - download it here',
      purpose: 'Deliver requested lead magnets immediately after capture.',
      plainTextSummary: 'Includes direct download URL and unsubscribe link.',
      bodyTemplates: {
        htmlTemplate:
          'You can download it here: <a href="{download_url}">{download_url}</a>.',
      },
    },
  ],
  footer: {
    unsubscribe: 'Unsubscribe or manage email preferences from the footer link.',
    support: 'For help, contact angel.campa@lextract.io.',
  },
}
