# US-021a: Export Framework & Word Export

**Phase:** 4 — Results & Payment | **Depends on:** US-015a | **Blocks:** US-021b, US-030
**Type:** Backend
**Estimated session size:** Large

## Description

Build the export framework (base class, Celery task, S3 upload pattern) and implement the first export format: Microsoft Word (.docx). The Word export produces a professional lease abstraction report with cover page, table of contents, 14 category sections, red flag summary, and appendix. Supports 4 property-type templates.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] Export base class with: generate method, S3 upload, presigned URL generation
- [ ] `generate_export` Celery task: accepts extraction_id + format + template, generates file, uploads to S3
- [ ] `GET /api/v1/extractions/{id}/export/docx?template=commercial` endpoint
- [ ] Returns 202 Accepted with job_id if async, or presigned URL if already generated
- [ ] Word export structure: cover page, executive summary, TOC, 14 category sections, red flag summary, appendix
- [ ] Each category section: table with field label, value, confidence badge
- [ ] Red flag summary: table with rule_id, name, severity, description, triggered_value
- [ ] 4 property-type templates: Commercial (general), Office, Industrial, Retail
- [ ] Template differences: category ordering, emphasized fields, header styling
- [ ] Generated .docx uploaded to S3 at `exports/` path with 1-hour presigned URL
- [ ] Tests: export generation, template selection, S3 upload

## Technical Details

### Files to Create/Modify

- Create: `backend/app/services/exports/base.py` (ExportBase class)
- Create: `backend/app/services/exports/word.py` (WordExporter class)
- Create: `backend/app/services/exports/__init__.py`
- Create: `backend/app/tasks/export.py` (generate_export Celery task)
- Modify: `backend/app/api/v1/extractions.py` (add export endpoint)
- Create: `backend/app/services/exports/templates/` (template configs per property type)
- Test: `backend/tests/test_word_export.py`
- Test: `backend/tests/test_export_task.py`

### Key Implementation Notes

- Use `python-docx` library for Word generation
- Export base class: `generate(extraction_data, template) → bytes`, `upload_to_s3(bytes, extraction_id, format) → presigned_url`
- S3 export path: `lextract-documents/{user_id}/{extraction_id}/exports/extraction.docx`
- Celery task pattern: `generate_export.delay(extraction_id, format='docx', template='commercial')`
- Cover page: Lextract logo, property address, parties, extraction date
- TOC: auto-generated from heading styles
- Category sections: one per page (or continuous), fields in table format
- Template differences are primarily: field ordering, which fields get highlighted, section emphasis
- Confidence badges in Word: colored cell background (green/yellow/red) or text markers

### Integration Points

- US-015a (Pipeline) provides the extraction data this exports
- US-005 (S3) provides upload and presigned URL generation
- US-021b (PDF/Excel) extends this framework with additional formats
- US-030 (Frontend Export) calls the export endpoint

## Verification

```bash
cd backend
pytest tests/test_word_export.py -v  # Word export tests pass
pytest tests/test_export_task.py -v  # Export task tests pass
# Manual: generate a .docx, open in Word/LibreOffice — verify structure and formatting
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Exports" section: export path, presigned URLs
- `docs/USER_FLOWS.md` — Flow 3: Edit & Export (steps 6-9)
- `docs/PRD.md` — Section 7.3: Export format requirements, template variations
