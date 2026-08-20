# Fix Round 3: Bugs Found by Deep Code Audit

## Context

After fixing 20 bugs in rounds 1-2, a deep audit of every backend task file, service, API endpoint, and frontend hook revealed **13 confirmed bugs**. The most severe class is **8 missing `.execute()` calls** across all pipeline tasks and email tasks — the exact same bug pattern as #14 (export.py) and the status.py fix from round 2. These would crash every extraction pipeline run.

---

## Bug Fixes

### Bug #21: Missing `.execute()` in `pipeline.py:153` (CRITICAL)
**File:** `backend/app/tasks/pipeline.py:153`
```python
response = db.table("extractions").select("*").eq("id", extraction_id).single()
# Missing .execute() — response is a query builder, not a result
```
**Fix:** Add `.execute()` after `.single()`.

---

### Bug #22: Missing `.execute()` in `extraction.py:69` (CRITICAL)
**File:** `backend/app/tasks/extraction.py:64-69`
```python
response = (
    db.table("extractions")
    .select("ocr_text, ocr_metadata")
    .eq("id", extraction_id)
    .single()  # <-- missing .execute()
)
```
**Fix:** Add `.execute()` after `.single()`.

---

### Bug #23: Missing `.execute()` in `scoring.py:56` (CRITICAL)
**File:** `backend/app/tasks/scoring.py:52-57`
```python
response = (
    db.table("extractions")
    .select("extracted_data, ocr_metadata")
    .eq("id", extraction_id)
    .single()  # <-- missing .execute()
)
```
**Fix:** Add `.execute()` after `.single()`.

---

### Bug #24: Missing `.execute()` in `ocr.py:67` (CRITICAL)
**File:** `backend/app/tasks/ocr.py:67`
```python
response = db.table("extractions").select("*").eq("id", extraction_id).single()
# Missing .execute()
```
**Fix:** Add `.execute()` after `.single()`.

---

### Bug #25: Missing `.execute()` in `email.py:66` — extraction complete email (CRITICAL)
**File:** `backend/app/tasks/email.py:62-67`
```python
extraction = (
    db.table("extractions")
    .select("user_id, document_filename, overall_confidence, extracted_data")
    .eq("id", extraction_id)
    .single()  # <-- missing .execute()
).data
```
**Fix:** Add `.execute()` before `.data`.

---

### Bug #26: Missing `.execute()` in `email.py:74` — user lookup in complete email (CRITICAL)
**File:** `backend/app/tasks/email.py:74`
```python
user = (db.table("users").select("email").eq("id", user_id).single()).data
```
**Fix:** Add `.execute()` before `.data`.

---

### Bug #27: Missing `.execute()` in `email.py:131` — CAM flags email extraction (CRITICAL)
**File:** `backend/app/tasks/email.py:127-132`
```python
extraction = (
    db.table("extractions")
    .select("user_id, document_filename, show_camaudit, red_flags")
    .eq("id", extraction_id)
    .single()  # <-- missing .execute()
).data
```
**Fix:** Add `.execute()` before `.data`.

---

### Bug #28: Missing `.execute()` in `email.py:155` — user lookup in CAM flags email (CRITICAL)
**File:** `backend/app/tasks/email.py:155`
```python
user = (db.table("users").select("email").eq("id", user_id).single()).data
```
**Fix:** Add `.execute()` before `.data`.

---

### Bug #29: Field editor allows edits on soft-deleted extractions (HIGH)
**File:** `backend/app/services/field_editor.py:88-100`
**Bug:** `edit_field()` reads the extraction record but never checks `deleted_at`. A concurrent soft-delete could succeed, then the field edit overwrites data on a deleted extraction. The API endpoint calls `_check_not_deleted(record)` on the initial fetch, but the service reads the record again independently — the record could be deleted between the two reads.
**Fix:** Add `.is_("deleted_at", "null")` to the service's extraction query.

```python
result = (
    db.table("extractions")
    .select("extracted_data, updated_at")
    .eq("id", extraction_id)
    .is_("deleted_at", "null")
    .single()
    .execute()
)
```

---

### Bug #30: `useFieldEdit` doesn't invalidate edit history (HIGH)
**File:** `frontend/hooks/use-field-edit.ts:76-80`
**Bug:** After a field edit succeeds, `onSettled` only invalidates `extractionKeys.detail(extractionId)`. The edit history query (`['extractions', extractionId, 'edits']`) is never invalidated, so the edit history panel shows stale data until manual refresh.
**Fix:** Add edit history invalidation to `onSettled`.

```typescript
onSettled: () => {
  queryClient.invalidateQueries({
    queryKey: extractionKeys.detail(extractionId),
  })
  queryClient.invalidateQueries({
    queryKey: ['extractions', extractionId, 'edits'],
  })
},
```

---

### Bug #31: `useFieldEdit` optimistic update drops confidence/source_text (MEDIUM)
**File:** `frontend/hooks/use-field-edit.ts:32-35`
**Bug:** The optimistic update spreads the existing field object then overwrites `value`, but if the field doesn't exist in the cache, it creates `{ value }` — missing `confidence` and `source_text`. Even when the field exists, the spread preserves them, so this only affects new fields (edge case).
**Fix:** Preserve existing field properties with a default structure.

```typescript
[request.field_name]: {
  confidence: null,
  source_text: null,
  ...previousData.extracted_data[request.field_name],
  value: request.value,
},
```

---

### Bug #32: `_fetch_extraction` uses fragile string matching for 404 detection (MEDIUM)
**File:** `backend/app/api/v1/extractions.py:121`
**Bug:** `if "No rows" in str(exc) or "0 rows" in str(exc)` — this relies on PostgREST error message text that could change across versions.
**Fix:** Also check for the PostgREST error code pattern or exception type.

```python
except Exception as exc:
    exc_str = str(exc)
    if "PGRST116" in exc_str or "No rows" in exc_str or "0 rows" in exc_str:
        raise HTTPException(status_code=404, detail="Extraction not found")
```

---

### Bug #33: Export task leaks internal S3 key in API response (LOW)
**File:** `backend/app/tasks/export.py:177`
**Bug:** The export response includes `s3_key` which exposes internal bucket structure to the client.
**Fix:** Remove `s3_key` from the response dict.

---

## Files to Modify

| File | Bugs |
|------|------|
| `backend/app/tasks/pipeline.py` | #21 |
| `backend/app/tasks/extraction.py` | #22 |
| `backend/app/tasks/scoring.py` | #23 |
| `backend/app/tasks/ocr.py` | #24 |
| `backend/app/tasks/email.py` | #25, #26, #27, #28 |
| `backend/app/services/field_editor.py` | #29 |
| `frontend/hooks/use-field-edit.ts` | #30, #31 |
| `backend/app/api/v1/extractions.py` | #32 |
| `backend/app/tasks/export.py` | #33 |

## Tests to Create/Update

| Test File | What |
|-----------|------|
| `backend/tests/test_pipeline.py` | #21: mock chain must include `.execute()` |
| `backend/tests/test_extraction_task.py` | #22: mock chain must include `.execute()` |
| `backend/tests/test_scoring_task.py` (new or update) | #23: verify `.execute()` is called |
| `backend/tests/test_ocr_tasks.py` | #24: mock chain must include `.execute()` |
| `backend/tests/test_email.py` | #25-28: all 4 query chains need `.execute()` |
| `backend/tests/test_field_editing.py` | #29: test edit on soft-deleted extraction raises error |
| `frontend/__tests__/hooks/use-field-edit.test.tsx` | #30: verify edit history invalidation |
| `backend/tests/test_results_endpoints.py` | #32: verify PGRST116 code detection |
| `backend/tests/test_export_task.py` | #33: verify no s3_key in response |

## Verification

```bash
cd backend && python -m pytest tests/ -v --no-cov
cd frontend && npx vitest --run --no-coverage
cd backend && mypy app/
cd frontend && npx tsc --noEmit
```
