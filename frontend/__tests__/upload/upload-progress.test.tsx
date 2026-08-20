import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UploadProgress } from '@/components/upload/upload-progress'

describe('UploadProgress', () => {
  it('renders file name', () => {
    render(<UploadProgress fileName="lease-agreement.pdf" progress={45} />)
    expect(screen.getByTestId('upload-file-name')).toHaveTextContent('lease-agreement.pdf')
  })

  it('renders percentage', () => {
    render(<UploadProgress fileName="test.pdf" progress={72} />)
    expect(screen.getByTestId('upload-percentage')).toHaveTextContent('72%')
  })

  it('clamps progress to 0-100 range', () => {
    const { rerender } = render(<UploadProgress fileName="test.pdf" progress={-5} />)
    expect(screen.getByTestId('upload-percentage')).toHaveTextContent('0%')

    rerender(<UploadProgress fileName="test.pdf" progress={150} />)
    expect(screen.getByTestId('upload-percentage')).toHaveTextContent('100%')
  })

  it('renders progress bar element', () => {
    render(<UploadProgress fileName="test.pdf" progress={50} />)
    expect(screen.getByTestId('upload-progress-bar')).toBeInTheDocument()
  })

  it('renders wrapper with data-testid', () => {
    render(<UploadProgress fileName="test.pdf" progress={0} />)
    expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
  })
})
