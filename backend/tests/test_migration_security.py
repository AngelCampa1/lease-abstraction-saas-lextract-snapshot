from pathlib import Path


MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "neon" / "migrations"


def _combined_migration_sql() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(MIGRATIONS_DIR.glob("*.sql"))
    ).lower()


def test_ocr_archive_table_is_not_readable_by_authenticated_without_rls() -> None:
    sql = _combined_migration_sql()

    assert "public.extractions_archive_ocr" in sql
    assert "to_regclass('public.extractions_archive_ocr') is not null" in sql
    assert "alter table public.extractions_archive_ocr enable row level security" in sql
    assert (
        "revoke all on table public.extractions_archive_ocr from authenticated" in sql
    )
    assert "revoke all on table public.extractions_archive_ocr from public" in sql
