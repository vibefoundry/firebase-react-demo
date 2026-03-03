# VIP Sales Data — Project Guide

> **Read this file FIRST. Do not search for data files or install packages that are already available.**

## Project Overview

A React (Vite) application that visualizes VIP retail sales data. Students will build data visualizations and may optionally add a FastAPI/Python backend for data preprocessing.

## Data Location

- **Data folder**: `public/sales_data/` — place `.xlsx` files here. The app auto-discovers all `.xlsx` files in this folder.
- **Default file**: `data.xlsx` (VIP sheet, 788 rows, 9 columns).
- **File selector**: The app has a dropdown that lists all `.xlsx` files in the folder. Users can switch between files and the same filtering/table logic applies to each.
- **Data dictionary**: See `DATA_DICTIONARY.md` for column definitions (based on `data.xlsx`, but the app handles any XLSX structure).
- **Date quirk**: Date columns are Excel serial numbers. Convert with `new Date((serial - 25569) * 86400000)` in JS or `pd.to_datetime(serial, unit='D', origin='1899-12-30')` in Python/pandas.
- **Zip codes** may lose leading zeros — always treat as strings.
- **Adding new files**: Just drop a `.xlsx` file into `public/sales_data/` and refresh — the dropdown will pick it up automatically.

## Tech Stack — Already Installed

### Frontend (do NOT reinstall these)
- **React 19** with Vite 7 — entry point: `src/main.jsx`
- **xlsx** (SheetJS) — already in `package.json` for reading .xlsx files
- Main component: `src/App.jsx`
- Styles: `src/App.css` (plain CSS, no Tailwind)

### Backend (scaffolded, ready to use)
- **FastAPI** + **Uvicorn** — scaffold at `backend/main.py`
- **Python packages** available via dev.nix: `pandas`, `numpy`, `openpyxl`, `fastapi`, `uvicorn`
- **requirements.txt**: `backend/requirements.txt` — run `pip install -r backend/requirements.txt` if needed
- Start backend: `cd backend && uvicorn main:app --reload --port 8000`
- Vite is pre-configured to proxy `/api/*` requests to `http://localhost:8000` (see `vite.config.js`)

## File Structure

```
├── public/
│   └── sales_data/
│       └── data.xlsx          # THE data file (gitignored)
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Main component with filters & table
│   ├── App.css                # Styles
│   └── assets/
├── backend/
│   ├── main.py                # FastAPI app scaffold
│   └── requirements.txt       # Python dependencies
├── DATA_DICTIONARY.md         # Column definitions & types
├── .idx/
│   └── dev.nix                # IDX environment config
├── vite.config.js             # Vite config with /api proxy
├── package.json
└── index.html
```

## Running the App

- **Frontend**: `npm run dev` (auto-starts via IDX preview on port $PORT)
- **Backend**: `cd backend && uvicorn main:app --reload --port 8000`
- **Both**: The Vite dev server proxies `/api` to the backend, so fetch `/api/...` from React code.

## Do NOT

- Do NOT search the filesystem for data files — the data is in `public/sales_data/`
- Do NOT install `xlsx`, `react`, `react-dom`, `vite` — they are already installed
- Do NOT install `pandas`, `numpy`, `openpyxl` via pip — they are provided by dev.nix
- Do NOT create a new React project or run `create-react-app` / `create-vite`
- Do NOT modify `dev.nix` unless absolutely necessary
- Do NOT use TypeScript — this project uses plain JSX
- Do NOT add Tailwind CSS — this project uses plain CSS in `App.css`

## Coding Conventions

- Functional components with hooks (`useState`, `useEffect`, `useMemo`)
- Plain CSS (no CSS modules, no styled-components)
- ES module imports (`import/export`)
- For new components, create files in `src/` (e.g., `src/Chart.jsx`)
- For backend endpoints, add routes in `backend/main.py`

## Common Student Tasks

1. **Add charts/visualizations** — use a library like `recharts`, `chart.js`, or `plotly` to visualize the sales data
2. **Add a Python preprocessing endpoint** — read the XLSX with pandas in `backend/main.py`, return processed JSON via `/api/...`
3. **Add map visualization** — plot retail accounts by address/city/state
4. **Add summary statistics** — counts by state, on/off premises breakdown, date range analysis
