# Industrial AI Toolkit — Project Brief

A reference document to continue building this project in a new chat session. Paste this file's content (or upload it) at the start of a new conversation so Claude has full context.

---

## Project Purpose

Build a web-based dashboard for rapid soft sensor development in industrial settings. It lets data scientists and engineers upload process data, explore it, train ML models, and visualize predictions — all in one tool.

**Soft sensors** estimate process variables that are difficult or expensive to measure directly (e.g. estimating a quality parameter from temperature, pressure, and flow readings instead of a physical analyzer).

---

## Architecture Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Frontend | Plain HTML + CSS + JS | Avoids React/Node.js learning curve; works directly in browser |
| Backend | FastAPI (Python) | Connects frontend to ML code; modern, beginner-friendly |
| ML | Scikit-learn | Model training and prediction |
| Data handling | Pandas + NumPy | CSV parsing, stats, preprocessing |
| Charts | Plotly.js (CDN) | Interactive plots (planned) |
| File downloads | SheetJS (CDN) | Excel reading in browser |
| Session storage | SQLite (Python built-in) | Multi-user pause/resume without extra install |
| Model persistence | Joblib (planned) | Save/reload trained models |

---

## Project Folder Structure

```
industrial-ai-toolkit/
├── app/
│   ├── __init__.py
│   ├── main.py          ← FastAPI entry point
│   ├── database.py      ← SQLite session storage
│   ├── model.py         ← ML training/prediction (not yet built)
│   └── utils.py         ← helper functions (not yet built)
├── frontend/
│   ├── index.html       ← Single page app
│   ├── styles.css       ← All styling
│   └── app.js           ← All frontend logic
├── data/                ← uploaded CSVs saved here
├── models/              ← saved trained models (planned)
├── sessions.db          ← SQLite database (auto-created)
├── README.md
└── requirements.txt
```

---

## How to Run

**Terminal 1 — Backend:**
```bash
cd industrial-ai-toolkit
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd industrial-ai-toolkit/frontend
python -m http.server 5500
```

**Open browser at:** `http://localhost:5500/index.html`

> ⚠️ Always open via `http://localhost:5500`, never by double-clicking the file directly. The `file://` protocol blocks fetch() calls to the backend.

---

## What Is Built

### Landing Page
- Dark industrial theme (bg: `#11161c`, accent: `#ff8a3d`)
- Two cards: **Start a new project** and **Resume a project**
- Title is large on landing page, shrinks after entering workspace

### Start a New Project Flow
- Modal popup asking for **Your name** and **Project name**
- Generates a **Project ID** = `{name}-{projectname}-v0` (lowercase, hyphenated)
- Version auto-increments if same name+project used again (v1, v2...)
- Welcome screen shows user name and project name
- Four project type cards: **Soft Sensor** (active), Classifier, Forecasting, Clustering (all three show "coming soon")

### Soft Sensor Workspace
Full-screen workspace with:
- **Top bar**: Logo (left) | Project Name + Project ID below it (center, ID hidden until Proceed) | User Name (right) | 💾 Save button (top right, appears after Proceed)
- **Left sidebar**: 7 steps — Upload, Basic Info, Visualization, Data Analysis, Feature Selection, Model Training, Results
  - Steps are **locked** by default, unlock as user progresses
  - Clicking an unlocked step navigates to that panel
- **Main area**: panel content for current step

### Upload Panel (Step 1)
- Two format cards: **CSV** and **Excel**
- CSV: file picker opens on card click → filename shown → Submit button appears
- Excel: file picker → SheetJS reads sheet names → if multiple sheets, dropdown appears → confirm sheet → Submit appears
- Submit sends file to FastAPI `/upload-data/` endpoint
- Enter key also triggers Submit

### Basic Info Panel (Step 2)
Rendered after successful upload with real data from backend.

**Summary boxes (two side by side):**
- Box 1: Number of rows, Number of features, Features with missing data
- Box 2: Numeric features, Categorical features, Time attributes

**Special Attributes box:**
- Numeric columns that look categorical (≤10 unique values)
- Time attributes (detected by keyword: time, date, timestamp, datetime)
- Columns with >50% missing values

**Column table** with columns: Attribute | Min | Max | Avg | Missing | Type (with filter dropdown in header) | Actions
- Type filter dropdown in header filters rows by type
- Per-row type dropdown in Actions cell (Numeric / Categorical / Time)
- Rename button: prompts for new name, updates table in-place
- Delete button: confirms then removes row
- Changing type to "Time" is user's choice (not forced by backend)

**Proceed button** at bottom opens a popup with:
- Time format selectors (one per column marked as Time, if any)
- Target variable dropdown (all non-time columns)
- Confirm & Proceed button

### Session Management
- Session created when user clicks **Confirm & Proceed** (not at upload time)
- `/create-session/` POST endpoint stores: filename, columns, rows, project_id, target_variable
- 💾 Save button (top right): saves current step + column types + final dataframe to backend
  - Calls `/save-session/` POST endpoint
  - Backend re-reads original CSV, applies column deletions, saves as `{project_id}_final.csv`
- **Resume a project**: modal asks for project ID → calls `/get-session-by-project-id/{project_id}` → restores full state including column types and navigates to saved step

### Visualization Panel (Step 3)
Currently blank placeholder: "Coming soon — charts and plots will appear here."

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/upload-data/` | Upload CSV, returns stats |
| POST | `/create-session/` | Create new session after Proceed |
| GET | `/get-session-by-project-id/{project_id}` | Fetch session for resume |
| POST | `/save-session/` | Save current state (step, column types, final df) |
| GET | `/session/{session_id}` | Fetch session by session ID |

### `/upload-data/` Response
```json
{
  "filename": "train.csv",
  "n_rows": 14897,
  "n_features": 7,
  "n_numeric": 6,
  "n_categorical": 1,
  "n_time": 1,
  "time_cols": ["Timestamp"],
  "pseudo_categorical": [],
  "high_missing": [],
  "column_stats": [
    {
      "name": "Timestamp",
      "dtype": "object",
      "min": null,
      "max": null,
      "avg": null,
      "missing": 0,
      "missing_pct": 0.0
    }
  ]
}
```

---

## SQLite Schema (sessions table)

```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT,
    updated_at TEXT,
    filename TEXT,
    final_filename TEXT,
    columns TEXT,
    rows INTEGER,
    project_id TEXT,
    target_variable TEXT,
    current_step TEXT,
    column_types TEXT,
    algorithm TEXT,
    metrics TEXT
)
```

---

## CSS Design Tokens

```css
--bg: #11161c;           /* page background */
--panel: #161d25;        /* card/panel background */
--panel-border: #232c36; /* borders */
--text-primary: #e8edf2; /* main text */
--text-secondary: #8b97a3; /* muted text */
--accent: #ff8a3d;       /* orange highlight */
```

Font: system sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI"`)
Monospace elements: `monospace` (stats, session IDs, column names)

---

## Known Patterns / Bugs to Watch For

1. **`hidden` attribute overridden by CSS `display`** — whenever an element has both a CSS `display` rule and the HTML `hidden` attribute, the CSS wins. Fix: always add `.[class][hidden] { display: none; }` alongside any element that uses both `hidden` and a non-default display value.

2. **`file://` protocol blocks fetch()** — always serve frontend via `python -m http.server 5500`, never open HTML directly.

3. **Relative imports in FastAPI** — since server is started from project root (`uvicorn app.main:app`), all imports inside `app/` must use relative syntax: `from .database import ...` not `from database import ...`

4. **File path resolution** — use `BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))` in `main.py` to get project root reliably regardless of where uvicorn is launched from.

5. **Stray `<` or `</div>` in HTML** — copying/pasting HTML in chat can introduce malformed tags. Always search for `<<` or orphaned `div>` if elements aren't rendering correctly.

---

## Not Yet Built (Next Steps)

1. **Visualization panel** — time series plots, distribution charts, correlation heatmap, actual vs predicted (Plotly.js)
2. **Data Analysis panel** — deeper statistical analysis per column
3. **Feature Selection panel** — correlation with target, drop low-importance features
4. **Model Training panel** — algorithm selection (Linear Regression, Random Forest, Gradient Boosting), train button, metrics display
5. **Results panel** — actual vs predicted plot, model download
6. **`app/model.py`** — scikit-learn training, joblib save/load
7. **`app/utils.py`** — shared helper functions
8. **Resume: full data reload** — currently resume restores step + column types; original and final dataframes are re-read from disk but the full Basic Info table interaction state isn't perfectly restored
9. **Classifier, Forecasting, Clustering** — currently show "coming soon"
