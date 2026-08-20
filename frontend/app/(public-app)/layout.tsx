import { PublicAppShell } from '@/components/layout/public-app-shell'

export default function PublicAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PublicAppShell>{children}</PublicAppShell>
  )
}
