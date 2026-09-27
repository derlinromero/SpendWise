from datetime import date as Date
from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExpenseFields(BaseModel):
    @field_validator("date", mode="before", check_fields=False)
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            try:
                return Date.fromisoformat(value)
            except ValueError:
                try:
                    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
                except ValueError:
                    raise ValueError("Date must be in YYYY-MM-DD format") from None
        return value

    @field_validator("title", mode="before", check_fields=False)
    @classmethod
    def strip_title(cls, value):
        return value.strip() if isinstance(value, str) else value


class ExpenseCreate(ExpenseFields):
    title: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0, le=99999999.99, allow_inf_nan=False)
    category: str | None = Field(default=None, max_length=100)
    date: Date


class ExpenseUpdate(ExpenseFields):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    amount: float | None = Field(
        default=None, gt=0, le=99999999.99, allow_inf_nan=False
    )
    category: str | None = Field(default=None, max_length=100)
    date: Date | None = None


class CategoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=100)


class CategoryUpdate(CategoryCreate):
    pass


class CategoryRecord(BaseModel):
    id: UUID
    user_id: str
    name: str
    created_at: datetime | None


class ExpenseRecord(BaseModel):
    id: UUID
    user_id: str
    title: str
    amount: float
    category: str | None
    date: Date
    created_at: datetime | None
    updated_at: datetime | None


Data = TypeVar("Data")


class Success(BaseModel, Generic[Data]):
    success: bool = True
    data: Data


class Deleted(BaseModel):
    success: bool = True


class Pagination(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int


class ExpensePage(Success[list[ExpenseRecord]]):
    pagination: Pagination


class CategoryTotal(BaseModel):
    category: str | None
    amount: float


class MonthlyTotal(BaseModel):
    month: str
    amount: float


class MonthChange(MonthlyTotal):
    pct_change: float | None


class DailyTotal(BaseModel):
    year_month: str
    day: int
    amount: float
