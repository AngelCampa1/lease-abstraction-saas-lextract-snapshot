import { ImageResponse } from 'next/og'
import { BRAND_ASSETS, getAbsoluteBrandAssetUrl } from '@/lib/brand'

export const runtime = 'edge'

export const size = { width: 1200, height: 630 }

export const contentType = 'image/png'

export default function GET(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          backgroundColor: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '8px',
            height: '630px',
            backgroundColor: '#0D9488',
          }}
        />

        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '1200px',
            height: '630px',
            paddingLeft: '64px',
            paddingRight: '64px',
            paddingTop: '56px',
            paddingBottom: '0px',
          }}
        >
          {/* Top: brand logo */}
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse renders via Satori, which only supports a raw <img>, not next/image. */}
          <img
            src={getAbsoluteBrandAssetUrl(BRAND_ASSETS.logoPng)}
            alt="Lextract"
            width="190"
            height="49"
            style={{ objectFit: 'contain' }}
          />

          {/* Center: page title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: '700',
                color: '#0F172A',
                lineHeight: '1.15',
                maxWidth: '900px',
                wordWrap: 'break-word',
              }}
            >
              AI-Powered Commercial Lease Abstraction
            </div>
            <div
              style={{
                fontSize: '22px',
                color: '#475569',
                fontWeight: '400',
              }}
            >
              Upload a lease PDF. Get 126 structured fields in minutes.
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '1200px',
              marginLeft: '-64px',
              paddingLeft: '64px',
              paddingRight: '64px',
              height: '64px',
              backgroundColor: '#F8FAFC',
              marginTop: 'auto',
            }}
          >
            <span
              style={{
                fontSize: '16px',
                color: '#64748B',
                fontWeight: '400',
              }}
            >
              lextract.io · AI Lease Abstraction
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
