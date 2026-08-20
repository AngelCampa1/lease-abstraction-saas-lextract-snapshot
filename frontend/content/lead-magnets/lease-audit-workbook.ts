import ExcelJS from 'exceljs'
import path from 'path'

const TEAL = '0D9488'
const WHITE = 'FFFFFF'
const LIGHT_GRAY = 'F8FAFC'
const BORDER_COLOR = 'E2E8F0'
const WORKBOOK_METADATA_DATE = new Date('2026-01-01T00:00:00.000Z')

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${TEAL}` },
    }
    cell.font = {
      bold: true,
      color: { argb: `FF${WHITE}` },
      size: 11,
      name: 'Calibri',
    }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    cell.border = {
      bottom: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
    }
  })
  row.height = 24
}

function applyDataRowStyle(row: ExcelJS.Row, rowIndex: number): void {
  const isEven = rowIndex % 2 === 0
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? `FF${LIGHT_GRAY}` : `FFFFFFFF` },
    }
    cell.font = { size: 10, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = {
      bottom: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
    }
  })
  row.height = 18
}

function addEmptyRows(sheet: ExcelJS.Worksheet, count: number, columnCount: number): void {
  for (let i = 1; i <= count; i++) {
    const row = sheet.addRow(Array(columnCount).fill('') as string[])
    applyDataRowStyle(row, i)
  }
}

export async function buildLeaseAuditWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const brandImageId = workbook.addImage({
    filename: path.join(process.cwd(), 'public', 'brand', 'lextract-logo.png'),
    extension: 'png',
  })

  workbook.creator = 'Lextract'
  workbook.lastModifiedBy = 'Lextract'
  workbook.created = WORKBOOK_METADATA_DATE
  workbook.modified = WORKBOOK_METADATA_DATE
  workbook.properties.date1904 = false

  // ─── Sheet 1: Property Summary ────────────────────────────────────────────
  {
    const sheet = workbook.addWorksheet('Property Summary', {
      properties: { tabColor: { argb: `FF${TEAL}` } },
    })

    const headers = [
      'Property Name',
      'Address',
      'City/State',
      'Property Type',
      'Total RSF',
      '# Tenants',
      'Occupancy %',
      'Annual Base Rent',
      'Annual CAM Estimate',
      'Notes',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: i === 9 ? 30 : i === 0 || i === 1 ? 28 : 18,
    }))

    applyHeaderStyle(sheet.getRow(1))
    addEmptyRows(sheet, 5, headers.length)
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Sheet 2: Rent Schedule ───────────────────────────────────────────────
  {
    const sheet = workbook.addWorksheet('Rent Schedule', {
      properties: { tabColor: { argb: `FF${TEAL}` } },
    })

    const headers = [
      'Tenant Name',
      'Suite',
      'Floor',
      'RSF',
      'Lease Start',
      'Lease End',
      'Months Remaining',
      'Current Rent/Mo',
      'Current Rent/SF/Yr',
      'Escalation Type',
      'Next Increase Date',
      'New Rent/Mo',
      'Notes',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width:
        i === 0
          ? 28
          : i === 9
            ? 20
            : i === 12
              ? 30
              : 16,
    }))

    applyHeaderStyle(sheet.getRow(1))
    addEmptyRows(sheet, 10, headers.length)
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Sheet 3: CAM Tracking ────────────────────────────────────────────────
  {
    const sheet = workbook.addWorksheet('CAM Tracking', {
      properties: { tabColor: { argb: `FF${TEAL}` } },
    })

    const headers = [
      'Tenant',
      'Suite',
      'RSF',
      'Pro-Rata Share %',
      'CAM Estimate/Mo',
      'Prior Year CAM Actual',
      'Prior Year Reconciliation (Over)/Under',
      'Current Year Accrual/Mo',
      'CAM Cap Type',
      'Cap %',
      'Notes',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width:
        i === 0
          ? 24
          : i === 6
            ? 36
            : i === 10
              ? 30
              : 20,
    }))

    applyHeaderStyle(sheet.getRow(1))
    addEmptyRows(sheet, 10, headers.length)
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Sheet 4: Options & Critical Dates ───────────────────────────────────
  {
    const sheet = workbook.addWorksheet('Options & Critical Dates', {
      properties: { tabColor: { argb: `FF${TEAL}` } },
    })

    const headers = [
      'Tenant',
      'Option Type',
      'Notice Deadline',
      'Exercise Window Start',
      'Exercise Window End',
      'Option Terms',
      'Market / Fixed',
      'Notes',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width:
        i === 0
          ? 24
          : i === 5
            ? 36
            : i === 7
              ? 30
              : 22,
    }))

    applyHeaderStyle(sheet.getRow(1))

    // Add validation for Option Type column (col index 1 = column B)
    sheet.getColumn(2).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber === 1) return
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Renewal,Expansion,Termination,ROFR,ROFO"'],
        showErrorMessage: true,
        errorTitle: 'Invalid option type',
        error: 'Please select: Renewal, Expansion, Termination, ROFR, or ROFO',
      }
    })

    addEmptyRows(sheet, 10, headers.length)
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Sheet 5: Red Flags ───────────────────────────────────────────────────
  {
    const sheet = workbook.addWorksheet('Red Flags', {
      properties: { tabColor: { argb: 'FFDC2626' } },
    })

    const headers = [
      'Tenant',
      'Clause Type',
      'Summary',
      'Potential Exposure ($)',
      'Priority (High/Med/Low)',
      'Status',
      'Assigned To',
      'Notes',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width:
        i === 0
          ? 24
          : i === 2
            ? 40
            : i === 7
              ? 30
              : 22,
    }))

    applyHeaderStyle(sheet.getRow(1))

    // Pre-populate 3 example rows
    const exampleRows: string[][] = [
      [
        'All Tenants',
        'Co-Tenancy Clause',
        'Anchor tenant (>50k SF) vacancy triggers rent reduction to % of gross sales; anchor lease expires in 14 months',
        '180,000',
        'High',
        'Open',
        '',
        'Review anchor lease status; assess re-leasing timeline',
      ],
      [
        'Tenant A',
        'Expiring Option',
        'Renewal option notice deadline in 90 days; tenant has not indicated intent; failure to exercise forfeits renewal right',
        '0',
        'High',
        'Open',
        '',
        'Send reminder to tenant; confirm notice procedures',
      ],
      [
        'Tenant B',
        'Below-Market Rent',
        'Tenant paying $18/SF vs. market $26/SF; lease expires in 8 months; no renewal option; rollover risk with significant mark-to-market gap',
        '96,000',
        'Medium',
        'Open',
        '',
        'Begin renewal negotiation or budget for TI on re-lease',
      ],
    ]

    exampleRows.forEach((rowData, idx) => {
      const row = sheet.addRow(rowData)
      applyDataRowStyle(row, idx + 1)

      // Color Priority cell
      const priorityCell = row.getCell(5)
      const priority = rowData[4]
      if (priority === 'High') {
        priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        priorityCell.font = { bold: true, color: { argb: 'FFDC2626' }, size: 10, name: 'Calibri' }
      } else if (priority === 'Medium') {
        priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
        priorityCell.font = { bold: true, color: { argb: 'FFD97706' }, size: 10, name: 'Calibri' }
      }
    })

    // Add Priority validation on the pre-populated rows and empty rows
    sheet.getColumn(5).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber === 1) return
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"High,Med,Low"'],
        showErrorMessage: true,
        errorTitle: 'Invalid priority',
        error: 'Please select: High, Med, or Low',
      }
    })

    // Add remaining empty rows
    addEmptyRows(sheet, 7, headers.length)
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Sheet 6: Audit Request Tracker ──────────────────────────────────────
  {
    const sheet = workbook.addWorksheet('Audit Request Tracker', {
      properties: { tabColor: { argb: `FF${TEAL}` } },
    })

    const headers = [
      'Document Requested',
      'Lease Clause / Authority',
      'Request Date',
      'Due Date',
      'Received Date',
      'Status',
      'Follow-Up Owner',
      'Notes',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: i === 0 || i === 1 ? 34 : i === 7 ? 36 : 18,
    }))

    applyHeaderStyle(sheet.getRow(1))
    const rows = [
      [
        'General ledger export by CAM account',
        'Audit rights / books and records access',
        '',
        '',
        '',
        'Requested',
        '',
        'Ask for Excel or CSV, not PDF summary.',
      ],
      [
        'Vendor invoices for line items over 10% of CAM',
        'Reasonable supporting documentation',
        '',
        '',
        '',
        'Requested',
        '',
        'Prioritize repairs, security, janitorial, landscaping, and snow removal.',
      ],
      [
        'Capital project amortization schedules',
        'Capital expenditure exclusion / amortization clause',
        '',
        '',
        '',
        'Pending',
        '',
        'Require useful life, interest rate, and in-service date.',
      ],
    ]

    rows.forEach((rowData, idx) => {
      const row = sheet.addRow(rowData)
      applyDataRowStyle(row, idx + 1)
    })
    addEmptyRows(sheet, 36, headers.length)

    sheet.getColumn(6).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber === 1) return
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Requested,Received,Pending,Disputed,Closed"'],
        showErrorMessage: true,
        errorTitle: 'Invalid status',
        error: 'Please select a tracker status.',
      }
    })
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Sheet 7: Cap Calculator ─────────────────────────────────────────────
  {
    const sheet = workbook.addWorksheet('Cap Calculator', {
      properties: { tabColor: { argb: `FF${TEAL}` } },
    })

    const headers = [
      'Audit Year',
      'Prior Allowed Controllable CAM',
      'Cap %',
      'Maximum Allowed CAM',
      'Actual Controllable CAM',
      'Over Cap Amount',
      'Tenant Pro-Rata Share %',
      'Tenant Overcharge',
      'Cap Type',
      'Notes',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: i === 9 ? 34 : 22,
    }))

    applyHeaderStyle(sheet.getRow(1))
    for (let i = 2; i <= 41; i++) {
      const row = sheet.getRow(i)
      row.values = [
        '',
        2020 + (i - 2),
        '',
        '',
        { formula: `B${i}*(1+C${i})` },
        '',
        { formula: `MAX(0,E${i}-D${i})` },
        '',
        { formula: `F${i}*G${i}` },
        '',
        '',
      ]
      applyDataRowStyle(row, i)
    }

    sheet.getColumn(9).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber === 1) return
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Cumulative,Non-Cumulative,None"'],
        showErrorMessage: true,
        errorTitle: 'Invalid cap type',
        error: 'Please select Cumulative, Non-Cumulative, or None.',
      }
    })
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Sheet 8: Dispute Summary ────────────────────────────────────────────
  {
    const sheet = workbook.addWorksheet('Dispute Summary', {
      properties: { tabColor: { argb: 'FFDC2626' } },
    })

    const headers = [
      'Finding #',
      'Issue Category',
      'Lease Reference',
      'Landlord Charged',
      'Allowed Amount',
      'Variance',
      'Tenant Share',
      'Recovery Request',
      'Evidence Status',
      'Resolution',
    ]

    sheet.columns = headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: i === 1 || i === 2 || i === 8 || i === 9 ? 28 : 18,
    }))

    applyHeaderStyle(sheet.getRow(1))
    const exampleRows = [
      [
        'F-001',
        'Management fee overage',
        'Operating Expenses definition',
        125000,
        98000,
        { formula: 'D2-E2' },
        0.125,
        { formula: 'F2*G2' },
        'Invoice + lease support',
        'Open',
      ],
      [
        'F-002',
        'Capital expenditure',
        'CAM exclusions',
        64000,
        0,
        { formula: 'D3-E3' },
        0.125,
        { formula: 'F3*G3' },
        'Need amortization backup',
        'Open',
      ],
    ]

    exampleRows.forEach((rowData, idx) => {
      const row = sheet.addRow(rowData)
      applyDataRowStyle(row, idx + 1)
    })
    addEmptyRows(sheet, 36, headers.length)
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Lextract branding in custom document properties ─────────────────────
  workbook.title = 'Lextract Commercial Lease Audit Workbook'
  workbook.subject = 'Lease management tracker - lextract.io'
  workbook.keywords = 'commercial lease, CAM, rent roll, due diligence, lextract'
  workbook.description =
    'Generated by Lextract - AI-powered commercial lease abstraction. Upload your lease at lextract.io to extract 126 fields in 5-15 minutes.'
  workbook.company = 'Lextract (lextract.io)'

  for (const sheet of workbook.worksheets) {
    sheet.addImage(brandImageId, {
      tl: { col: 12, row: 0 },
      ext: { width: 160, height: 41 },
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
