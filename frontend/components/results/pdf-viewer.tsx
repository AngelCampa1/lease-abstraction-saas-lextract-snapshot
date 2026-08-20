'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { PdfToolbar } from '@/components/results/pdf-toolbar'
import { usePdfSearch } from '@/hooks/use-pdf-search'
import { Loader2 } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string | null
  highlightText?: string | null
  onPageChange?: (page: number) => void
}

function PdfUnavailable() {
  return (
    <div
      data-testid="pdf-viewer-unavailable"
      role="status"
      className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center"
    >
      <p className="text-sm font-medium text-foreground">PDF unavailable</p>
      <p className="text-sm text-muted-foreground">
        The file may have been removed or is no longer accessible.
      </p>
    </div>
  )
}

const noopPageChange = (_page: number): void => undefined

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightTextLayerItem(text: string, searchText: string | null): string {
  const normalizedSearch = searchText?.trim()
  if (!normalizedSearch) {
    return escapeHtml(text)
  }

  const pattern = new RegExp(escapeRegExp(normalizedSearch), 'gi')
  let result = ''
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const matchText = match[0]
    const matchIndex = match.index
    result += escapeHtml(text.slice(lastIndex, matchIndex))
    result += `<mark class="bg-amber-200 text-foreground rounded-sm px-0.5">${escapeHtml(matchText)}</mark>`
    lastIndex = matchIndex + matchText.length
  }

  if (lastIndex === 0) {
    return escapeHtml(text)
  }

  result += escapeHtml(text.slice(lastIndex))
  return result
}

export function PdfViewer({
  url,
  highlightText,
  onPageChange = noopPageChange,
}: PdfViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track which search page we've already navigated to using a ref, so we only
  // navigate once per new search result without triggering extra renders.
  const appliedSearchPageRef = useRef<number | null>(null)

  const { pageNumber: searchPageNumber } = usePdfSearch(
    pdfDocument,
    highlightText ?? null,
  )
  const renderHighlightedText = useCallback(
    ({ str }: { str: string }) => highlightTextLayerItem(str, highlightText ?? null),
    [highlightText],
  )

  // Navigate to the found page when search returns a result.
  // State update is deferred via setTimeout so it does not run synchronously
  // within the effect body, satisfying the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (searchPageNumber !== null && searchPageNumber !== appliedSearchPageRef.current) {
      appliedSearchPageRef.current = searchPageNumber
      const id = setTimeout(() => {
        setCurrentPage(searchPageNumber)
        onPageChange(searchPageNumber)
      }, 0)
      return () => clearTimeout(id)
    }
  }, [searchPageNumber, onPageChange])

  const handleDocumentLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      setTotalPages(pdf.numPages)
      setPdfDocument(pdf)
      setIsLoading(false)
      setHasError(false)
    },
    [],
  )

  const handleDocumentLoadError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
  }, [])

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      onPageChange(page)
    },
    [onPageChange],
  )

  const handleFitToWidth = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      // Standard PDF page width is ~612pt (US Letter)
      const fittedScale = containerWidth / 612
      setScale(Math.min(2.0, Math.max(0.5, fittedScale)))
    }
  }, [])

  if (!url) {
    return <PdfUnavailable />
  }

  if (hasError) {
    return <PdfUnavailable />
  }

  return (
    <div
      data-testid="pdf-viewer"
      ref={containerRef}
      className="flex h-full flex-col overflow-hidden"
    >
      {!isLoading && totalPages > 0 && (
        <PdfToolbar
          currentPage={currentPage}
          totalPages={totalPages}
          scale={scale}
          onPageChange={handlePageChange}
          onScaleChange={setScale}
          onFitToWidth={handleFitToWidth}
        />
      )}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div
            data-testid="pdf-viewer-loading"
            className="flex h-full items-center justify-center p-8"
          >
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={null}
        >
          {totalPages > 0 && (
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              customTextRenderer={renderHighlightedText}
            />
          )}
        </Document>
      </div>
    </div>
  )
}
