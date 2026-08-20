import type { Metadata, Viewport } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import Script from 'next/script'
import { Providers } from '@/components/providers'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { BRAND_ASSETS } from '@/lib/brand'
import { PRICING, formatPrice } from '@/lib/pricing'
import { PRODUCT_FIELD_COUNT } from '@/lib/product-facts'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['700', '800'],
  preload: false,
})

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? ''

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lextract - AI-Powered Commercial Lease Abstraction',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    `Extract ${PRODUCT_FIELD_COUNT} structured fields from any commercial lease PDF in minutes. AI-powered lease abstraction with confidence scoring and red flag detection. ${formatPrice(PRICING.single.price)} per lease.`,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: BRAND_ASSETS.iconSvg, type: 'image/svg+xml' },
      { url: BRAND_ASSETS.favicon32Png, sizes: '32x32', type: 'image/png' },
      { url: BRAND_ASSETS.favicon16Png, sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: BRAND_ASSETS.appleIconPng, sizes: '180x180', type: 'image/png' }],
  },
  alternates: {
    languages: {
      en: SITE_URL,
      'x-default': SITE_URL,
    },
    types: {
      'application/rss+xml': `${SITE_URL}/feed.xml`,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to GA4/GTM origins - only when GA4 is active */}
        {GA4_ID ? (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.google-analytics.com" />
          </>
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: 'if(typeof globalThis.__name==="undefined"){globalThis.__name=function(fn){return fn};}' }} />
        {GA4_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
            </Script>
          </>
        ) : null}
      </head>
      <body className={`${inter.variable} ${bricolage.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
