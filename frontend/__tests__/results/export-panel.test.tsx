import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FormatPicker } from '@/components/results/format-picker'
import { TemplateSelector } from '@/components/results/template-selector'
import { ExportPanel } from '@/components/results/export-panel'
import type { ExportFormat } from '@/hooks/use-export'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-file-text" className={className as string} {...props} />
  ),
  FileSpreadsheet: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-file-spreadsheet" className={className as string} {...props} />
  ),
  File: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-file" className={className as string} {...props} />
  ),
  Download: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-download" className={className as string} {...props} />
  ),
  Loader2: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-loader" className={className as string} {...props} />
  ),
  AlertCircle: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-alert-circle" className={className as string} {...props} />
  ),
  Check: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-check" className={className as string} {...props} />
  ),
}))

// Mock api
const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiDownloadBlob = vi.fn()
vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiDownloadBlob: (...args: unknown[]) => mockApiDownloadBlob(...args),
}))

function mockDownloadAnchor() {
  const clickSpy = vi.fn()
  const appendSpy = vi.spyOn(document.body, 'appendChild')
  const removeSpy = vi.spyOn(document.body, 'removeChild')
  const originalCreateElement = document.createElement.bind(document)
  const createElementSpy = vi.spyOn(document, 'createElement')
  const anchor = document.createElement('a')
  anchor.click = clickSpy
  createElementSpy.mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    if (tagName === 'a') {
      return anchor
    }
    return originalCreateElement(tagName, options)
  })

  return {
    anchor,
    clickSpy,
    appendSpy,
    removeSpy,
    restore: () => {
      appendSpy.mockRestore()
      removeSpy.mockRestore()
      createElementSpy.mockRestore()
    },
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  mockApiGet.mockReset()
  mockApiPost.mockReset()
  mockApiDownloadBlob.mockReset()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:export-download'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// ============================================================
// FormatPicker tests
// ============================================================

describe('FormatPicker', () => {
  it('renders 3 format options', () => {
    const onChange = vi.fn()
    render(<FormatPicker value="docx" onChange={onChange} />)
    expect(screen.getByTestId('format-option-docx')).toBeInTheDocument()
    expect(screen.getByTestId('format-option-pdf')).toBeInTheDocument()
    expect(screen.getByTestId('format-option-xlsx')).toBeInTheDocument()
  })

  it('highlights the selected format', () => {
    const onChange = vi.fn()
    render(<FormatPicker value="pdf" onChange={onChange} />)
    const pdfOption = screen.getByTestId('format-option-pdf')
    expect(pdfOption.getAttribute('data-selected')).toBe('true')
    const docxOption = screen.getByTestId('format-option-docx')
    expect(docxOption.getAttribute('data-selected')).toBe('false')
  })

  it('calls onChange when a different format is clicked', () => {
    const onChange = vi.fn()
    render(<FormatPicker value="docx" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('format-option-xlsx'))
    expect(onChange).toHaveBeenCalledWith('xlsx')
  })

  it('shows labels and descriptions for each format', () => {
    const onChange = vi.fn()
    render(<FormatPicker value="docx" onChange={onChange} />)
    expect(screen.getByText('Word')).toBeInTheDocument()
    expect(screen.getByText('.docx document')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('.pdf report')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    expect(screen.getByText('.xlsx spreadsheet')).toBeInTheDocument()
  })

  it('defaults to docx being selected', () => {
    const onChange = vi.fn()
    render(<FormatPicker value="docx" onChange={onChange} />)
    expect(screen.getByTestId('format-option-docx').getAttribute('data-selected')).toBe('true')
  })

  it('wraps format controls and keeps each option at least 44px tall', () => {
    const onChange = vi.fn()
    render(<FormatPicker value="docx" onChange={onChange} />)

    expect(screen.getByTestId('format-picker')).toHaveClass('flex-wrap')
    expect(screen.getByTestId('format-option-docx')).toHaveClass('min-h-11')
  })
})

// ============================================================
// TemplateSelector tests
// ============================================================

describe('TemplateSelector', () => {
  it('renders 4 template options', () => {
    const onChange = vi.fn()
    render(<TemplateSelector value="commercial" onChange={onChange} />)
    expect(screen.getByTestId('template-option-commercial')).toBeInTheDocument()
    expect(screen.getByTestId('template-option-office')).toBeInTheDocument()
    expect(screen.getByTestId('template-option-industrial')).toBeInTheDocument()
    expect(screen.getByTestId('template-option-retail')).toBeInTheDocument()
  })

  it('highlights the selected template', () => {
    const onChange = vi.fn()
    render(<TemplateSelector value="office" onChange={onChange} />)
    expect(
      screen.getByTestId('template-option-office').getAttribute('data-selected')
    ).toBe('true')
    expect(
      screen.getByTestId('template-option-commercial').getAttribute('data-selected')
    ).toBe('false')
  })

  it('calls onChange when a different template is clicked', () => {
    const onChange = vi.fn()
    render(<TemplateSelector value="commercial" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('template-option-retail'))
    expect(onChange).toHaveBeenCalledWith('retail')
  })

  it('shows labels for each template', () => {
    const onChange = vi.fn()
    render(<TemplateSelector value="commercial" onChange={onChange} />)
    expect(screen.getByText('Commercial')).toBeInTheDocument()
    expect(screen.getByText('Office')).toBeInTheDocument()
    expect(screen.getByText('Industrial')).toBeInTheDocument()
    expect(screen.getByText('Retail')).toBeInTheDocument()
  })

  it('wraps template controls and keeps each option at least 40px tall', () => {
    const onChange = vi.fn()
    render(<TemplateSelector value="commercial" onChange={onChange} />)

    expect(screen.getByTestId('template-selector')).toHaveClass('flex-wrap')
    expect(screen.getByTestId('template-option-commercial')).toHaveClass('min-h-10')
  })
})

// ============================================================
// ExportPanel tests
// ============================================================

describe('ExportPanel', () => {
  it('renders format picker, template selector, and download button', () => {
    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('export-panel')).toBeInTheDocument()
    expect(screen.getByTestId('format-option-docx')).toBeInTheDocument()
    expect(screen.getByTestId('template-option-commercial')).toBeInTheDocument()
    expect(screen.getByTestId('download-button')).toBeInTheDocument()
  })

  it('renders Export Report title', () => {
    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByText('Export Report')).toBeInTheDocument()
  })

  it('calls mutation with correct format and template on download click', async () => {
    mockApiPost.mockResolvedValue({ url: 'https://downloads.lextract.io/file.docx', format: 'docx' })
    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/extractions/ext-123/export/docx',
        { template: 'commercial' }
      )
    })
  })

  it('sends correct params when format and template are changed', async () => {
    mockApiPost.mockResolvedValue({ url: 'https://downloads.lextract.io/file.xlsx', format: 'xlsx' })
    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByTestId('format-option-xlsx'))
    fireEvent.click(screen.getByTestId('template-option-retail'))
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/extractions/ext-123/export/xlsx',
        { template: 'retail' }
      )
    })
  })

  it('shows loading state during mutation', async () => {
    let resolveApi: (value: unknown) => void
    mockApiPost.mockReturnValue(
      new Promise((resolve) => {
        resolveApi = resolve
      })
    )

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('download-button')).toBeDisabled()
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })

    // Resolve to clean up
    resolveApi!({ url: 'https://example.com/file.docx', format: 'docx' })
  })

  it('shows error message when mutation fails', async () => {
    mockApiPost.mockRejectedValue(new Error('Export failed'))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
      expect(screen.getByText('Export failed')).toBeInTheDocument()
    })
  })

  it('shows generic error message for non-Error failures', async () => {
    mockApiPost.mockRejectedValue('something went wrong')

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to export. Please try again.')).toBeInTheDocument()
    })
  })

  it('shows retry button on error that retries the export', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('Export failed'))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })

    mockApiPost.mockResolvedValueOnce({ url: 'https://example.com/file.docx', format: 'docx' })
    fireEvent.click(screen.getByTestId('retry-button'))

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(2)
    })
  })

  it('uses button semantics and shared error status colors for retry errors', async () => {
    mockApiPost.mockRejectedValue(new Error('Export failed'))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toHaveClass('border-red-200')
      expect(screen.getByTestId('export-error')).toHaveClass('bg-red-100')
      expect(
        screen.getByRole('button', { name: 'Try export again' }),
      ).toBe(screen.getByTestId('retry-button'))
    })
  })

  it('downloads cached exports without opening a new tab', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { anchor, clickSpy, appendSpy, removeSpy, restore } = mockDownloadAnchor()
    mockApiDownloadBlob.mockResolvedValue(new Blob(['docx-bytes']))
    mockApiPost.mockResolvedValue({ url: 'https://downloads.lextract.io/file.docx', format: 'docx' })

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(mockApiDownloadBlob).toHaveBeenCalledWith(
        '/extractions/ext-123/export/docx/download?template=commercial',
      )
      expect(anchor.download).toBe('lease-abstraction-report.docx')
      expect(anchor.href).toBe('blob:export-download')
      expect(clickSpy).toHaveBeenCalled()
      expect(openSpy).not.toHaveBeenCalled()
      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
      expect(screen.getByTestId('export-success')).toBeInTheDocument()
    })

    expect(appendSpy).toHaveBeenCalledWith(anchor)
    expect(removeSpy).toHaveBeenCalledWith(anchor)
    vi.runOnlyPendingTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export-download')

    openSpy.mockRestore()
    restore()
  })

  it('forwards the version token to the cached-export download URL', async () => {
    const { restore } = mockDownloadAnchor()
    mockApiDownloadBlob.mockResolvedValue(new Blob(['docx-bytes']))
    mockApiPost.mockResolvedValue({
      url: 'https://downloads.lextract.io/file.docx',
      format: 'docx',
      version: 'v20260101000000',
    })

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(mockApiDownloadBlob).toHaveBeenCalledWith(
        '/extractions/ext-123/export/docx/download?template=commercial&version=v20260101000000',
      )
    })

    restore()
  })

  it('forwards the task-reported version token to the async-export download URL', async () => {
    const { restore } = mockDownloadAnchor()
    mockApiDownloadBlob.mockResolvedValue(new Blob(['pdf-bytes']))
    mockApiPost.mockResolvedValue({ task_id: 'task-ver', status: 'generating' })
    mockApiGet.mockResolvedValue({
      task_id: 'task-ver',
      status: 'complete',
      url: 'https://downloads.lextract.io/file.pdf',
      version: 'v20260215103000',
    })

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('format-option-pdf'))
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(mockApiDownloadBlob).toHaveBeenCalledWith(
        '/extractions/ext-123/export/pdf/download?template=commercial&version=v20260215103000',
      )
    })

    restore()
  })

  it('shows an error when the cached-export blob download fails', async () => {
    const { restore } = mockDownloadAnchor()
    mockApiPost.mockResolvedValue({ url: 'https://downloads.lextract.io/file.docx', format: 'docx' })
    mockApiDownloadBlob.mockRejectedValue(new Error('proxy unavailable'))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to download export. Please try again.')).toBeInTheDocument()
    })

    restore()
  })

  it('shows a generic error when the cached-export download rejects with a non-Error', async () => {
    const { restore } = mockDownloadAnchor()
    mockApiPost.mockResolvedValue({ url: 'https://downloads.lextract.io/file.docx', format: 'docx' })
    mockApiDownloadBlob.mockRejectedValue('boom')

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
    })

    restore()
  })

  it('shows an error when the completed async-export blob download fails', async () => {
    const { restore } = mockDownloadAnchor()
    mockApiPost.mockResolvedValue({ task_id: 'task-dl-fail', status: 'generating' })
    mockApiGet.mockResolvedValue({
      task_id: 'task-dl-fail',
      status: 'complete',
      url: 'https://downloads.lextract.io/file.pdf',
    })
    mockApiDownloadBlob.mockRejectedValue(new Error('proxy down'))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('format-option-pdf'))
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to download export. Please try again.')).toBeInTheDocument()
      expect(screen.getByTestId('download-button')).not.toBeDisabled()
    })

    restore()
  })

  it('shows a generic error when the async-export download rejects with a non-Error', async () => {
    const { restore } = mockDownloadAnchor()
    mockApiPost.mockResolvedValue({ task_id: 'task-dl-fail2', status: 'generating' })
    mockApiGet.mockResolvedValue({
      task_id: 'task-dl-fail2',
      status: 'complete',
      url: 'https://downloads.lextract.io/file.pdf',
    })
    mockApiDownloadBlob.mockRejectedValue('kaboom')

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('format-option-pdf'))
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
    })

    restore()
  })

  it('downloads completed async exports with the originally requested format', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { anchor, clickSpy, restore } = mockDownloadAnchor()
    mockApiPost.mockResolvedValue({ task_id: 'task-456', status: 'generating' })
    mockApiGet.mockResolvedValue({
      task_id: 'task-456',
      status: 'complete',
      url: 'https://downloads.lextract.io/file.pdf',
    })
    mockApiDownloadBlob.mockResolvedValue(new Blob(['pdf-bytes']))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('format-option-pdf'))
    fireEvent.click(screen.getByTestId('download-button'))
    fireEvent.click(screen.getByTestId('format-option-xlsx'))

    await waitFor(() => {
      expect(mockApiDownloadBlob).toHaveBeenCalledWith(
        '/extractions/ext-123/export/pdf/download?template=commercial',
      )
      expect(anchor.download).toBe('lease-abstraction-report.pdf')
      expect(clickSpy).toHaveBeenCalled()
      expect(openSpy).not.toHaveBeenCalled()
      expect(screen.getByTestId('export-success')).toBeInTheDocument()
    })

    openSpy.mockRestore()
    restore()
  })

  it('handles async task response', async () => {
    mockApiPost.mockResolvedValue({ task_id: 'task-456', status: 'generating' })
    mockApiGet.mockResolvedValue({ task_id: 'task-456', status: 'generating' })

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-generating')).toBeInTheDocument()
    })
  })

  it('clears pending state and re-enables download when async export task fails', async () => {
    mockApiPost.mockResolvedValue({ task_id: 'task-failed', status: 'generating' })
    mockApiGet.mockResolvedValue({ task_id: 'task-failed', status: 'failed' })

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
      expect(screen.queryByTestId('export-generating')).not.toBeInTheDocument()
      expect(screen.getByTestId('download-button')).not.toBeDisabled()
    })
  })

  it('surfaces an error and re-enables download when the status poll request fails', async () => {
    mockApiPost.mockResolvedValue({ task_id: 'task-poll-error', status: 'generating' })
    mockApiGet.mockRejectedValue(new Error('network down'))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
      expect(screen.queryByTestId('export-generating')).not.toBeInTheDocument()
      expect(screen.getByTestId('download-button')).not.toBeDisabled()
    })
  })

  it('clears the failed task before starting a retry', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    mockApiPost
      .mockResolvedValueOnce({ task_id: 'task-failed', status: 'generating' })
      .mockResolvedValueOnce({ task_id: 'task-retry', status: 'generating' })
    mockApiGet
      .mockResolvedValueOnce({ task_id: 'task-failed', status: 'failed' })
      .mockResolvedValueOnce({ task_id: 'task-retry', status: 'generating' })

    render(<ExportPanel extractionId="ext-123" />, { wrapper: Wrapper })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
    })

    mockApiGet.mockClear()
    await queryClient.invalidateQueries({ queryKey: ['export-task', 'task-failed'] })
    expect(mockApiGet).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('retry-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('export-error')).not.toBeInTheDocument()
      expect(screen.getByTestId('export-generating')).toHaveTextContent('DOCX')
    })
  })

  it('does not reuse a cached failed status when retry returns the same task id', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    mockApiPost
      .mockResolvedValueOnce({ task_id: 'task-same', status: 'generating' })
      .mockResolvedValueOnce({ task_id: 'task-same', status: 'generating' })
    mockApiGet
      .mockResolvedValueOnce({ task_id: 'task-same', status: 'failed' })
      .mockImplementationOnce(() => new Promise(() => undefined))

    render(<ExportPanel extractionId="ext-123" />, { wrapper: Wrapper })
    fireEvent.click(screen.getByTestId('download-button'))

    await waitFor(() => {
      expect(screen.getByTestId('export-error')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('retry-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('export-error')).not.toBeInTheDocument()
      expect(screen.getByTestId('export-generating')).toBeInTheDocument()
    })
    await new Promise((resolve) => window.setTimeout(resolve, 10))
    expect(screen.queryByTestId('export-error')).not.toBeInTheDocument()
    expect(screen.getByTestId('export-generating')).toBeInTheDocument()
  })
})

// ============================================================
// useExport hook tests
// ============================================================

describe('useExport', () => {
  it('calls correct API endpoint with format and template', async () => {
    // We already tested this via ExportPanel, but let's also ensure
    // direct import works
    const { useExport } = await import('@/hooks/use-export')

    mockApiPost.mockResolvedValue({ url: 'https://example.com/file.pdf', format: 'pdf' })

    function TestComponent() {
      const mutation = useExport({ extractionId: 'ext-789' })
      return (
        <button
          data-testid="trigger"
          onClick={() => mutation.mutate({ format: 'pdf' as ExportFormat, template: 'office' })}
        >
          Export
        </button>
      )
    }

    render(<TestComponent />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('trigger'))

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/extractions/ext-789/export/pdf',
        { template: 'office' }
      )
    })
  })
})
