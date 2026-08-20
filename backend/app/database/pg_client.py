"""Direct PostgreSQL client with a postgrest-py compatible query builder.

Replaces the PostgREST HTTP layer with direct psycopg connections while
keeping the same .table().select().eq().execute() API so no call sites
need changing.

Uses a module-level connection pool (psycopg_pool.ConnectionPool) to
avoid opening a new connection per query. The pool is lazily initialized
on first use and shared across all PgNeonDB instances with the same
conninfo.
"""

from __future__ import annotations

import logging
import re
import threading
from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json
from psycopg_pool import ConnectionPool

logger = logging.getLogger(__name__)

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_ALLOWED_TABLES = frozenset(
    {
        "anonymous_sessions",
        "credit_transactions",
        "extraction_edits",
        "extraction_pipeline_events",
        "extractions",
        "payments",
        "stripe_webhook_events",
        "users",
    }
)

# Comparison operators the builder legitimately emits unparameterized into SQL.
# Includes negated forms produced by not_() (e.g. "NOT IN", "NOT LIKE").
_ALLOWED_OPERATORS = frozenset(
    {
        "=",
        "!=",
        "<>",
        "<",
        "<=",
        ">",
        ">=",
        "LIKE",
        "ILIKE",
        "IN",
        "IS",
        "IS NOT",
        "NOT =",
        "NOT !=",
        "NOT <>",
        "NOT <",
        "NOT <=",
        "NOT >",
        "NOT >=",
        "NOT LIKE",
        "NOT ILIKE",
        "NOT IN",
        "NOT IS",
    }
)


def _validate_operator(operator: str) -> str:
    if operator not in _ALLOWED_OPERATORS:
        raise ValueError(f"Unsupported operator: {operator!r}")
    return operator


def _quote_identifier(identifier: str) -> str:
    if not _IDENTIFIER_RE.fullmatch(identifier):
        raise ValueError(f"Unsafe SQL identifier: {identifier!r}")
    return f'"{identifier}"'


def _quote_table_name(table_name: str) -> str:
    if table_name not in _ALLOWED_TABLES:
        raise ValueError(f"Table is not allowed: {table_name!r}")
    return _quote_identifier(table_name)


def _quote_identifier_list(raw_identifiers: str) -> tuple[str, set[str]]:
    identifiers = [part.strip() for part in raw_identifiers.split(",") if part.strip()]
    if not identifiers:
        raise ValueError("At least one conflict identifier is required")
    quoted = [_quote_identifier(identifier) for identifier in identifiers]
    return f"({', '.join(quoted)})", set(identifiers)


def _adapt_param(value: Any) -> Any:
    """Wrap dict/list values with Json() so psycopg can serialize them to JSONB."""
    if isinstance(value, (dict, list)):
        return Json(value)
    return value


class _Op(Enum):
    SELECT = "select"
    INSERT = "insert"
    UPDATE = "update"
    DELETE = "delete"
    UPSERT = "upsert"


@dataclass
class QueryResult:
    """Mimics postgrest-py APIResponse."""

    data: list[dict[str, Any]] | dict[str, Any] | None
    count: int | None = None


@dataclass
class _Filter:
    column: str
    operator: str
    value: Any


# ---------------------------------------------------------------------------
# Module-level connection pool registry
# ---------------------------------------------------------------------------
_pools: dict[str, ConnectionPool[psycopg.Connection[dict[str, Any]]]] = {}
_pool_lock = threading.Lock()


def _get_pool(
    conninfo: str,
) -> ConnectionPool[psycopg.Connection[dict[str, Any]]]:
    """Return the shared ConnectionPool for *conninfo*, creating it lazily.

    Thread-safe via double-checked locking.
    """
    if conninfo not in _pools:
        with _pool_lock:
            if conninfo not in _pools:
                _pools[conninfo] = ConnectionPool[psycopg.Connection[dict[str, Any]]](
                    conninfo,
                    open=False,
                    min_size=0,
                    max_size=20,
                    max_idle=60,  # close idle conns so Neon compute can autosuspend
                    kwargs={"row_factory": dict_row},
                )
    return _pools[conninfo]


def _ensure_pool_open(
    pool: ConnectionPool[psycopg.Connection[dict[str, Any]]],
) -> None:
    """Open the shared pool lazily on first checkout."""
    if pool.closed:
        pool.open()


def reset_pools() -> None:
    """Close and discard all cached pools. Used in tests only."""
    for pool in _pools.values():
        try:
            pool.close()
        except Exception:
            pass
    _pools.clear()


class QueryBuilder:
    """Chainable query builder that compiles to SQL and executes via psycopg."""

    def __init__(
        self,
        table_name: str,
        conninfo: str,
        *,
        conn: psycopg.Connection[dict[str, Any]] | None = None,
    ) -> None:
        self._table = table_name
        self._conninfo = conninfo
        # When executing inside a transaction, _conn is set so all queries
        # share the same connection (and therefore the same transaction).
        self._conn = conn
        self._op: _Op = _Op.SELECT
        self._columns: str = "*"
        self._filters: list[_Filter] = []
        self._order_clauses: list[str] = []
        self._limit_val: int | None = None
        self._offset_val: int | None = None
        self._single: bool = False
        self._maybe_single: bool = False
        self._count_mode: str | None = None
        self._insert_data: dict[str, Any] | list[dict[str, Any]] | None = None
        self._update_data: dict[str, Any] | None = None
        self._on_conflict: str | None = None
        self._ignore_duplicates: bool = False
        self._for_update: bool = False

    def select(self, columns: str = "*", *, count: str | None = None) -> QueryBuilder:
        self._op = _Op.SELECT
        self._columns = columns
        self._count_mode = count
        return self

    def insert(self, data: dict[str, Any] | list[dict[str, Any]]) -> QueryBuilder:
        self._op = _Op.INSERT
        self._insert_data = data
        return self

    def update(self, data: dict[str, Any]) -> QueryBuilder:
        self._op = _Op.UPDATE
        self._update_data = data
        return self

    def delete(self) -> QueryBuilder:
        self._op = _Op.DELETE
        return self

    def upsert(
        self,
        data: dict[str, Any] | list[dict[str, Any]],
        *,
        on_conflict: str = "",
        ignore_duplicates: bool = False,
    ) -> QueryBuilder:
        self._op = _Op.UPSERT
        self._insert_data = data
        self._on_conflict = on_conflict
        self._ignore_duplicates = ignore_duplicates
        return self

    # -- filters --

    def eq(self, column: str, value: Any) -> QueryBuilder:
        self._filters.append(_Filter(column, "=", value))
        return self

    def neq(self, column: str, value: Any) -> QueryBuilder:
        self._filters.append(_Filter(column, "!=", value))
        return self

    def gt(self, column: str, value: Any) -> QueryBuilder:
        self._filters.append(_Filter(column, ">", value))
        return self

    def lt(self, column: str, value: Any) -> QueryBuilder:
        self._filters.append(_Filter(column, "<", value))
        return self

    def gte(self, column: str, value: Any) -> QueryBuilder:
        self._filters.append(_Filter(column, ">=", value))
        return self

    def lte(self, column: str, value: Any) -> QueryBuilder:
        self._filters.append(_Filter(column, "<=", value))
        return self

    def in_(self, column: str, values: list[Any]) -> QueryBuilder:
        self._filters.append(_Filter(column, "IN", values))
        return self

    def is_(self, column: str, value: str) -> QueryBuilder:
        if value == "null":
            self._filters.append(_Filter(column, "IS", None))
        elif value == "not null":
            self._filters.append(_Filter(column, "IS NOT", None))
        else:
            raise ValueError(f"is_() value must be 'null' or 'not null', got {value!r}")
        return self

    def like(self, column: str, value: str) -> QueryBuilder:
        self._filters.append(_Filter(column, "LIKE", value))
        return self

    def ilike(self, column: str, value: str) -> QueryBuilder:
        self._filters.append(_Filter(column, "ILIKE", value))
        return self

    def not_(self, column: str, operator: str, value: Any) -> QueryBuilder:
        neg_op = _validate_operator(f"NOT {operator.upper()}")
        self._filters.append(_Filter(column, neg_op, value))
        return self

    # -- modifiers --

    def for_update(self) -> QueryBuilder:
        """Add FOR UPDATE row-level lock to SELECT queries (used in transactions)."""
        self._for_update = True
        return self

    def order(self, column: str, *, desc: bool = False) -> QueryBuilder:
        direction = "DESC" if desc else "ASC"
        self._order_clauses.append(f"{_quote_identifier(column)} {direction}")
        return self

    def limit(self, n: int) -> QueryBuilder:
        self._limit_val = n
        return self

    def offset(self, n: int) -> QueryBuilder:
        self._offset_val = n
        return self

    def single(self) -> QueryBuilder:
        self._single = True
        self._limit_val = 1
        return self

    def maybe_single(self) -> QueryBuilder:
        self._maybe_single = True
        self._limit_val = 1
        return self

    # -- execution --

    def _build_where(self, params: list[Any]) -> str:
        if not self._filters:
            return ""
        clauses = []
        for f in self._filters:
            if f.operator == "IS":
                clauses.append(f"{_quote_identifier(f.column)} IS NULL")
            elif f.operator == "IS NOT":
                clauses.append(f"{_quote_identifier(f.column)} IS NOT NULL")
            elif f.operator == "IN":
                placeholders = ", ".join(["%s"] * len(f.value))
                clauses.append(f"{_quote_identifier(f.column)} IN ({placeholders})")
                params.extend(f.value)
            else:
                op = _validate_operator(f.operator)
                clauses.append(f"{_quote_identifier(f.column)} {op} %s")
                params.append(f.value)
        return " WHERE " + " AND ".join(clauses)

    def _build_select(self) -> tuple[str, list[Any]]:
        params: list[Any] = []
        cols = self._columns.strip()
        if cols == "*":
            select_cols = "*"
        else:
            parts = [c.strip() for c in cols.split(",")]
            select_cols = ", ".join(_quote_identifier(c) for c in parts)
        sql = f"SELECT {select_cols} FROM {_quote_table_name(self._table)}"
        sql += self._build_where(params)
        if self._order_clauses:
            sql += " ORDER BY " + ", ".join(self._order_clauses)
        if self._limit_val is not None:
            sql += " LIMIT %s"
            params.append(self._limit_val)
        if self._offset_val is not None:
            sql += " OFFSET %s"
            params.append(self._offset_val)
        if self._for_update:
            sql += " FOR UPDATE"
        return sql, params

    def _build_insert(self) -> tuple[str, list[Any]]:
        data = self._insert_data
        if isinstance(data, dict):
            data = [data]
        if not data:
            return f"SELECT * FROM {_quote_table_name(self._table)} WHERE false", []
        columns = list(data[0].keys())
        col_str = ", ".join(_quote_identifier(c) for c in columns)
        row_placeholders = ", ".join(["%s"] * len(columns))
        values_str = ", ".join([f"({row_placeholders})"] * len(data))
        params: list[Any] = []
        for row in data:
            for c in columns:
                params.append(_adapt_param(row[c]))
        sql = (
            f"INSERT INTO {_quote_table_name(self._table)} ({col_str}) "
            f"VALUES {values_str} RETURNING *"
        )
        return sql, params

    def _build_upsert(self) -> tuple[str, list[Any]]:
        data = self._insert_data
        if isinstance(data, dict):
            data = [data]
        if not data:
            return f"SELECT * FROM {_quote_table_name(self._table)} WHERE false", []
        columns = list(data[0].keys())
        col_str = ", ".join(_quote_identifier(c) for c in columns)
        row_placeholders = ", ".join(["%s"] * len(columns))
        values_str = ", ".join([f"({row_placeholders})"] * len(data))
        params: list[Any] = []
        for row in data:
            for c in columns:
                params.append(_adapt_param(row[c]))
        conflict_raw = self._on_conflict or columns[0]
        conflict_sql, conflict_cols = _quote_identifier_list(conflict_raw)

        if self._ignore_duplicates:
            # ON CONFLICT DO NOTHING skips rows that already exist.
            sql = (
                f"INSERT INTO {_quote_table_name(self._table)} ({col_str}) "
                f"VALUES {values_str}"
                f" ON CONFLICT {conflict_sql} DO NOTHING"
                f" RETURNING *"
            )
        else:
            update_cols = [c for c in columns if c not in conflict_cols]
            if not update_cols:
                # No columns to update, so fall back to DO NOTHING.
                sql = (
                    f"INSERT INTO {_quote_table_name(self._table)} ({col_str}) "
                    f"VALUES {values_str}"
                    f" ON CONFLICT {conflict_sql} DO NOTHING"
                    f" RETURNING *"
                )
            else:
                update_str = ", ".join(
                    f"{_quote_identifier(c)} = EXCLUDED.{_quote_identifier(c)}"
                    for c in update_cols
                )
                sql = (
                    f"INSERT INTO {_quote_table_name(self._table)} ({col_str}) "
                    f"VALUES {values_str}"
                    f" ON CONFLICT {conflict_sql} DO UPDATE SET {update_str}"
                    f" RETURNING *"
                )
        return sql, params

    def _build_update(self) -> tuple[str, list[Any]]:
        if not self._update_data:
            return f"SELECT * FROM {_quote_table_name(self._table)} WHERE false", []
        params: list[Any] = []
        set_clauses = []
        for col, val in self._update_data.items():
            set_clauses.append(f"{_quote_identifier(col)} = %s")
            params.append(_adapt_param(val))
        sql = f"UPDATE {_quote_table_name(self._table)} SET {', '.join(set_clauses)}"
        sql += self._build_where(params)
        sql += " RETURNING *"
        return sql, params

    def _build_delete(self) -> tuple[str, list[Any]]:
        params: list[Any] = []
        sql = f"DELETE FROM {_quote_table_name(self._table)}"
        sql += self._build_where(params)
        sql += " RETURNING *"
        return sql, params

    def _execute_on_conn(
        self,
        conn: psycopg.Connection[dict[str, Any]],
        sql: str,
        params: list[Any],
    ) -> tuple[list[dict[str, Any]], int | None]:
        """Run the query on *conn* and return (rows, count)."""
        count: int | None = None
        with conn.cursor() as cur:
            cur.execute(sql, params)

            if self._count_mode == "exact" and self._op == _Op.SELECT:
                count_sql, count_params = self._build_count_query()
                with conn.cursor() as count_cur:
                    count_cur.execute(count_sql, count_params)
                    row = count_cur.fetchone()
                    count = row["count"] if row else 0

            rows = cur.fetchall() if cur.description else []
        return rows, count

    def execute(self) -> QueryResult:
        if self._op == _Op.SELECT:
            sql, params = self._build_select()
        elif self._op == _Op.INSERT:
            sql, params = self._build_insert()
        elif self._op == _Op.UPSERT:
            sql, params = self._build_upsert()
        elif self._op == _Op.UPDATE:
            sql, params = self._build_update()
        elif self._op == _Op.DELETE:
            sql, params = self._build_delete()
        else:
            raise ValueError(f"Unknown operation: {self._op}")

        if self._conn is not None:
            # Running inside a transaction, reuse the provided connection.
            rows, count = self._execute_on_conn(self._conn, sql, params)
        else:
            # Standalone query, check out a connection from the pool.
            pool = _get_pool(self._conninfo)
            _ensure_pool_open(pool)
            with pool.connection() as conn:
                conn.autocommit = True
                rows, count = self._execute_on_conn(conn, sql, params)

        data: list[dict[str, Any]] | dict[str, Any] | None = rows

        if self._single:
            if not rows:
                raise PostgrestSingleError("Row not found")
            data = rows[0]
        elif self._maybe_single:
            data = rows[0] if rows else None

        return QueryResult(data=data, count=count)

    def _build_count_query(self) -> tuple[str, list[Any]]:
        params: list[Any] = []
        sql = f"SELECT COUNT(*) as count FROM {_quote_table_name(self._table)}"
        sql += self._build_where(params)
        return sql, params


class PostgrestSingleError(Exception):
    """Raised when .single() finds no row."""


class PgNeonDB:
    """Drop-in replacement for NeonDB backed by direct Postgres with pooling."""

    def __init__(self, conninfo: str) -> None:
        self._conninfo = conninfo

    def table(self, table_name: str) -> QueryBuilder:
        return QueryBuilder(table_name, self._conninfo)

    def from_(self, table_name: str) -> QueryBuilder:
        return self.table(table_name)

    @contextmanager
    def transaction(self) -> Generator[_TransactionProxy, None, None]:
        """Context manager that runs all queries on a single connection/transaction.

        Usage::

            with db.transaction() as tx:
                tx.table("users").update(...).eq("id", uid).execute()
                tx.table("credit_transactions").insert(...).execute()
            # COMMIT on normal exit, ROLLBACK on exception

        The connection is checked out from the pool and held for the
        duration of the ``with`` block. psycopg's default behaviour
        (autocommit=False) is used so the block runs in a single
        transaction that is committed on normal exit.
        """
        pool = _get_pool(self._conninfo)
        _ensure_pool_open(pool)
        with pool.connection() as conn:
            conn.autocommit = False
            try:
                proxy = _TransactionProxy(self._conninfo, conn)
                yield proxy
                conn.commit()
            except BaseException:
                conn.rollback()
                raise

    def rpc(self, fn: str, params: dict[str, Any] | None = None) -> QueryResult:
        args = params or {}
        arg_names = list(args.keys())
        placeholders = ", ".join(
            f"{_quote_identifier(name)} := %s" for name in arg_names
        )
        sql = f"SELECT * FROM {_quote_identifier(fn)}({placeholders})"
        values = [args[k] for k in arg_names]
        pool = _get_pool(self._conninfo)
        _ensure_pool_open(pool)
        with pool.connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql, values)
                rows = cur.fetchall() if cur.description else []
        return QueryResult(data=rows)

    def auth(self, token: str) -> None:
        # No-op: auth is handled at the PostgreSQL connection level (service role
        # credentials in conninfo), not via a per-request token like PostgREST.
        # This method exists only for API compatibility with the postgrest-py interface.
        return


class _TransactionProxy:
    """Proxy returned by PgNeonDB.transaction() that pins queries to one connection."""

    def __init__(
        self,
        conninfo: str,
        conn: psycopg.Connection[dict[str, Any]],
    ) -> None:
        self._conninfo = conninfo
        self._conn = conn

    def table(self, table_name: str) -> QueryBuilder:
        return QueryBuilder(table_name, self._conninfo, conn=self._conn)

    def from_(self, table_name: str) -> QueryBuilder:
        return self.table(table_name)
