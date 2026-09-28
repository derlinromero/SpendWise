"""Parameterized queries for SpendWise, executed inside the user's transaction."""

from datetime import date
from uuid import UUID

from fastapi import HTTPException
from psycopg import AsyncConnection

from backend.models import ExpenseCreate, ExpenseUpdate

ANALYTICS_QUERIES = {
    "daily": "SELECT * FROM public.get_daily_analytics(%s::text, %s::integer)",
    "mom": "SELECT * FROM public.get_mom_analytics(%s::text, %s::integer)",
    "monthly": "SELECT * FROM public.get_monthly_analytics(%s::text, %s::date)",
    "category": "SELECT * FROM public.get_category_analytics(%s::text, %s::text)",
    "category-all": (
        "SELECT * FROM public.get_all_time_category_analytics(%s::text, %s::date)"
    ),
}


class SpendWiseRepository:
    def __init__(self, connection: AsyncConnection, user_id: str):
        self.connection = connection
        self.user_id = user_id

    async def ensure_category(self, name: str | None) -> None:
        if name and name != "Uncategorized":
            await self.connection.execute(
                """
                INSERT INTO public.categories (user_id, name) VALUES (%s, %s)
                ON CONFLICT (user_id, name) DO NOTHING
                """,
                (self.user_id, name),
            )

    async def create_expense(self, expense: ExpenseCreate) -> dict:
        category = expense.category or "Uncategorized"
        await self.ensure_category(category)
        cursor = await self.connection.execute(
            """
            INSERT INTO public.expenses (user_id, title, amount, category, date)
            VALUES (%s, %s, %s, %s, %s) RETURNING *
            """,
            (
                self.user_id,
                expense.title,
                float(expense.amount),
                category,
                expense.date,
            ),
        )
        return await cursor.fetchone()

    async def list_expenses(self, page: int, limit: int) -> dict:
        page = max(page, 1)
        limit = limit if 1 <= limit <= 100 else 20
        cursor = await self.connection.execute(
            "SELECT count(*) AS total FROM public.expenses WHERE user_id = %s",
            (self.user_id,),
        )
        total = (await cursor.fetchone())["total"]
        cursor = await self.connection.execute(
            """
            SELECT * FROM public.expenses WHERE user_id = %s
            ORDER BY date DESC, id DESC LIMIT %s OFFSET %s
            """,
            (self.user_id, limit, (page - 1) * limit),
        )
        return {
            "success": True,
            "data": await cursor.fetchall(),
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit,
            },
        }

    async def update_expense(self, expense_id: UUID, expense: ExpenseUpdate) -> dict:
        cursor = await self.connection.execute(
            """
            SELECT * FROM public.expenses
            WHERE id = %s AND user_id = %s FOR UPDATE
            """,
            (expense_id, self.user_id),
        )
        existing = await cursor.fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Expense not found")
        if not expense.model_dump(exclude_none=True):
            return existing
        await self.ensure_category(expense.category)
        cursor = await self.connection.execute(
            """
            UPDATE public.expenses
            SET title = coalesce(%s, title), amount = coalesce(%s, amount),
                category = coalesce(%s, category), date = coalesce(%s, date),
                updated_at = now()
            WHERE id = %s AND user_id = %s RETURNING *
            """,
            (
                expense.title,
                float(expense.amount) if expense.amount is not None else None,
                expense.category,
                expense.date,
                expense_id,
                self.user_id,
            ),
        )
        return await cursor.fetchone()

    async def delete_expense(self, expense_id: UUID) -> None:
        cursor = await self.connection.execute(
            "DELETE FROM public.expenses WHERE id = %s AND user_id = %s RETURNING id",
            (expense_id, self.user_id),
        )
        if await cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Expense not found")

    async def create_category(self, name: str) -> dict:
        cursor = await self.connection.execute(
            "INSERT INTO public.categories (user_id, name) VALUES (%s, %s) RETURNING *",
            (self.user_id, name),
        )
        return await cursor.fetchone()

    async def list_categories(self) -> list[dict]:
        cursor = await self.connection.execute(
            "SELECT * FROM public.categories WHERE user_id = %s ORDER BY name",
            (self.user_id,),
        )
        return await cursor.fetchall()

    async def update_category(self, category_id: UUID, name: str) -> dict:
        cursor = await self.connection.execute(
            """
            UPDATE public.categories SET name = %s
            WHERE id = %s AND user_id = %s RETURNING *
            """,
            (name, category_id, self.user_id),
        )
        category = await cursor.fetchone()
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")
        return category

    async def delete_category(self, category_id: UUID) -> None:
        cursor = await self.connection.execute(
            "DELETE FROM public.categories WHERE id = %s AND user_id = %s RETURNING id",
            (category_id, self.user_id),
        )
        if await cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Category not found")

    async def analytics(
        self, name: str, argument: str | int | date | None
    ) -> list[dict]:
        cursor = await self.connection.execute(
            ANALYTICS_QUERIES[name], (self.user_id, argument)
        )
        return await cursor.fetchall()
