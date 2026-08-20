import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Dropzone } from '@/components/upload/dropzone'

function createFile(name: string, size: number, type: string): File {
  const content = new ArrayBuffer(size)
  return new File([content], name, { type })
}

describe('Dropzone', () => {
  it('renders the dropzone area', () => {
    render(<Dropzone onFileAccepted={vi.fn()} />)
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    expect(screen.getByText(/drag and drop your lease pdf/i)).toBeInTheDocument()
  })

  it('renders file input', () => {
    render(<Dropzone onFileAccepted={vi.fn()} />)
    expect(screen.getByTestId('dropzone-input')).toBeInTheDocument()
  })

  it('calls onFileAccepted when a valid PDF is dropped', async () => {
    const onFileAccepted = vi.fn()
    render(<Dropzone onFileAccepted={onFileAccepted} />)

    const file = createFile('lease.pdf', 1024, 'application/pdf')
    const input = screen.getByTestId('dropzone-input')

    fireEvent.drop(input, {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(onFileAccepted).toHaveBeenCalledWith(file)
    })
  })

  it('shows error message for non-PDF file', async () => {
    const onFileAccepted = vi.fn()
    render(<Dropzone onFileAccepted={onFileAccepted} />)

    const file = createFile('doc.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const input = screen.getByTestId('dropzone-input')

    fireEvent.drop(input, {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getByTestId('file-validation-error')).toHaveTextContent('Only PDF files are accepted.')
    })
    expect(onFileAccepted).not.toHaveBeenCalled()
  })

  it('shows error message for oversized file', async () => {
    const onFileAccepted = vi.fn()
    render(<Dropzone onFileAccepted={onFileAccepted} />)

    const file = createFile('big.pdf', 51 * 1024 * 1024, 'application/pdf')
    const input = screen.getByTestId('dropzone-input')

    fireEvent.drop(input, {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getByTestId('file-validation-error')).toHaveTextContent('File exceeds the 50 MB limit.')
    })
    expect(onFileAccepted).not.toHaveBeenCalled()
  })

  it('shows size limit text', () => {
    render(<Dropzone onFileAccepted={vi.fn()} />)
    expect(screen.getByText(/pdf files up to 50 mb/i)).toBeInTheDocument()
  })

  it('applies disabled styles when disabled', () => {
    render(<Dropzone onFileAccepted={vi.fn()} disabled />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.className).toContain('opacity-60')
  })
})
