"""
FastAPI backend for VIP Sales Data.

Loads XLSX/CSV files with polars, caches DataFrames in memory,
serves paginated + filtered data with cascading filter support.

Run with:
    uvicorn main:app --reload --port 8000

The Vite frontend proxies /api/* to this server.
"""

import json
from pathlib import Path
from typing import Optional

import polars as pl
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VIP Sales API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "sales_data"

# ---------------------------------------------------------------------------
# Caching: { filename: (mtime, DataFrame) }
# ---------------------------------------------------------------------------
_cache: dict[str, tuple[float, pl.DataFrame]] = {}


def get_dataframe(filename: str) -> pl.DataFrame:
    """Load a file into a polars DataFrame with mtime-based caching."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    if not filepath.resolve().is_relative_to(DATA_DIR.resolve()):
        raise HTTPException(status_code=400, detail="Invalid filename")

    mtime = filepath.stat().st_mtime
    if filename in _cache and _cache[filename][0] == mtime:
        return _cache[filename][1]

    # Load
    if filepath.suffix.lower() == ".csv":
        df = pl.read_csv(filepath, infer_schema_length=10000)
    else:
        df = pl.read_excel(filepath, engine="openpyxl")

    # Convert Excel serial date columns to actual dates
    for col in df.columns:
        if "date" in col.lower():
            dtype = df[col].dtype
            if dtype in (pl.Int64, pl.Float64, pl.Int32, pl.Float32):
                df = df.with_columns(
                    (
                        pl.lit("1899-12-30").str.to_date()
                        + pl.duration(days=pl.col(col).cast(pl.Int64))
                    ).alias(col)
                )

    # Ensure Zip Code is a zero-padded string
    if "Zip Code" in df.columns:
        df = df.with_columns(
            pl.col("Zip Code").cast(pl.Utf8).str.zfill(5).alias("Zip Code")
        )

    _cache[filename] = (mtime, df)
    return df


# ---------------------------------------------------------------------------
# Filter logic
# ---------------------------------------------------------------------------
def apply_filters(
    df: pl.DataFrame,
    filters: dict,
    exclude_column: Optional[str] = None,
) -> pl.DataFrame:
    """
    Apply filters to a DataFrame.

    Filter format:
        {"col": ["val1", "val2"]}          — categorical (list of allowed values)
        {"col": {"from": "...", "to": "..."}} — date/range

    exclude_column: skip that column's filter (for cascading unique values).
    """
    for col, fval in filters.items():
        if col == exclude_column or col not in df.columns:
            continue

        if isinstance(fval, dict):
            # Date / range filter
            from_val = fval.get("from")
            to_val = fval.get("to")
            if from_val:
                if df[col].dtype == pl.Date:
                    df = df.filter(pl.col(col) >= pl.lit(from_val).str.to_date())
                else:
                    df = df.filter(pl.col(col).cast(pl.Utf8) >= from_val)
            if to_val:
                if df[col].dtype == pl.Date:
                    df = df.filter(pl.col(col) <= pl.lit(to_val).str.to_date())
                else:
                    df = df.filter(pl.col(col).cast(pl.Utf8) <= to_val)
        elif isinstance(fval, list) and len(fval) > 0:
            df = df.filter(pl.col(col).cast(pl.Utf8).is_in(fval))

    return df


def _col_type(dtype: pl.DataType) -> str:
    """Map a polars dtype to a simple frontend type string."""
    if dtype in (pl.Date, pl.Datetime):
        return "date"
    if dtype in (
        pl.Int8, pl.Int16, pl.Int32, pl.Int64,
        pl.UInt8, pl.UInt16, pl.UInt32, pl.UInt64,
        pl.Float32, pl.Float64,
    ):
        return "number"
    return "string"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/files")
def list_files():
    """List data files available in sales_data/."""
    return sorted(
        f.name
        for f in DATA_DIR.iterdir()
        if f.suffix.lower() in (".xlsx", ".xls", ".csv")
    )


@app.get("/api/schema")
def get_schema(file: str = "data.xlsx"):
    """Return column names, types, and total row count for a file."""
    df = get_dataframe(file)
    columns = [
        {"name": c, "type": _col_type(df[c].dtype)}
        for c in df.columns
    ]
    return {"file": file, "row_count": len(df), "columns": columns}


@app.get("/api/values/{column}")
def get_values(column: str, file: str = "data.xlsx", filters: str = "{}"):
    """
    Unique values for a column, with cascading filter support.

    All active filters are applied EXCEPT the requested column's filter,
    so the dropdown shows values available given the other selections.
    """
    df = get_dataframe(file)
    if column not in df.columns:
        raise HTTPException(status_code=404, detail=f"Column not found: {column}")

    filter_dict = json.loads(filters)
    filtered = apply_filters(df, filter_dict, exclude_column=column)

    values = (
        filtered
        .select(pl.col(column).cast(pl.Utf8))
        .drop_nulls()
        .unique()
        .sort(column)
        .to_series()
        .to_list()
    )
    return {"column": column, "values": values}


@app.get("/api/data")
def get_data(
    file: str = "data.xlsx",
    filters: str = "{}",
    offset: int = 0,
    limit: int = 500,
    col_limit: int = 0,
):
    """Return paginated, filtered data rows."""
    df = get_dataframe(file)
    filtered = apply_filters(df, json.loads(filters))
    page = filtered.slice(offset, limit)

    col_total = len(page.columns)
    if col_limit > 0:
        page = page.select(page.columns[:col_limit])

    # Serialize — dates become ISO strings
    rows = page.to_dicts()
    for row in rows:
        for k, v in row.items():
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
    return {"rows": rows, "offset": offset, "limit": limit, "col_total": col_total}


@app.get("/api/count")
def get_count(file: str = "data.xlsx", filters: str = "{}"):
    """Total row count after applying filters."""
    df = get_dataframe(file)
    filtered = apply_filters(df, json.loads(filters))
    return {"total": len(filtered)}
