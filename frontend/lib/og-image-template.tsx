import { ImageResponse } from 'next/og'
import { BRAND_ASSETS, getAbsoluteBrandAssetUrl } from '@/lib/brand'

const size = { width: 1200, height: 630 }

export function renderPseoOgImage(title: string, badge: string): ImageResponse {
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
          {/* Top row: brand name + badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse supports img, not next/image. */}
            <img
              src={getAbsoluteBrandAssetUrl(BRAND_ASSETS.logoPng)}
              alt="Lextract"
              width="190"
              height="49"
              style={{ objectFit: 'contain' }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '6px',
                paddingTop: '6px',
                paddingBottom: '6px',
                paddingLeft: '14px',
                paddingRight: '14px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#15803D',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {badge}
              </span>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: '700',
                color: '#0F172A',
                lineHeight: '1.15',
                maxWidth: '1000px',
                wordWrap: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
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
