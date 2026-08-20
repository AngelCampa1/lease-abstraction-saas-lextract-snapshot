'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface PdfSearchResult {
  pageNumber: number | null
  isSearching: boolean
}

/**
 * Hook that searches the text layer of a PDF document for a given text string.
 * Returns the page number where the text was found, or null if not found.
 * Results are cached in state (Map keyed by search text to page number).
 */
export function usePdfSearch(
  pdfDocument: PDFDocumentProxy | null,
  searchText: string | null,
): PdfSearchResult {
  const [searchResults, setSearchResults] = useState<Map<string, number>>(
    () => new Map(),
  )
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const normalizedSearch = useMemo(
    () => (searchText ? searchText.trim().toLowerCase() : null),
    [searchText],
  )

  // Determine cached value from state (safe during render)
  const cachedPage = normalizedSearch
    ? searchResults.get(normalizedSearch)
    : undefined

  const shouldSearch =
    pdfDocument !== null &&
    normalizedSearch !== null &&
    cachedPage === undefined

  const performSearch = useCallback(
    async (doc: PDFDocumentProxy, search: string): Promise<number | null> => {
      const numPages = doc.numPages

      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item) => {
            if ('str' in item) {
              // Safe: TextItem has 'str' property, narrowed by 'str' in item check
              return (item as { str: string }).str
            }
            return ''
          })
          .join(' ')
          .toLowerCase()

        if (pageText.includes(search)) {
          return i
        }
      }

      return null
    },
    [],
  )

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!shouldSearch || !pdfDocument || !normalizedSearch) {
      return
    }

    let cancelled = false

    debounceRef.current = setTimeout(() => {
      setIsSearching(true)

      performSearch(pdfDocument, normalizedSearch)
        .then((foundPage) => {
          if (!cancelled) {
            if (foundPage !== null) {
              setSearchResults((prev) => {
                const next = new Map(prev)
                next.set(normalizedSearch, foundPage)
                return next
              })
            }
            setIsSearching(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsSearching(false)
          }
        })
    }, 300)

    return () => {
      cancelled = true
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [shouldSearch, pdfDocument, normalizedSearch, performSearch])

  const pageNumber = cachedPage ?? null

  return { pageNumber, isSearching }
}
