import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { ExitPopup } from '@/components/marketing/exit-popup'
import { AiSdrWidget } from '@/components/ai-sdr/ai-sdr-widget'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <MarketingHeader />
      <main className="marketing-content">{children}</main>
      <MarketingFooter />
      <ExitPopup />
      <AiSdrWidget />
    </>
  )
}
