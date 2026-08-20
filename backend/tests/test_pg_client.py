"""Unit tests for QueryBuilder SQL generation (no database connection required).

These tests call the internal _build_*() methods directly to verify the
emitted SQL strings and parameter lists without needing a live Postgres instance.
"""

from __future__ import annotations
from unittest.mock import MagicMock, patch

import pytest

from app.database.pg_client import QueryBuilder, QueryResult, PostgrestSingleError


def _builder(table: str = "extractions") -> QueryBuilder:
    """Return a fresh QueryBuilder wired to a fake conninfo (never executed)."""
    return QueryBuilder(table, "postgresql://fake/fake")


class TestSelectSQL:
    """SELECT statement generation."""

    def test_select_star(self) -> None:
        sql, params = _builder().select()._build_select()
        assert sql == 'SELECT * FROM "extractions"'
        assert params == []

    def test_select_columns(self) -> None:
        sql, params = _builder().select("id, name")._build_select()
        assert '"id"' in sql
        assert '"name"' in sql
        assert params == []

    def test_limit_appends_limit_clause(self) -> None:
        sql, params = _builder().select().limit(10)._build_select()
        assert "LIMIT %s" in sql
        assert 10 in params

    def test_offset_appends_offset_clause(self) -> None:
        sql, params = _builder().select().limit(5).offset(20)._build_select()
        assert "OFFSET %s" in sql
        assert 20 in params

    def test_offset_without_limit_still_works(self) -> None:
        sql, params = _builder().select().offset(50)._build_select()
        assert "OFFSET %s" in sql
        assert 50 in params

    def test_limit_and_offset_order_in_sql(self) -> None:
        """LIMIT must come before OFFSET in the emitted SQL."""
        sql, params = _builder().select().limit(5).offset(10)._build_select()
        limit_pos = sql.index("LIMIT")
        offset_pos = sql.index("OFFSET")
        assert limit_pos < offset_pos
        assert params[-2] == 5
        assert params[-1] == 10

    def test_eq_filter_adds_where_clause(self) -> None:
        sql, params = _builder().select().eq("status", "active")._build_select()
        assert 'WHERE "status" = %s' in sql
        assert "active" in params

    def test_order_asc(self) -> None:
        sql, _ = _builder().select().order("created_at")._build_select()
        assert 'ORDER BY "created_at" ASC' in sql

    def test_order_desc(self) -> None:
        sql, _ = _builder().select().order("created_at", desc=True)._build_select()
        assert 'ORDER BY "created_at" DESC' in sql

    def test_rejects_unsafe_filter_identifier(self) -> None:
        with pytest.raises(ValueError, match="Unsafe SQL identifier"):
            _builder().select().eq('id"; DROP TABLE users; --', "x")._build_select()

    def test_rejects_unsafe_table_identifier(self) -> None:
        with pytest.raises(ValueError, match="Table is not allowed"):
            _builder('users"; DROP TABLE payments; --').select()._build_select()

    def test_single_sets_limit_1(self) -> None:
        qb = _builder().select().single()
        assert qb._limit_val == 1

    def test_maybe_single_sets_limit_1(self) -> None:
        qb = _builder().select().maybe_single()
        assert qb._limit_val == 1


class TestIsFilter:
    """is_() filter validation."""

    def test_is_null_appends_is_null_filter(self) -> None:
        sql, params = _builder().select().is_("deleted_at", "null")._build_select()
        assert '"deleted_at" IS NULL' in sql
        assert params == []

    def test_is_not_null_appends_is_not_null_filter(self) -> None:
        sql, params = _builder().select().is_("deleted_at", "not null")._build_select()
        assert '"deleted_at" IS NOT NULL' in sql
        assert params == []

    def test_is_invalid_value_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="'null' or 'not null'"):
            _builder().select().is_("deleted_at", "nul")  # typo

    def test_is_empty_string_raises_value_error(self) -> None:
        with pytest.raises(ValueError):
            _builder().select().is_("col", "")


class TestInsertSQL:
    """INSERT statement generation."""

    def test_insert_single_row(self) -> None:
        sql, params = _builder().insert({"name": "Alice", "age": 30})._build_insert()
        assert "INSERT INTO" in sql
        assert "RETURNING *" in sql
        assert "Alice" in params or 30 in params

    def test_insert_empty_returns_no_op(self) -> None:
        sql, params = _builder().insert([])._build_insert()
        assert "WHERE false" in sql


class TestUpdateSQL:
    """UPDATE statement generation."""

    def test_update_with_filter(self) -> None:
        sql, params = (
            _builder().update({"status": "done"}).eq("id", "abc")._build_update()
        )
        assert "UPDATE" in sql
        assert '"status" = %s' in sql
        assert "RETURNING *" in sql
        assert "done" in params
        assert "abc" in params


class TestDeleteSQL:
    """DELETE statement generation."""

    def test_delete_with_eq_filter(self) -> None:
        sql, params = _builder().delete().eq("id", "xyz")._build_delete()
        assert "DELETE FROM" in sql
        assert '"id" = %s' in sql
        assert "RETURNING *" in sql
        assert "xyz" in params


class TestUpsertSQL:
    """UPSERT (INSERT … ON CONFLICT … DO UPDATE) statement generation."""

    def test_upsert_single_row_default_conflict_column(self) -> None:
        sql, params = _builder().upsert({"id": "u1", "name": "Bob"})._build_upsert()
        assert "INSERT INTO" in sql
        assert "ON CONFLICT" in sql
        assert "DO UPDATE SET" in sql
        assert "RETURNING *" in sql
        assert "u1" in params

    def test_upsert_explicit_conflict_column(self) -> None:
        sql, params = (
            _builder()
            .upsert({"slug": "hello", "title": "Hello"}, on_conflict="slug")
            ._build_upsert()
        )
        assert '"slug"' in sql
        assert "DO UPDATE SET" in sql

    def test_upsert_rejects_unsafe_conflict_column(self) -> None:
        with pytest.raises(ValueError, match="Unsafe SQL identifier"):
            (
                _builder()
                .upsert({"slug": "hello"}, on_conflict="slug) DO NOTHING; --")
                ._build_upsert()
            )

    def test_upsert_empty_returns_no_op(self) -> None:
        sql, params = _builder().upsert([])._build_upsert()
        assert "WHERE false" in sql

    def test_upsert_dict_converted_to_list(self) -> None:
        """A plain dict is treated as a single-row upsert."""
        sql, params = _builder().upsert({"id": "x", "val": 1})._build_upsert()
        assert "INSERT INTO" in sql


class TestComparatorFilters:
    """neq, gt, lt, gte, lte, in_, like, ilike, not_ filters."""

    def test_neq_filter(self) -> None:
        sql, params = _builder().select().neq("status", "failed")._build_select()
        assert '"status" != %s' in sql
        assert "failed" in params

    def test_gt_filter(self) -> None:
        sql, params = _builder().select().gt("score", 0.5)._build_select()
        assert '"score" > %s' in sql
        assert 0.5 in params

    def test_lt_filter(self) -> None:
        sql, params = _builder().select().lt("score", 1.0)._build_select()
        assert '"score" < %s' in sql

    def test_gte_filter(self) -> None:
        sql, params = _builder().select().gte("score", 0.85)._build_select()
        assert '"score" >= %s' in sql

    def test_lte_filter(self) -> None:
        sql, params = _builder().select().lte("score", 1.0)._build_select()
        assert '"score" <= %s' in sql

    def test_in_filter(self) -> None:
        sql, params = _builder().select().in_("status", ["a", "b", "c"])._build_select()
        assert '"status" IN' in sql
        assert "a" in params
        assert "b" in params
        assert "c" in params

    def test_like_filter(self) -> None:
        sql, params = _builder().select().like("name", "%alice%")._build_select()
        assert '"name" LIKE %s' in sql
        assert "%alice%" in params

    def test_ilike_filter(self) -> None:
        sql, params = _builder().select().ilike("name", "%bob%")._build_select()
        assert '"name" ILIKE %s' in sql

    def test_not_filter(self) -> None:
        sql, params = (
            _builder().select().not_("status", "in", ["x", "y"])._build_select()
        )
        assert "NOT IN" in sql

    def test_not_filter_valid_operator_like(self) -> None:
        sql, params = _builder().select().not_("name", "like", "%x%")._build_select()
        assert '"name" NOT LIKE %s' in sql
        assert "%x%" in params

    def test_not_filter_rejects_injection_operator(self) -> None:
        with pytest.raises(ValueError, match="Unsupported operator"):
            _builder().select().not_("status", "= 1; DROP TABLE users; --", "x")

    def test_build_where_rejects_injection_operator(self) -> None:
        """A _Filter carrying an unallowed operator is rejected at SQL build."""
        from app.database.pg_client import _Filter

        qb = _builder().select()
        qb._filters.append(_Filter("status", "= 1; DROP TABLE users; --", "x"))
        with pytest.raises(ValueError, match="Unsupported operator"):
            qb._build_select()


class TestUpdateEdgeCases:
    """Additional update SQL edge cases."""

    def test_update_empty_data_returns_no_op(self) -> None:
        sql, params = _builder().update({})._build_update()
        assert "WHERE false" in sql

    def test_update_jsonb_value_wrapped(self) -> None:
        """dict values are wrapped with Json() for JSONB compatibility."""
        from psycopg.types.json import Json

        sql, params = _builder().update({"metadata": {"key": "val"}})._build_update()
        assert any(isinstance(p, Json) for p in params)


class TestPgNeonDBAuth:
    """PgNeonDB.auth() is a documented no-op."""

    def test_auth_returns_none(self) -> None:
        from app.database.pg_client import PgNeonDB

        db = PgNeonDB("postgresql://fake/fake")
        result = db.auth("any-token")
        assert result is None

    def test_table_returns_query_builder(self) -> None:
        from app.database.pg_client import PgNeonDB, QueryBuilder

        db = PgNeonDB("postgresql://fake/fake")
        qb = db.table("users")
        assert isinstance(qb, QueryBuilder)

    def test_from_alias(self) -> None:
        from app.database.pg_client import PgNeonDB, QueryBuilder

        db = PgNeonDB("postgresql://fake/fake")
        qb = db.from_("users")
        assert isinstance(qb, QueryBuilder)


# ---------------------------------------------------------------------------
# Helpers for mocking psycopg.connect
# ---------------------------------------------------------------------------


def _make_cursor_mock(rows: list, description: object = True) -> MagicMock:
    """Return a cursor mock that yields *rows* from fetchall()."""
    cur = MagicMock()
    cur.description = description
    cur.fetchall.return_value = rows
    cur.fetchone.return_value = rows[0] if rows else None
    # Support `with conn.cursor() as cur:` and `with conn.cursor() as count_cur:`
    cur.__enter__ = lambda s: s
    cur.__exit__ = MagicMock(return_value=False)
    return cur


def _make_conn_mock(rows: list, count_row: dict | None = None) -> MagicMock:
    """Return a connection mock whose cursor(s) return *rows*."""
    main_cur = _make_cursor_mock(rows)
    count_cur = _make_cursor_mock([count_row] if count_row else [])

    call_count = [0]

    def _cursor(*_a, **_kw):
        call_count[0] += 1
        return main_cur if call_count[0] == 1 else count_cur

    conn = MagicMock()
    conn.cursor.side_effect = _cursor
    conn.__enter__ = lambda s: s
    conn.__exit__ = MagicMock(return_value=False)
    return conn


def _make_pool_mock(conn: MagicMock) -> MagicMock:
    """Return a pool mock whose connection() context manager yields *conn*."""
    pool = MagicMock()
    pool.connection.return_value = conn
    return pool


# ---------------------------------------------------------------------------
# execute() — all operation branches
# ---------------------------------------------------------------------------


class TestExecute:
    """execute() dispatches to the right builder and returns QueryResult."""

    def _run(self, qb: QueryBuilder, rows: list) -> QueryResult:
        conn = _make_conn_mock(rows)
        pool = _make_pool_mock(conn)
        with patch("app.database.pg_client._get_pool", return_value=pool):
            return qb.execute()

    def test_select_returns_all_rows(self) -> None:
        rows = [{"id": "1"}, {"id": "2"}]
        result = self._run(_builder().select(), rows)
        assert result.data == rows
        assert result.count is None

    def test_insert_returns_inserted_row(self) -> None:
        rows = [{"id": "new", "name": "Alice"}]
        result = self._run(_builder().insert({"name": "Alice"}), rows)
        assert result.data == rows

    def test_update_returns_updated_row(self) -> None:
        rows = [{"id": "1", "status": "done"}]
        result = self._run(_builder().update({"status": "done"}).eq("id", "1"), rows)
        assert result.data == rows

    def test_delete_returns_deleted_row(self) -> None:
        rows = [{"id": "1"}]
        result = self._run(_builder().delete().eq("id", "1"), rows)
        assert result.data == rows

    def test_upsert_returns_upserted_row(self) -> None:
        rows = [{"id": "u1", "name": "Bob"}]
        result = self._run(_builder().upsert({"id": "u1", "name": "Bob"}), rows)
        assert result.data == rows

    def test_single_returns_first_row(self) -> None:
        rows = [{"id": "1"}]
        result = self._run(_builder().select().single(), rows)
        assert result.data == {"id": "1"}

    def test_single_raises_when_no_rows(self) -> None:
        with pytest.raises(PostgrestSingleError):
            self._run(_builder().select().single(), [])

    def test_maybe_single_returns_first_row(self) -> None:
        rows = [{"id": "1"}]
        result = self._run(_builder().select().maybe_single(), rows)
        assert result.data == {"id": "1"}

    def test_maybe_single_returns_none_when_empty(self) -> None:
        result = self._run(_builder().select().maybe_single(), [])
        assert result.data is None

    def test_no_description_returns_empty_rows(self) -> None:
        """Cursor with no description (e.g. INSERT with no RETURNING) yields []."""
        conn = _make_conn_mock([])
        # Force description to None
        conn.cursor.return_value.description = None
        conn.cursor.return_value.__enter__ = lambda s: s
        conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        pool = _make_pool_mock(conn)
        with patch("app.database.pg_client._get_pool", return_value=pool):
            result = _builder().select().execute()
        assert result.data == []

    def test_select_with_exact_count(self) -> None:
        rows = [{"id": "1"}]
        count_row = {"count": 42}
        conn = _make_conn_mock(rows, count_row=count_row)
        pool = _make_pool_mock(conn)
        with patch("app.database.pg_client._get_pool", return_value=pool):
            result = _builder().select(count="exact").execute()
        assert result.count == 42

    def test_unknown_op_raises_value_error(self) -> None:
        qb = _builder()
        qb._op = "UNKNOWN"  # bypass enum to exercise the else-branch guard
        with pytest.raises(ValueError, match="Unknown operation"):
            qb.execute()


class TestBuildCountQuery:
    """_build_count_query() emits correct SQL."""

    def test_count_query_no_filter(self) -> None:
        sql, params = _builder().select()._build_count_query()
        assert 'SELECT COUNT(*) as count FROM "extractions"' == sql
        assert params == []

    def test_count_query_with_filter(self) -> None:
        sql, params = _builder().select().eq("user_id", "u1")._build_count_query()
        assert "WHERE" in sql
        assert "u1" in params


class TestPgNeonDBRpc:
    """PgNeonDB.rpc() builds and executes a function-call query."""

    def _run_rpc(self, fn: str, params: dict | None, rows: list) -> QueryResult:
        from app.database.pg_client import PgNeonDB

        db = PgNeonDB("postgresql://fake/fake")
        conn = _make_conn_mock(rows)
        pool = _make_pool_mock(conn)
        with patch("app.database.pg_client._get_pool", return_value=pool):
            return db.rpc(fn, params)

    def test_rpc_no_params_calls_fn(self) -> None:
        result = self._run_rpc("my_func", None, [{"result": 1}])
        assert result.data == [{"result": 1}]

    def test_rpc_with_params_builds_named_args(self) -> None:
        rows = [{"out": "ok"}]
        result = self._run_rpc("my_func", {"a": 1, "b": 2}, rows)
        assert result.data == rows

    def test_rpc_empty_result(self) -> None:
        result = self._run_rpc("my_func", None, [])
        assert result.data == []
