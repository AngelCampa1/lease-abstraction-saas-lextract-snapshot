import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { buildFAQPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { FaqSection } from '@/components/marketing/faq-section'

const FAQ_ITEMS = [
  {
    question: 'Who owns the lease documents I upload?',
    answer:
      'You retain full ownership of the lease documents you upload and all extraction results derived from them. Lextract does not claim any rights to your documents. We do not use uploaded documents or their extracted data to train AI models or for any purpose beyond delivering your extraction results.',
  },
  {
    question: 'Am I allowed to upload leases on behalf of a client?',
    answer:
      'You may upload documents you own or have explicit authorization to process. If you are an attorney, property manager, or consultant uploading leases on behalf of a client, you are responsible for ensuring you have the necessary authorization to submit those documents to a third-party processing service.',
  },
  {
    question: 'What law governs disputes with Lextract?',
    answer:
      'These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes that cannot be resolved informally will be submitted to binding arbitration or the courts of Delaware, as specified in the full Terms of Service.',
  },
  {
    question: 'What is the limitation of liability?',
    answer:
      'To the maximum extent permitted by law, Lextract\'s total liability for any claim arising from use of the service is limited to the amount you paid in the 30 days preceding the claim. Lextract is not liable for indirect, incidental, or consequential damages. AI extraction results may contain errors and should be verified against the source document before use in legal or financial decisions.',
  },
  {
    question: 'Do I need to check the extraction results myself?',
    answer:
      'Yes. Lextract is an automated AI tool, and you are solely responsible for reviewing and verifying every extraction result against the original lease document before relying on it. AI extraction is not guaranteed to be accurate or complete and may contain errors, omissions, or misclassifications. Lextract is not liable for any errors in extraction results or for any decision you make in reliance on them.',
  },
  {
    question: 'How do I report a terms violation or legal concern?',
    answer:
      'For legal inquiries, terms violations, or intellectual property concerns, contact us at angel.campa@lextract.io. We respond to all legal notices within 5 business days.',
  },
]

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of service for ${SITE_NAME}. Understand your rights and responsibilities when using our lease abstraction platform.`,
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <>
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <div className="mx-auto max-w-prose px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Terms of Service</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Last updated: March 2026
        </p>

        <div className="prose prose-base prose-neutral dark:prose-invert sm:prose-lg">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By using {SITE_NAME} (&ldquo;the Service&rdquo;), you agree to these Terms of Service.
            If you do not agree, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            {SITE_NAME} is an AI-powered commercial lease abstraction service. You upload lease
            documents in PDF format and receive structured extraction results. Results are
            provided for informational purposes and should be reviewed by qualified professionals
            before being used for legal or financial decisions.
          </p>

          <h2>3. Account Responsibilities</h2>
          <p>
            You are responsible for maintaining the security of your account credentials and
            for all activity that occurs under your account. You must be at least 18 years old
            and authorized to upload any documents you submit.
          </p>

          <h2>4. Payments and Credits</h2>
          <p>
            Credits are purchased via Stripe. Credits never expire. Refunds are available within
            7 days of purchase if no extractions have been processed. Completed extractions are
            non-refundable.
          </p>

          <h2>5. Acceptable Use</h2>
          <p>
            You may only upload documents you own or have authorization to process. You may not
            use the Service for illegal purposes, to upload malware, or to attempt to circumvent
            our security measures.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            You retain ownership of documents you upload. We retain ownership of the Service,
            including our AI extraction models and software. Extraction results derived from your
            documents belong to you.
          </p>

          <h2>7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &ldquo;as is.&rdquo; AI extraction results may contain errors.
            We do not warrant that results are accurate, complete, or suitable for any particular
            purpose. Always verify extracted data against the original document.
          </p>
          <p>
            You are solely responsible for reviewing and verifying every extraction result against
            the original lease document before relying on it for any legal, financial, accounting,
            tax, or business decision. Extraction results are not a substitute for review by a
            qualified professional, and {SITE_NAME} does not provide legal, tax, or accounting advice.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, {SITE_NAME} shall not be liable for any
            indirect, incidental, or consequential damages arising from use of the Service.
            This includes, without limitation, any errors, omissions, or inaccuracies in
            extraction results and any loss or decision arising from your reliance on them. You
            assume full responsibility for verifying results before use. Our total liability is
            limited to the amount you paid in the 30 days preceding the claim.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We may update these Terms. Continued use of the Service after changes constitutes
            acceptance. We will notify registered users of material changes by email.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about these Terms? Email{' '}
            <a href="mailto:angel.campa@lextract.io">angel.campa@lextract.io</a>.
          </p>
        </div>

        <FaqSection items={FAQ_ITEMS} />
      </div>
    </>
  )
}
