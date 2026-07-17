from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from .database import init_db, create_session, get_session, get_connection
from .database import init_db, create_session, get_session, update_session, get_connection
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import pandas as pd
import numpy as np
import json
import os
from scipy import stats as scipy_stats

from .database import init_db, create_session, get_session

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "data")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

init_db()


@app.post("/upload-data/")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        df = pd.read_csv(file_path, parse_dates=False)

    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The CSV file is empty")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Could not parse the CSV file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    # ---- Basic counts ----
    n_rows = len(df)
    n_features = len(df.columns)

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    # ---- Time column detection ----
    time_cols = []
    for col in df.columns:
        if any(keyword in col.lower() for keyword in ["time", "date", "timestamp", "datetime"]):
            time_cols.append(col)

    # ---- Per-column stats ----
    column_stats = []
    for col in df.columns:
        missing_count = int(df[col].isnull().sum())
        missing_pct = round(missing_count / n_rows * 100, 1)

        if col in numeric_cols:
            col_min = round(float(df[col].min()), 4) if not df[col].isnull().all() else None
            col_max = round(float(df[col].max()), 4) if not df[col].isnull().all() else None
            col_avg = round(float(df[col].mean()), 4) if not df[col].isnull().all() else None
        else:
            col_min = col_max = col_avg = None

        column_stats.append({
            "name": col,
            "dtype": str(df[col].dtype),
            "min": col_min,
            "max": col_max,
            "avg": col_avg,
            "missing": missing_count,
            "missing_pct": missing_pct,
        })

    # ---- Special attributes ----
    pseudo_categorical = []
    for col in numeric_cols:
        unique_vals = df[col].nunique()
        if unique_vals <= 10:
            pseudo_categorical.append(col)

    high_missing = [
        col for col in df.columns
        if df[col].isnull().sum() / n_rows > 0.5
    ]

    return {
        "filename": file.filename,
        "n_rows": n_rows,
        "n_features": n_features,
        "n_numeric": len(numeric_cols),
        "n_categorical": len(categorical_cols),
        "n_time": len(time_cols),
        "time_cols": time_cols,
        "pseudo_categorical": pseudo_categorical,
        "high_missing": high_missing,
        "column_stats": column_stats,
    }


@app.post("/create-session/")
async def create_new_session(
    filename: str = Body(...),
    columns: list = Body(...),
    rows: int = Body(...),
    project_id: str = Body(default=""),
    target_variable: str = Body(default=""),
):
    session_id = create_session(
        filename=filename,
        columns=columns,
        rows=rows,
        project_id=project_id,
        target_variable=target_variable,
    )
    return {"session_id": session_id}

@app.get("/get-session-by-project-id/{project_id}")
async def get_session_by_project_id(project_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE project_id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="No session found with that project ID")

    # Load final CSV if it exists
    column_stats = []
    final_filename = row["final_filename"]
    if final_filename:
        final_path = os.path.join(UPLOAD_FOLDER, final_filename)
        if os.path.exists(final_path):
            df = pd.read_csv(final_path, parse_dates=False)
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            for col in df.columns:
                missing_count = int(df[col].isnull().sum())
                missing_pct = round(missing_count / len(df) * 100, 1)
                col_min = round(float(df[col].min()), 4) if col in numeric_cols and not df[col].isnull().all() else None
                col_max = round(float(df[col].max()), 4) if col in numeric_cols and not df[col].isnull().all() else None
                col_avg = round(float(df[col].mean()), 4) if col in numeric_cols and not df[col].isnull().all() else None
                column_stats.append({
                    "name": col,
                    "dtype": str(df[col].dtype),
                    "min": col_min,
                    "max": col_max,
                    "avg": col_avg,
                    "missing": missing_count,
                    "missing_pct": missing_pct,
                })

    return {
        "session_id": row["session_id"],
        "filename": row["filename"],
        "final_filename": final_filename,
        "columns": row["columns"].split(",") if row["columns"] else [],
        "rows": row["rows"],
        "project_id": row["project_id"],
        "target_variable": row["target_variable"],
        "current_step": row["current_step"],
        "column_types": json.loads(row["column_types"]) if row["column_types"] else {},
        "column_stats": column_stats,
    }

@app.post("/save-session/")
async def save_session(
    session_id: str = Body(...),
    current_step: str = Body(...),
    column_types: dict = Body(...),
    columns_final: list = Body(...),
    project_id: str = Body(...),
):
    # Load original CSV
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    original_path = os.path.join(UPLOAD_FOLDER, session["filename"])
    df = pd.read_csv(original_path, parse_dates=False)

    # Apply column deletions (keep only columns in columns_final)
    df = df[[c for c in df.columns if c in columns_final]]

    # Apply renames — column_types keys are final names, we need original→final mapping
    # columns_final is ordered list of final column names matching original order
    # Save final dataframe
    final_filename = f"{project_id}_final.csv"
    final_path = os.path.join(UPLOAD_FOLDER, final_filename)
    df.to_csv(final_path, index=False)

    # Save to DB
    update_session(
        session_id,
        current_step=current_step,
        column_types=json.dumps(column_types),
        final_filename=final_filename,
        updated_at=datetime.utcnow().isoformat(),
    )

    return {"status": "saved", "final_filename": final_filename}


@app.post("/visualize-feature/")
async def visualize_feature(
    session_id: str = Body(...),
    feature: str = Body(...),
    second_feature: str = Body(...),
    feature_type: str = Body(default="numeric"),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Load final CSV if available, otherwise fall back to original
    final_filename = session.get("final_filename")
    if final_filename:
        file_path = os.path.join(UPLOAD_FOLDER, final_filename)
        if not os.path.exists(file_path):
            file_path = os.path.join(UPLOAD_FOLDER, session["filename"])
    else:
        file_path = os.path.join(UPLOAD_FOLDER, session["filename"])

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Data file not found")

    df = pd.read_csv(file_path, parse_dates=False)

    # Validate columns
    if feature not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{feature}' not found")
    if second_feature not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{second_feature}' not found")

    # Detect time column (first one found)
    time_col = None
    for col in df.columns:
        if any(kw in col.lower() for kw in ["time", "date", "timestamp", "datetime"]):
            time_col = col
            break

    # Sample for performance (max 2000 rows)
    MAX_ROWS = 2000
    if len(df) > MAX_ROWS:
        df = df.sample(n=MAX_ROWS, random_state=42).reset_index(drop=True)

    # ---- Numeric mode ----
    if feature_type == "numeric":
        col_a = pd.to_numeric(df[feature], errors="coerce").dropna()
        col_b = pd.to_numeric(df[second_feature], errors="coerce").dropna()

        # Histogram bins (use numpy for consistent binning)
        counts, bin_edges = np.histogram(col_a, bins=30)
        bin_centers = ((bin_edges[:-1] + bin_edges[1:]) / 2).round(4).tolist()

        # Descriptive stats
        stats_result = {
            "min": round(float(col_a.min()), 4),
            "max": round(float(col_a.max()), 4),
            "mean": round(float(col_a.mean()), 4),
            "median": round(float(col_a.median()), 4),
            "skewness": round(float(scipy_stats.skew(col_a)), 4),
        }

        # Align feature + second_feature on shared valid index
        pair_df = df[[feature, second_feature]].apply(pd.to_numeric, errors="coerce").dropna()
        xa = pair_df[feature].tolist()
        ya = pair_df[second_feature].tolist()

        # Dual series — use time column as x if present, otherwise row index
        if time_col and time_col in df.columns:
            x_dual_raw = df[time_col].astype(str).tolist()
        else:
            x_dual_raw = list(range(len(df)))

        y1_dual = pd.to_numeric(df[feature], errors="coerce").tolist()
        y2_dual = pd.to_numeric(df[second_feature], errors="coerce").tolist()

        # Pearson & Spearman
        if len(xa) >= 2:
            pearson_r, _ = scipy_stats.pearsonr(xa, ya)
            spearman_r, _ = scipy_stats.spearmanr(xa, ya)
            pearson_val = round(float(pearson_r), 4)
            spearman_val = round(float(spearman_r), 4)
        else:
            pearson_val = spearman_val = None

        return {
            "histogram": {
                "x": bin_centers,
                "y": counts.tolist(),
            },
            "stats": stats_result,
            "time_col": time_col,
            "scatter": {
                "x": xa,
                "y": ya,
            },
            "dual_series": {
                "x": x_dual_raw,
                "y1": y1_dual,
                "y2": y2_dual,
            },
            "pearson": pearson_val,
            "spearman": spearman_val,
        }

    raise HTTPException(status_code=400, detail=f"Feature type '{feature_type}' not supported yet")