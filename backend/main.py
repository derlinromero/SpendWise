import logging
from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg import AsyncConnection, DataError, Error, IntegrityError, OperationalError
from psycopg.errors import UniqueViolation
from psycopg_pool import PoolTimeout

from backend.auth import get_current_user
from backend.database import get_connection, lifespan
from backend.models import (
    CategoryCreate,
    CategoryRecord,
    CategoryTotal,
    CategoryUpdate,
    DailyTotal,
    Deleted,
    ExpenseCreate,
    ExpensePage,
    ExpenseRecord,
    ExpenseUpdate,
    MonthChange,
    MonthlyTotal,
    Success,
)
from backend.repository import SpendWiseRepository

logger = logging.getLogger(__name__)
app = FastAPI(title="SpendWise API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Keep development behavior; restrict before deployment.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_repository(
    connection: Annotated[AsyncConnection, Depends(get_connection, scope="function")],
    user_id: Annotated[str, Depends(get_current_user)],
) -> SpendWiseRepository:
    return SpendWiseRepository(connection, user_id)


Repository = Annotated[SpendWiseRepository, Depends(get_repository)]


@app.exception_handler(Error)
@app.exception_handler(PoolTimeout)
async def database_error_handler(request: Request, error: Exception) -> JSONResponse:
    if isinstance(error, UniqueViolation):
        status, message = 409, "A category with that name already exists."
    elif isinstance(error, (DataError, IntegrityError)):
        status, message = 400, "The supplied data could not be saved."
    elif isinstance(error, (OperationalError, PoolTimeout)):
        status, message = 503, "Database temporarily unavailable. Please try again."
    else:
        status, message = 500, "Unable to complete the database operation."
    # SQL exceptions can include values/credentials: log their type only.
    logger.warning("Database operation failed (%s)", type(error).__name__)
    return JSONResponse(status_code=status, content={"detail": message})


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
    logger.error("Request failed (%s)", type(error).__name__)
    return JSONResponse(
        status_code=500,
        content={"detail": "Unable to complete the request. Please try again."},
    )


@app.get("/")
def read_root():
    return {"message": "SpendWise API", "status": "running"}


@app.post("/expenses", response_model=Success[ExpenseRecord])
async def create_expense(expense: ExpenseCreate, repository: Repository):
    return {"success": True, "data": await repository.create_expense(expense)}


@app.get("/expenses", response_model=ExpensePage)
async def get_expenses(repository: Repository, page: int = 1, limit: int = 20):
    return await repository.list_expenses(page, limit)


@app.put("/expenses/{expense_id}", response_model=Success[ExpenseRecord])
async def update_expense(
    expense_id: UUID, expense: ExpenseUpdate, repository: Repository
):
    return {
        "success": True,
        "data": await repository.update_expense(expense_id, expense),
    }


@app.delete("/expenses/{expense_id}", response_model=Deleted)
async def delete_expense(expense_id: UUID, repository: Repository):
    await repository.delete_expense(expense_id)
    return {"success": True}


@app.post("/categories", response_model=Success[CategoryRecord])
async def create_category(category: CategoryCreate, repository: Repository):
    return {"success": True, "data": await repository.create_category(category.name)}


@app.get("/categories", response_model=Success[list[CategoryRecord]])
async def get_categories(repository: Repository):
    return {"success": True, "data": await repository.list_categories()}


@app.put("/categories/{category_id}", response_model=Success[CategoryRecord])
async def update_category(
    category_id: UUID, update: CategoryUpdate, repository: Repository
):
    return {
        "success": True,
        "data": await repository.update_category(category_id, update.name),
    }


@app.delete("/categories/{category_id}", response_model=Deleted)
async def delete_category(category_id: UUID, repository: Repository):
    await repository.delete_category(category_id)
    return {"success": True}


@app.get("/analytics/daily", response_model=Success[list[DailyTotal]])
async def get_daily_analytics(
    repository: Repository, months: Annotated[int, Query(ge=1, le=1200)] = 6
):
    return {"success": True, "data": await repository.analytics("daily", months)}


@app.get("/analytics/mom", response_model=Success[list[MonthChange]])
async def get_mom_analytics(
    repository: Repository, months: Annotated[int, Query(ge=1, le=1200)] = 12
):
    return {"success": True, "data": await repository.analytics("mom", months)}


@app.get("/analytics/monthly", response_model=Success[list[MonthlyTotal]])
async def get_monthly_analytics(repository: Repository, start_date: date | None = None):
    return {"success": True, "data": await repository.analytics("monthly", start_date)}


@app.get("/analytics/category", response_model=Success[list[CategoryTotal]])
async def get_category_analytics(
    repository: Repository,
    month: Annotated[str | None, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")] = None,
):
    if month is None:
        raise HTTPException(status_code=400, detail="Month parameter is required")
    return {"success": True, "data": await repository.analytics("category", month)}


@app.get("/analytics/category-all", response_model=Success[list[CategoryTotal]])
async def get_all_time_category_analytics(
    repository: Repository, start_date: date | None = None
):
    return {
        "success": True,
        "data": await repository.analytics("category-all", start_date),
    }
