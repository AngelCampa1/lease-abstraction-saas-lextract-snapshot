'use client'

import { type ReactNode, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { FileText, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'

// PdfViewer uses pdfjs-dist which sets GlobalWorkerOptions at module-init time.
// That global assignment crashes during SSR (pdfjs assumes a browser environment),
// causing the results page to return HTTP 500. Lazy-loading with ssr:false prevents
// the module from being evaluated server-side.
const PdfViewer = dynamic(
  () => import('@/components/results/pdf-viewer').then((m) => ({ default: m.PdfViewer })),
  { ssr: false },
)

interface SplitResultsViewProps {
  showPdf: boolean
  pdfUrl: string | null
  /**
   * True when the document URL request failed or returned no URL (e.g. the
   * underlying file was removed). When set, the PDF panel renders an
   * "unavailable" message so the user is never staring at an empty pane.
   */
  pdfUnavailable?: boolean
  highlightText: string | null
  onTogglePdf: () => void
  children: ReactNode
}

function useIsMobile(): boolean {
  // Bug #54: Always initialize to false (desktop) to match the SSR-rendered
  // HTML. Reading window.innerWidth during initialization causes a hydration
  // mismatch because the server always renders with no window.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    // Run immediately to set the correct client-side value after hydration.
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}

export function SplitResultsView({
  showPdf,
  pdfUrl,
  pdfUnavailable = false,
  highlightText,
  onTogglePdf,
  children,
}: SplitResultsViewProps) {
  const isMobile = useIsMobile()

  const hasPdfUrl = pdfUrl !== null && pdfUrl.length > 0
  // Treat an unavailable PDF as worth rendering the panel for, so the user
  // sees a clear "PDF unavailable" state instead of nothing.
  const hasPdfSlot = hasPdfUrl || pdfUnavailable

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPdf && !isMobile) {
        e.preventDefault()
        onTogglePdf()
      }
    },
    [showPdf, isMobile, onTogglePdf],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  // Toggle button visible on desktop whenever a URL is available or we have
  // an explicit unavailable state to show the user.
  const toggleButton = hasPdfSlot && !isMobile ? (
    <Button
      variant="outline"
      size="sm"
      onClick={onTogglePdf}
      data-testid="pdf-toggle-button"
      className={`mb-0 ${INTERACTIVE_TARGET_CLASSES.compact}`}
    >
      <FileText className="mr-2 size-4" />
      {showPdf ? 'Hide PDF' : 'View PDF'}
    </Button>
  ) : null

  // Mobile: tab interface for switching between data and PDF
  if (isMobile && hasPdfSlot) {
    return (
      <div data-testid="split-results-view">
        <Tabs defaultValue="data" className="w-full">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="data" className="flex-1">
              <Table className="mr-1.5 size-4" />
              Extracted Data
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex-1">
              <FileText className="mr-1.5 size-4" />
              PDF View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="data">
            {children}
          </TabsContent>
          <TabsContent value="pdf">
            <div className="h-[50vh] md:h-[calc(100vh-10rem)]">
              <PdfViewer url={pdfUrl} highlightText={highlightText} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Desktop: no PDF or no URL → full width
  if (!showPdf || !hasPdfSlot) {
    return (
      <div data-testid="split-results-view">
        {toggleButton}
        {children}
      </div>
    )
  }

  // Desktop: split view
  return (
    <div data-testid="split-results-view">
      {toggleButton}
      <PanelGroup orientation="horizontal" data-testid="split-panel-group">
        <Panel defaultSize={60} minSize={30} data-testid="results-panel">
          {children}
        </Panel>
        <PanelResizeHandle
          className="w-1.5 bg-border hover:bg-primary/20 transition-colors"
          data-testid="resize-handle"
        />
        <Panel defaultSize={40} minSize={20} data-testid="pdf-panel">
          <div className="h-[50vh] md:h-[calc(100vh-8rem)] sticky top-20">
            <PdfViewer url={pdfUrl} highlightText={highlightText} />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
