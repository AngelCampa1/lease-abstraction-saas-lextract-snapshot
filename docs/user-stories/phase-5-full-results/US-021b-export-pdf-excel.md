# US-021b: PDF & Excel Exports

**Phase:** 5 — Full Results & Editing | **Depends on:** US-021a | **Blocks:** None
**Type:** Backend
**Estimated session size:** Medium

## Description

Extend the export framework from US-021a with two additional formats: PDF (print-ready report via WeasyPrint) and Excel (spreadsheet with per-category sheets via openpyxl). Both formats support the same 4 property-type templates as Word.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] PDF export via WeasyPrint: matches Word report structure (cover, TOC, 14 sections, red flags, appendix)
- [ ] PDF is print-ready with proper page breaks, headers/footers, page numbers
- [ ] Excel export via openpyxl: one sheet per category (14 sheets) + summary dashboard sheet
- [ ] Summary sheet: key metrics, confidence distribution, red flag summary
- [ ] Category sheets: field label, value, confidence score, confidence tier columns
- [ ] Both formats support 4 property-type templates (Commercial, Office, Industrial, Retail)
- [ ] `GET /api/v1/extractions/{id}/export/pdf` and `/export/xlsx` endpoints
- [ ] Generated files uploaded to S3 exports path with presigned URL
- [ ] Confidence color-coding: green/yellow/red in both PDF and Excel
- [ ] Tests verify file generation, template selection, correct data mapping

## Technical Details

### Files to Create/Modify

- Create: `backend/app/services/exports/pdf.py` (PdfExporter class extending ExportBase)
- Create: `backend/app/services/exports/excel.py` (ExcelExporter class extending ExportBase)
- Create: `backend/app/services/exports/templates/pdf/` (HTML/CSS templates for WeasyPrint)
- Modify: `backend/app/tasks/export.py` (register pdf and xlsx formats)
- Modify: `backend/app/api/v1/extractions.py` (add pdf and xlsx export endpoints)
- Test: `backend/tests/test_pdf_export.py`
- Test: `backend/tests/test_excel_export.py`

### Key Implementation Notes

- **PDF:** WeasyPrint renders HTML/CSS → PDF. Create HTML templates with Jinja2, style with CSS print media queries
- Page breaks: `page-break-before: always` for each category section
- Headers/footers via CSS `@page` rule with property address and page numbers
- **Excel:** openpyxl workbook with named sheets, column auto-width, header row styling
- Color-coding: conditional formatting in Excel (PatternFill for green/yellow/red)
- Both formats use the same data extraction as Word — share common data preparation code
- Template variations: same approach as Word — field ordering, emphasis differs per property type

### Integration Points

- US-021a (Word Export) provides the ExportBase class and framework
- US-005 (S3) provides file upload and presigned URL
- US-030 (Frontend Export) provides the UI to trigger these exports

## Verification

```bash
cd backend
pytest tests/test_pdf_export.py -v    # PDF export tests pass
pytest tests/test_excel_export.py -v  # Excel export tests pass
# Manual: generate a .pdf — open and verify layout, page breaks, colors
# Manual: generate a .xlsx — open in Excel and verify sheets, formatting
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Exports" section: format requirements
- `docs/PRD.md` — Section 7.3: Export format specifications
- `docs/USER_FLOWS.md` — Flow 3: Edit & Export
