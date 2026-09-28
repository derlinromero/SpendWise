"""Application-owned PostgreSQL pool and transaction-scoped user context."""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from backend.auth import get_current_user


async def validate_database_role(connection: AsyncConnection) -> None:
    """Refuse credentials that can bypass the application's RLS policies."""
    cursor = await connection.execute("""
        SELECT r.rolsuper, r.rolbypassrls, r.rolcreaterole,
               pg_has_role(current_user, 'spendwise_app', 'USAGE') AS app_member,
               row_security_active('public.expenses') AS expenses_rls,
               row_security_active('public.categories') AS categories_rls,
               EXISTS (
                   SELECT FROM pg_class c
                   WHERE c.oid IN ('public.expenses'::regclass,
                                   'public.categories'::regclass)
                     AND pg_has_role(current_user, c.relowner, 'USAGE')
               ) AS owns_tables
        FROM pg_roles r WHERE r.rolname = current_user
        """)
    role = await cursor.fetchone()
    if (
        not role
        or role["rolsuper"]
        or role["rolbypassrls"]
        or role["rolcreaterole"]
        or role["owns_tables"]
        or not role["app_member"]
        or not role["expenses_rls"]
        or not role["categories_rls"]
    ):
        raise RuntimeError(
            "DATABASE_URL must use a restricted login inheriting spendwise_app, "
            "with RLS enabled and no admin privileges or table ownership. "
            "See backend/sql/README.md."
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    load_dotenv(Path(__file__).with_name(".env"))
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Set DATABASE_URL in backend/.env before starting the API.")

    pool = AsyncConnectionPool(
        database_url,
        open=False,
        min_size=0,
        max_size=5,
        max_idle=60,
        timeout=30,
        check=AsyncConnectionPool.check_connection,
        kwargs={
            "row_factory": dict_row,
            "autocommit": True,
            "connect_timeout": 10,
            "prepare_threshold": None,
        },
    )
    await pool.open()
    try:
        async with pool.connection() as connection:
            await validate_database_role(connection)
        app.state.database_pool = pool
        yield
    finally:
        await pool.close()


async def get_connection(
    request: Request, user_id: Annotated[str, Depends(get_current_user)]
) -> AsyncIterator[AsyncConnection]:
    async with request.app.state.database_pool.connection() as connection:
        async with connection.transaction():
            await connection.execute(
                "SELECT set_config('app.user_id', %s, true)", (user_id,)
            )
            yield connection
