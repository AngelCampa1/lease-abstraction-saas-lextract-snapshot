import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { PROCESSING_TIME } from '@/lib/pricing'
import { PRODUCT_FIELD_COUNT } from '@/lib/product-facts'

const uploadDescription =
  `Upload any commercial lease PDF. AI reads every clause and returns ${PRODUCT_FIELD_COUNT} structured fields with confidence scores and red flag detection in ${PROCESSING_TIME.comparison}.`

export const metadata: Metadata = {
  title: `Upload a Lease - Extract ${PRODUCT_FIELD_COUNT} Fields in Minutes`,
  description: uploadDescription,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${SITE_URL}/upload`,
  },
  openGraph: {
    title: `Upload a Lease - Extract ${PRODUCT_FIELD_COUNT} Fields in Minutes`,
    description: uploadDescription,
    url: `${SITE_URL}/upload`,
    siteName: SITE_NAME,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
