import { describe, expect, it } from 'vitest'
import { Document, pdf } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import LeaseAbstractionChecklist from '@/content/lead-magnets/lease-abstraction-checklist'
import DueDiligenceChecklist from '@/content/lead-magnets/due-diligence-checklist'
import CamReconChecklist from '@/content/lead-magnets/cam-reconciliation-checklist'

type PdfDocumentElement = ReactElement<React.ComponentProps<typeof Document>>
type LeadMagnetComponent = () => PdfDocumentElement

function getDocumentAuthor(element: PdfDocumentElement): string | undefined {
  return element.props.author
}

async function expectLeadMagnetAuthor(Component: LeadMagnetComponent): Promise<void> {
  const document = Component()
  expect(getDocumentAuthor(document)).toBe('Angel Campa, Founder')
  const stream = await pdf(document).toBuffer()
  expect(stream).toBeDefined()
}

describe('lead magnet PDF author metadata', () => {
  it('uses Angel Campa as the lease abstraction checklist author', async () => {
    await expectLeadMagnetAuthor(LeaseAbstractionChecklist)
  })

  it('uses Angel Campa as the due diligence checklist author', async () => {
    await expectLeadMagnetAuthor(DueDiligenceChecklist)
  })

  it('uses Angel Campa as the CAM reconciliation checklist author', async () => {
    await expectLeadMagnetAuthor(CamReconChecklist)
  })
})
