# SpendWise - Smart Expense Tracker

A full-stack expense tracking application built with React, FastAPI, and Supabase.

## Live Demo

https://spendwise.vercel.app/

## Features

### Core Features
- **Add Expenses** - Track spending with title, amount, category, and date
- **Category Management** - Create and manage spending categories
- **Monthly Spending Limit** - Set a budget limit to visualize on charts

### Analytics & Visualization
- **Monthly Spending Trends** - Line chart showing spending over time with time range filters (1w, 1m, 3m, 6m, 1y, max)
- **Category Breakdown** - Bar chart showing spending by category with time range filters
- **Daily Spending Pattern** - Heatmap visualization showing spending intensity by day of month

### Data Management
- **Export to Excel** - Download all expenses as an Excel (.xlsx) file

## Tech Stack

- **Frontend**: React + Tailwind CSS + Recharts
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (Frontend) + Render (Backend)

## Project Structure

```
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── App.jsx      # Main app component
│   └── public/         # Static assets
│
├── backend/            # FastAPI backend
│   ├── main.py        # API endpoints
│   ├── models.py      # Pydantic models
│   └── database.py   # Supabase connection
```