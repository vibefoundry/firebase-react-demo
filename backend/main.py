"""
FastAPI backend for VIP Sales Data preprocessing.

Data file: ../public/sales_data/data.xlsx (sheet: "VIP")

Run with:
    uvicorn main:app --reload --port 8000

The Vite frontend proxies /api/* to this server.
"""

from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VIP Sales API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "sales_data"


def load_data(filename: str = "data.xlsx") -> pd.DataFrame:
    """Load an XLSX file from sales_data and return a DataFrame with cleaned types."""
    df = pd.read_excel(DATA_DIR / filename, engine="openpyxl")
    # Convert Excel serial dates to proper datetime
    for col in df.columns:
        if "date" in col.lower():
            df[col] = pd.to_datetime(df[col], unit="D", origin="1899-12-30", errors="coerce")
    # Ensure Zip Code is a string (preserve leading zeros)
    if "Zip Code" in df.columns:
        df["Zip Code"] = df["Zip Code"].astype(str).str.zfill(5)
    return df


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/files")
def list_files():
    """Return a list of .xlsx files in the sales_data directory."""
    return [f.name for f in sorted(DATA_DIR.glob("*.xlsx"))]


@app.get("/api/data")
def get_data(file: str = "data.xlsx"):
    """Return sales data as JSON. Pass ?file=other.xlsx to load a different file."""
    df = load_data(file)
    return df.to_dict(orient="records")


# ----- Add your endpoints below -----
