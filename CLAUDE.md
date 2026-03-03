# VIP Sales Data — Project Guide

> **Read this file FIRST. Do not search for data files or install packages that are already available.**

## Project Overview

A React (Vite) + FastAPI (polars) application that visualizes sales data. The backend handles all data loading, caching, filtering, and pagination. The frontend is a thin API-driven UI.

## Data Location

- **Data folder**: `public/sales_data/` — place `.xlsx` or `.csv` files here. The app auto-discovers all data files.
- **File selector**: The app has a dropdown listing all available files. Switching files resets filters and pagination.
- **Data dictionary**: See `DATA_DICTIONARY.md` for column definitions (based on `data.xlsx`).
- **Date quirk**: Date columns in XLSX files are Excel serial numbers — the backend converts them to proper dates automatically.
- **Adding new files**: Drop a `.xlsx` or `.csv` file into `public/sales_data/` and refresh — the dropdown picks it up.

## Tech Stack — Already Installed

### Frontend (do NOT reinstall these)
- **React 19** with Vite 7 — entry point: `src/main.jsx`
- Main component: `src/App.jsx` (API-driven, no client-side data processing)
- Styles: `src/App.css` (plain CSS, no Tailwind)
- SheetJS (`xlsx`) is **no longer used** — all data processing is server-side

### Backend (REQUIRED — must be running)
- **FastAPI** + **Uvicorn** with **polars** — at `backend/main.py`
- **Python packages** available via dev.nix: `polars`, `openpyxl`, `fastapi`, `uvicorn`
- Start backend: `cd backend && uvicorn main:app --reload --port 8000`
- Vite proxies `/api/*` requests to `http://localhost:8000`

### Backend API Endpoints
- `GET /api/files` — list available data files
- `GET /api/schema?file=X` — column names, types, row count
- `GET /api/values/{column}?file=X&filters={}` — unique values (cascading)
- `GET /api/data?file=X&filters={}&offset=0&limit=1000` — paginated filtered rows
- `GET /api/count?file=X&filters={}` — total filtered row count

### Key Features
- **Polars caching**: DataFrames cached in memory, invalidated on file mtime change
- **Cascading filters**: When filtering column A, column B's dropdown shows only values that exist in the filtered subset
- **Pagination**: 1,000 rows per page with Previous/Next controls
- **Smart filter buttons**: Only string/date columns get filter dropdowns (numeric columns don't)

## File Structure

```
├── public/
│   └── sales_data/
│       └── *.xlsx, *.csv         # Data files (gitignored)
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Main component (API-driven)
│   ├── App.css                   # Styles
│   └── assets/
├── backend/
│   ├── main.py                   # FastAPI + polars backend
│   └── requirements.txt          # Python dependencies
├── DATA_DICTIONARY.md            # Column definitions
├── .idx/
│   └── dev.nix                   # IDX environment config
├── vite.config.js                # Vite config with /api proxy
├── package.json
└── index.html
```

## Running the App

- **Backend** (required): `cd backend && uvicorn main:app --reload --port 8000`
- **Frontend**: `npm run dev` (auto-starts via IDX preview on port $PORT)
- Both must be running. The Vite dev server proxies `/api` to the backend.

## Do NOT

- Do NOT search the filesystem for data files — the data is in `public/sales_data/`
- Do NOT install `react`, `react-dom`, `vite` — they are already installed
- Do NOT install `polars`, `openpyxl`, `fastapi`, `uvicorn` via pip — they are provided by dev.nix
- Do NOT create a new React project or run `create-react-app` / `create-vite`
- Do NOT modify `dev.nix` unless absolutely necessary
- Do NOT use TypeScript — this project uses plain JSX
- Do NOT add Tailwind CSS — this project uses plain CSS in `App.css`
- Do NOT process data client-side — all data processing goes through the backend API

## Coding Conventions

- Functional components with hooks (`useState`, `useEffect`, `useMemo`)
- Plain CSS (no CSS modules, no styled-components)
- ES module imports (`import/export`)
- For new components, create files in `src/` (e.g., `src/Chart.jsx`)
- For backend endpoints, add routes in `backend/main.py`
- Filters are serialized as JSON: `{"col": ["val1","val2"]}` for categorical, `{"col": {"from":"...","to":"..."}}` for dates

## Common Student Tasks

1. **Add charts/visualizations** — use `recharts`, `chart.js`, or `plotly` to visualize data from `/api/data`
2. **Add a Python preprocessing endpoint** — add routes in `backend/main.py` using polars for aggregations
3. **Add map visualization** — plot retail accounts by address/city/state
4. **Add summary statistics** — counts by state, category breakdown, date range analysis via new backend endpoints
