import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { buildFAQPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { FaqSection } from '@/components/marketing/faq-section'

const EFFECTIVE_DATE = 'May 28, 2026'
const PRIVACY_EMAIL = 'angel.campa@lextract.io'

const FAQ_ITEMS = [
  {
    question: 'What does Lextract do with the lease documents I upload?',
    answer:
      'We store your uploaded PDF in private cloud object storage and send the document to our AI extraction provider (OpenRouter), which routes it to a downstream large-language-model provider to extract structured fields. We use the document and the extracted data to deliver your results and operate the service. We do not sell your documents.',
  },
  {
    question: 'Is my lease document sent to AI providers?',
    answer:
      'Yes. To extract data, the full PDF is transmitted to OpenRouter and, through OpenRouter, to a third-party model provider (such as Google or OpenAI). Each provider processes the document under its own terms and privacy policy. We do not currently have an independently verified contractual guarantee that these providers do not retain or train on submitted content - see the AI Processing section for the accurate position.',
  },
  {
    question: 'Can I delete my data?',
    answer:
      'Yes. You can delete individual extractions from your dashboard, which removes the stored document and related files from object storage and hides the record. To request deletion of your account and associated personal data, email ' +
      PRIVACY_EMAIL +
      '.',
  },
  {
    question: 'What rights do I have over my personal data?',
    answer:
      'Depending on where you live, you may have rights to access, correct, delete, port, or restrict the processing of your personal data, and to object to certain processing. California residents have additional rights under the CCPA/CPRA. To exercise any right, contact ' +
      PRIVACY_EMAIL +
      '.',
  },
]

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy policy for ${SITE_NAME}. How we collect, use, share, and protect your personal data and uploaded documents.`,
  alternates: { canonical: `${SITE_URL}/privacy` },
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <>
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <div className="mx-auto max-w-prose px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Privacy Policy
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Effective date: {EFFECTIVE_DATE}
        </p>

        <div className="prose prose-base prose-neutral dark:prose-invert sm:prose-lg">
          <p>
            This Privacy Policy explains how {SITE_NAME} collects, uses, shares,
            and protects personal data when you use our commercial lease
            abstraction service (the &ldquo;Service&rdquo;). Please read it
            alongside our Terms of Service.
          </p>

          <h2>1. Who we are and our role</h2>
          <p>
            The Service is operated by Ventora Labs, a Wyoming corporation
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), Sheridan,
            Wyoming. For personal data relating to your account and your use of
            the Service, we act as a <strong>data controller</strong>.
          </p>
          <p>
            When you upload a lease document, that document may contain personal
            data about third parties (for example, individuals named in a lease).
            In many cases you act as the controller of that document data and we
            act as your <strong>processor</strong>, processing it on your
            instructions to produce your extraction results. You are responsible
            for ensuring you have the authority and lawful basis to upload any
            document you submit.
          </p>
          <p>
            For data-protection questions, contact us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          </p>

          <h2>2. What we collect</h2>
          <h3>Account and contact data</h3>
          <ul>
            <li>
              Email address, and (if you provide them) your full name, company,
              and professional role (for example: tenant representative, broker,
              attorney, landlord, investor).
            </li>
            <li>
              Authentication data managed by our authentication provider (Neon
              Auth), including session credentials.
            </li>
            <li>
              Payment records - we store your Stripe customer identifier,
              payment type, amount, currency, and payment status. Card details
              are collected and processed directly by Stripe; we do not store
              full card numbers.
            </li>
            <li>Your credit balance and an immutable record of credit transactions.</li>
          </ul>
          <h3>Uploaded documents and extraction data</h3>
          <ul>
            <li>
              The lease PDF you upload (stored in private cloud object storage),
              its filename, and page count.
            </li>
            <li>
              The structured data extracted from the document (up to 126
              fields), per-field confidence scores, detected &ldquo;red
              flags&rdquo;, and any edits you make to extracted values (kept as
              an edit history).
            </li>
            <li>
              For diagnostic and audit purposes, raw responses from the AI models
              for each extraction pass may be stored in object storage.
            </li>
          </ul>
          <h3>Anonymous (upload-first) sessions</h3>
          <p>
            You can begin an extraction before creating an account using a
            temporary anonymous session, identified by a session token with a
            limited lifetime. If you later create an account, the session can be
            linked to it.
          </p>
          <h3>Marketing and lead data</h3>
          <p>
            If you download a resource or submit a form on our marketing site, we
            collect your email and any details you provide (such as name and
            company), the source of the lead, and related marketing events. This
            data is stored in our marketing data store (Cloudflare D1) and may be
            associated with an Apollo contact identifier for outreach.
          </p>
          <h3>Technical and analytics data</h3>
          <p>
            We may collect standard technical data (such as IP address and
            request metadata) for security, rate limiting, and error monitoring.
            If enabled, we use PostHog for product analytics and Sentry for error
            tracking.
          </p>

          <h2>3. How and why we use your data (GDPR legal bases)</h2>
          <p>
            Where the EU or UK GDPR applies, we rely on the following legal bases
            under Article 6(1):
          </p>
          <ul>
            <li>
              <strong>Performance of a contract</strong> (Art. 6(1)(b)) - to
              create and manage your account, process your uploads, run the
              extraction pipeline, deliver results and exports, and process
              payments and credits.
            </li>
            <li>
              <strong>Legitimate interests</strong> (Art. 6(1)(f)) - to secure
              and improve the Service, prevent abuse and fraud, monitor errors,
              and (where permitted) carry out limited product analytics and
              marketing. We balance these interests against your rights.
            </li>
            <li>
              <strong>Consent</strong> (Art. 6(1)(a)) - for optional analytics or
              marketing communications where consent is required. You may
              withdraw consent at any time.
            </li>
            <li>
              <strong>Legal obligation</strong> (Art. 6(1)(c)) - to keep records
              we are required to retain (for example, certain financial records).
            </li>
          </ul>

          <h2>4. AI processing transparency</h2>
          <p>
            Extraction is performed by large-language models. To produce your
            results, we transmit the <strong>full uploaded PDF</strong> to{' '}
            <strong>OpenRouter</strong>, which routes the request to one or more
            third-party model providers (for example, Google&rsquo;s Gemini
            models and OpenAI models) across multiple validation passes. Our
            configuration restricts routing to a defined set of inference
            providers.
          </p>
          <p>
            Each AI provider processes your document under its own terms and
            privacy policy. We do <strong>not</strong> use your documents or
            extraction results to train our own models. We do not currently have
            an independently verified contractual or technical guarantee that the
            downstream model providers do not retain or use submitted content for
            their own purposes (including training). Because uploaded documents
            may contain confidential or sensitive information, you should not
            upload material you are not authorized to disclose to third-party AI
            processors.
          </p>

          <h2>5. Sub-processors and third parties</h2>
          <p>
            We share data with the following service providers strictly to
            operate the Service. We do not sell your personal data.
          </p>
          <ul>
            <li><strong>Neon</strong> - managed PostgreSQL database and authentication (Neon Auth).</li>
            <li><strong>Cloudflare R2</strong> - object storage for uploaded documents, exports, and diagnostic artifacts.</li>
            <li><strong>Cloudflare (Workers / D1)</strong> - marketing data capture and storage.</li>
            <li><strong>OpenRouter</strong> - AI request routing for the extraction pipeline, and the downstream model providers it routes to (such as Google and OpenAI).</li>
            <li><strong>Stripe</strong> - payment processing.</li>
            <li><strong>Resend</strong> - transactional email (e.g. receipts, notifications), where enabled.</li>
            <li><strong>Sentry</strong> - error and performance monitoring, where enabled.</li>
            <li><strong>PostHog</strong> - product analytics, where enabled.</li>
            <li><strong>Apollo</strong> - marketing contact management for leads captured on our marketing site.</li>
          </ul>

          <h2>6. International data transfers</h2>
          <p>
            Some of our service providers are located in, or process data in, the
            United States and other countries outside the EEA and the UK. Where
            we transfer personal data internationally and the law requires it, we
            rely on appropriate safeguards such as the European Commission&rsquo;s
            Standard Contractual Clauses and the UK International Data Transfer
            Addendum, or another lawful transfer mechanism.
          </p>

          <h2>7. Data retention</h2>
          <p>
            We keep your uploaded documents, extraction results, and account data
            for as long as your account is active and as needed to provide the
            Service. You can delete individual extractions from your dashboard at
            any time, which removes the stored document and related files from
            object storage and hides the record. When you ask us to close your
            account, we will delete or de-identify your associated personal data,
            except where we are required to retain certain records (for example,
            financial records) to comply with legal obligations. Deletion of
            backups and copies held by sub-processors occurs in line with their
            own retention cycles.
          </p>

          <h2>8. Security</h2>
          <p>
            We use technical and organizational measures designed to protect your
            data. Uploaded documents are kept in private object storage that is
            not publicly listable and is accessed only through short-lived,
            signed URLs or an authenticated proxy. Access to extractions is
            scoped to the owning account or anonymous session, and database
            access is governed by row-level security policies. Data is
            transmitted over encrypted (HTTPS/TLS) connections. No method of
            transmission or storage is completely secure, and we cannot guarantee
            absolute security.
          </p>

          <h2>9. Your rights</h2>
          <h3>EEA / UK (GDPR)</h3>
          <p>
            Subject to applicable law, you have the right to access, rectify,
            erase, restrict, or object to the processing of your personal data;
            the right to data portability; and the right to withdraw consent
            where processing is based on consent. You also have the right to lodge
            a complaint with your local supervisory authority.
          </p>
          <h3>California (CCPA/CPRA)</h3>
          <p>
            If you are a California resident, you have the right to know what
            personal information we collect, use, and disclose; the right to
            request deletion and correction; and the right to opt out of the
            &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information.{' '}
            <strong>We do not sell your personal information</strong>, and we do
            not share it for cross-context behavioral advertising. We will not
            discriminate against you for exercising your rights.
          </p>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. We will
            verify your request as required by law before acting on it.
          </p>

          <h2>10. Children</h2>
          <p>
            The Service is intended for business use and is not directed to
            children. We do not knowingly collect personal data from anyone under
            16. If you believe a child has provided us personal data, contact us
            and we will delete it.
          </p>

          <h2>11. Cookies and analytics</h2>
          <p>
            We use cookies and similar technologies that are necessary for
            authentication and the secure operation of the Service. Where
            enabled, we also use product analytics (PostHog) and error monitoring
            (Sentry). You can control cookies through your browser settings.
          </p>

          <h2>12. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will revise
            the effective date above and, for material changes, take reasonable
            steps to notify you (for example, by email to registered users).
          </p>

          <h2>13. Contact</h2>
          <p>
            Questions or requests about this policy or your personal data? Email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>, or write to
            us at Ventora Labs, a Wyoming corporation, Sheridan, Wyoming.
          </p>
        </div>

        <FaqSection items={FAQ_ITEMS} />
      </div>
    </>
  )
}
