from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from models import ExpenseCreate, ExpenseUpdate, CategoryCreate, CategoryUpdate
from database import get_supabase
import pandas as pd
import io
from datetime import datetime, date

app = FastAPI(title="Finance Dashboard API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = get_supabase()


@app.get("/")
def read_root():
    return {"message": "Finance Dashboard API", "status": "running"}


# ==================== EXPENSES ====================


@app.post("/expenses")
async def create_expense(expense: ExpenseCreate):
    """Create a new expense"""
    try:
        final_category = expense.category if expense.category else "Uncategorized"

        # Auto-create category if it doesn't exist
        if final_category and final_category != "Uncategorized":
            try:
                # Checking if category exist
                existing = (
                    supabase.table("categories")
                    .select("*")
                    .eq("user_id", expense.user_id)
                    .eq("name", final_category)
                    .execute()
                )

                # Create if doesn't exist
                if not existing.data or len(existing.data) == 0:
                    supabase.table("categories").insert(
                        {"user_id": expense.user_id, "name": final_category}
                    ).execute()
            except Exception as cat_error:
                print(f"Note: Category creation skipped - {cat_error}")

        # Convert date to string properly
        if isinstance(expense.date, str):
            date_str = expense.date
        else:
            date_str = expense.date.isoformat()

        # Insert expense
        data = {
            "user_id": expense.user_id,
            "title": expense.title,
            "amount": float(expense.amount),
            "category": final_category,
            "date": date_str,
        }

        response = supabase.table("expenses").insert(data).execute()

        return {"success": True, "data": response.data[0]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/expenses/{user_id}")
async def get_expenses(user_id: str, limit: int = 100):
    """Get all expenses for a user"""
    try:
        response = (
            supabase.table("expenses")
            .select("*")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(limit)
            .execute()
        )

        return {"success": True, "data": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, expense: ExpenseUpdate):
    """Update an expense"""
    try:
        update_data = {k: v for k, v in expense.dict().items() if v is not None}

        # Convert date to string if present
        if "date" in update_data:
            if isinstance(update_data["date"], str):
                update_data["date"] = update_data["date"]
            else:
                update_data["date"] = update_data["date"].isoformat()

        # Auto-create category if it doesn't exist and is being changed
        if "category" in update_data and update_data["category"]:
            try:
                # Get user_id fom the expense being updated
                expense_data = (
                    supabase.table("expenses")
                    .select("user_id")
                    .eq("id", expense_id)
                    .execute()
                )
                if expense_data.data and len(expense_data.data) > 0:
                    user_id = expense_data.data[0]["user_id"]

                    # Check if category exists
                    existing = (
                        supabase.table("categories")
                        .select("*")
                        .eq("user_id", user_id)
                        .eq("name", update_data["category"])
                        .execute()
                    )

                    if not existing.data or len(existing.data) == 0:
                        supabase.table("categories").insert(
                            {"user_id": user_id, "name": update_data["category"]}
                        ).execute()
            except Exception as cat_error:
                print(f"Note: Category creation skipped - {cat_error}")

        response = (
            supabase.table("expenses")
            .update(update_data)
            .eq("id", expense_id)
            .execute()
        )

        return {"success": True, "data": response.data[0] if response.data else None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    """Delete an expense"""
    try:
        response = supabase.table("expenses").delete().eq("id", expense_id).execute()

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CATEGORIES ====================


@app.post("/categories")
async def create_category(category: CategoryCreate):
    """Create a new category"""
    try:
        data = {"user_id": category.user_id, "name": category.name}

        response = supabase.table("categories").insert(data).execute()
        return {"success": True, "data": response.data[0]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/categories/{user_id}")
async def get_categories(user_id: str):
    """Get all categories for a user"""
    try:
        response = (
            supabase.table("categories")
            .select("*")
            .eq("user_id", user_id)
            .order("name")
            .execute()
        )

        return {"success": True, "data": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/categories/{category_id}")
async def update_category(category_id: str, update: CategoryUpdate):
    """Update a category name"""
    try:
        response = (
            supabase.table("categories")
            .update({"name": update.name})
            .eq("id", category_id)
            .execute()
        )

        return {"success": True, "data": response.data[0] if response.data else None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    try:
        response = supabase.table("categories").delete().eq("id", category_id).execute()

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ANALYTICS ====================


@app.get("/analytics/monthly/{user_id}")
async def get_monthly_analytics(user_id: str, start_date: str | None = None):
    """Get monthly spending analytics"""
    try:
        query = supabase.table("expenses").select("*").eq("user_id", user_id)

        if start_date:
            query = query.gte("date", start_date)

        response = query.execute()
        expenses = response.data

        if not expenses:
            return {"success": True, "data": []}

        # Group by month
        df = pd.DataFrame(expenses)
        df["date"] = pd.to_datetime(df["date"])
        df["month"] = df["date"].dt.to_period("M").astype(str)

        monthly_data = df.groupby("month").agg({"amount": "sum"}).reset_index()

        monthly_data["amount"] = monthly_data["amount"].astype(float)

        return {"success": True, "data": monthly_data.to_dict("records")}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics/category/{user_id}")
async def get_category_analytics(user_id: str, month: str | None = None):
    """Get spending by category"""
    try:
        query = supabase.table("expenses").select("*").eq("user_id", user_id)

        if month is None:
            raise HTTPException(status_code=400, detail="Month parameter is required")

        # Get last day of month
        try:
            year, month_num = map(int, month.split("-"))
        except Exception:
            raise HTTPException(
                status_code=400, detail="Invalid month format. Use YYYY-MM"
            )

        start_date = f"{year}-{month_num:02d}-01"
        if month_num == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month_num + 1:02d}-01"

        query = query.gte("date", start_date).lt("date", end_date)

        response = query.execute()
        expenses = response.data

        if not expenses:
            return {"success": True, "data": []}

        # Group by category
        df = pd.DataFrame(expenses)
        category_data = df.groupby("category").agg({"amount": "sum"}).reset_index()

        category_data["amount"] = category_data["amount"].astype(float)
        category_data = category_data.sort_values("amount", ascending=False)

        return {"success": True, "data": category_data.to_dict("records")}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics/category-all/{user_id}")
async def get_all_time_category_analytics(user_id: str, start_date: str | None = None):
    """Get spending by category for ALL time (no month filter)"""
    try:
        query = supabase.table("expenses").select("*").eq("user_id", user_id)

        if start_date:
            query = query.gte("date", start_date)

        response = query.execute()
        expenses = response.data

        if not expenses:
            return {"success": True, "data": []}

        df = pd.DataFrame(expenses)
        category_data = df.groupby("category").agg({"amount": "sum"}).reset_index()

        category_data["amount"] = category_data["amount"].astype(float)
        category_data = category_data.sort_values("amount", ascending=False)

        return {"success": True, "data": category_data.to_dict("records")}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CSV UPLOAD ====================


@app.post("/upload/csv/{user_id}")
async def upload_csv(user_id: str, file: UploadFile = File(...)):
    """
    Upload CSV file with expenses
    Expected columns: title, amount, date
    Optional: category
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))

        # Validate required columns
        required_cols = ["title", "amount", "date"]
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(
                status_code=400, detail=f"CSV must contain columns: {required_cols}"
            )

        # Process each row
        expenses_added = []
        errors = []

        for idx, row in df.iterrows():
            try:
                # Parse date
                expense_date = pd.to_datetime(row["date"]).date()

                # Get or suggest category
                category = row.get("category", None)
                if pd.isna(category) or not category:
                    category = "Uncategorized"
                else:
                    category = str(category).strip()

                # Auto-create category if needed
                if category and category != "Uncategorized":
                    try:
                        existing = (
                            supabase.table("categories")
                            .select("*")
                            .eq("user_id", user_id)
                            .eq("name", category)
                            .execute()
                        )

                        if not existing.data or len(existing.data) == 0:
                            supabase.table("categories").insert(
                                {"user_id": user_id, "name": category}
                            ).execute()
                    except:
                        pass

                # Insert
                data = {
                    "user_id": user_id,
                    "title": row["title"],
                    "amount": float(row["amount"]),
                    "category": category,
                    "date": expense_date.isoformat(),
                }

                response = supabase.table("expenses").insert(data).execute()
                expenses_added.append(response.data[0])

            except Exception as e:
                row_number = int(idx) + 1 if isinstance(idx, (int, float)) else idx
                errors.append(f"Row {row_number}: {str(e)}")

        return {
            "success": True,
            "expenses_added": len(expenses_added),
            "errors": errors,
            "data": expenses_added,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
