// ---- Shared state ----
let currentUserName = "";
let currentProjectName = "";
let uploadResponse = null;
let currentProjectId = "";
let currentSessionId = "";

// ---- Element references ----
const startNewCard = document.getElementById("start-new-card");
const modal = document.getElementById("new-project-modal");
const cancelBtn = document.getElementById("modal-cancel-btn");
const submitBtn = document.getElementById("modal-submit-btn");
const nameInput = document.getElementById("input-name");
const projectNameInput = document.getElementById("input-project-name");
const choiceGrid = document.querySelector(".choice-grid");
const welcomeBox = document.getElementById("welcome-box");
const welcomeName = document.getElementById("welcome-name");
const welcomeProject = document.getElementById("welcome-project");
const resumeCard = document.getElementById("resume-card");
const resumeModal = document.getElementById("resume-modal");
const resumeCancelBtn = document.getElementById("resume-cancel-btn");
const resumeSubmitBtn = document.getElementById("resume-submit-btn");
const resumeProjectIdInput = document.getElementById("resume-project-id-input");

// ---- Upload panel references ----
const csvCard = document.getElementById("format-csv");
const excelCard = document.getElementById("format-excel");
const csvFileInput = document.getElementById("csv-file-input");
const excelFileInput = document.getElementById("excel-file-input");
const sheetSelector = document.getElementById("sheet-selector");
const sheetSelect = document.getElementById("sheet-select");
const sheetConfirmBtn = document.getElementById("sheet-confirm-btn");
const uploadStatus = document.getElementById("upload-status");
const uploadStatusText = document.getElementById("upload-status-text");
const uploadSubmitArea = document.getElementById("upload-submit-area");
const uploadSubmitBtn = document.getElementById("upload-submit-btn");

const API_BASE = "http://127.0.0.1:8000";

// ---- Track used project IDs ----
const usedProjectIds = new Set();

function generateProjectId(base) {
  let version = 0;
  let id = `${base}-v${version}`;
  while (usedProjectIds.has(id)) {
    version++;
    id = `${base}-v${version}`;
  }
  usedProjectIds.add(id);
  return id;
}

// ---- Open modal ----
startNewCard.addEventListener("click", () => {
  modal.hidden = false;
});

// ---- Cancel modal ----
cancelBtn.addEventListener("click", () => {
  modal.hidden = true;
});

// ---- Submit modal on button click ----
submitBtn.addEventListener("click", handleModalSubmit);

// ---- Submit modal on Enter key ----
[nameInput, projectNameInput].forEach(input => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleModalSubmit();
  });
});

function handleModalSubmit() {
  const name = nameInput.value.trim();
  const projectName = projectNameInput.value.trim();

  if (name === "" || projectName === "") {
    alert("Please fill in both your name and project name.");
    return;
  }

  currentUserName = name;
  currentProjectName = projectName;

  const base = `${name}-${projectName}`.toLowerCase().replace(/\s+/g, "-");
  currentProjectId = generateProjectId(base);

  modal.hidden = true;
  choiceGrid.hidden = true;

  welcomeName.textContent = name;
  welcomeProject.textContent = projectName;
  welcomeBox.hidden = false;

  document.getElementById("brand-text").classList.remove("brand-text-large");
  document.getElementById("brand-mark").classList.remove("brand-mark-large");
}

// ---- Project type card clicks ----
document.getElementById("type-soft-sensor").addEventListener("click", () => {
  welcomeBox.hidden = true;
  document.getElementById("ws-project-name").textContent = currentProjectName;
  document.getElementById("ws-user-name").textContent = currentUserName;
  document.getElementById("ws-project-id").textContent = currentProjectId;
  document.getElementById("workspace").hidden = false;
  document.querySelector(".topbar").hidden = true;
  initSidebar();
});

document.getElementById("type-classifier").addEventListener("click", () => {
  alert("🚧 Classifier — coming soon.");
});

document.getElementById("type-forecasting").addEventListener("click", () => {
  alert("🚧 Forecasting — coming soon.");
});

document.getElementById("type-clustering").addEventListener("click", () => {
  alert("🚧 Clustering — coming soon.");
});

// ---- CSV card click ----
csvCard.addEventListener("click", () => {
  csvCard.classList.add("selected");
  excelCard.classList.remove("selected");
  sheetSelector.hidden = true;
  csvFileInput.click();
});

// ---- Excel card click ----
excelCard.addEventListener("click", () => {
  excelCard.classList.add("selected");
  csvCard.classList.remove("selected");
  sheetSelector.hidden = true;
  excelFileInput.click();
});

// ---- CSV file selected ----
csvFileInput.addEventListener("change", () => {
  if (csvFileInput.files.length === 0) return;
  const file = csvFileInput.files[0];
  uploadStatusText.textContent = `Selected: ${file.name}`;
  uploadStatus.hidden = false;
  uploadSubmitArea.hidden = false;
});

// ---- Excel file selected ----
excelFileInput.addEventListener("change", () => {
  if (excelFileInput.files.length === 0) return;
  const file = excelFileInput.files[0];
  uploadStatusText.textContent = `Reading: ${file.name}…`;
  uploadStatus.hidden = false;
  readExcelSheets(file);
});

// ---- Read Excel sheet names ----
function readExcelSheets(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheets = workbook.SheetNames;

    if (sheets.length === 1) {
      uploadStatusText.textContent = `Selected: ${file.name} — sheet "${sheets[0]}"`;
      sheetSelector.hidden = true;
      uploadSubmitArea.hidden = false;
    } else {
      sheetSelect.innerHTML = "";
      sheets.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        sheetSelect.appendChild(option);
      });
      sheetSelector.hidden = false;
      uploadStatusText.textContent = `${sheets.length} sheets found — please select one.`;
    }
  };
  reader.readAsArrayBuffer(file);
}

// ---- Sheet confirmed ----
sheetConfirmBtn.addEventListener("click", () => {
  const selectedSheet = sheetSelect.value;
  uploadStatusText.textContent = `Selected sheet: "${selectedSheet}"`;
  sheetSelector.hidden = true;
  uploadSubmitArea.hidden = false;
});

// ---- Upload submit ----
uploadSubmitBtn.addEventListener("click", handleUploadSubmit);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !uploadSubmitArea.hidden) {
    handleUploadSubmit();
  }
});

async function handleUploadSubmit() {
  const isCSV = csvCard.classList.contains("selected");
  const isExcel = excelCard.classList.contains("selected");

  if (!isCSV && !isExcel) {
    alert("Please select a file format and choose a file first.");
    return;
  }

  let file = isCSV ? csvFileInput.files[0] : excelFileInput.files[0];
  if (!file) {
    alert("No file selected. Please choose a file first.");
    return;
  }

  uploadStatusText.textContent = "Uploading…";
  uploadSubmitBtn.disabled = true;

  const formData = new FormData();

  if (isExcel) {
    const selectedSheet = sheetSelect.value || null;
    const csvBlob = await convertExcelToCSV(file, selectedSheet);
    formData.append("file", csvBlob, file.name.replace(/\.(xlsx|xls)$/, ".csv"));
  } else {
    formData.append("file", file);
  }

  try {
    const response = await fetch(`${API_BASE}/upload-data/`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Upload failed");
    }

    uploadResponse = data;
    renderBasicInfo(data);

  } catch (err) {
    uploadStatusText.textContent = `Error: ${err.message}`;
    uploadSubmitBtn.disabled = false;
  }
}

// ---- Convert Excel to CSV ----
async function convertExcelToCSV(file, sheetName) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      const blob = new Blob([csv], { type: "text/csv" });
      resolve(blob);
    };
    reader.readAsArrayBuffer(file);
  });
}

// ---- Render Basic Info ----
function renderBasicInfo(data, savedColumnTypes = {}) {
  document.getElementById("panel-upload").hidden = true;
  document.getElementById("panel-basic-info").hidden = false;

  unlockStep("basic-info");
  switchToStep("basic-info");

  document.getElementById("bi-rows").textContent = data.n_rows;
  document.getElementById("bi-features").textContent = data.n_features;
  document.getElementById("bi-numeric").textContent = data.n_numeric;
  document.getElementById("bi-categorical").textContent = data.n_categorical;
  document.getElementById("bi-time").textContent = data.n_time;

  const missingColsCount = data.column_stats.filter(c => c.missing > 0).length;
  document.getElementById("bi-missing-cols").textContent = missingColsCount;

  const pseudoDiv = document.getElementById("special-pseudo-cat");
  const timeDiv = document.getElementById("special-time-cols");
  const missingDiv = document.getElementById("special-high-missing");

  pseudoDiv.innerHTML = data.pseudo_categorical.length > 0
    ? `<p>Numeric but likely categorical: ${data.pseudo_categorical.map(c => `<span>${c}</span>`).join(", ")}</p>`
    : `<p>No pseudo-categorical numeric columns detected.</p>`;

  timeDiv.innerHTML = data.time_cols.length > 0
    ? `<p>Time attributes: ${data.time_cols.map(c => `<span>${c}</span>`).join(", ")}</p>`
    : `<p>No time attributes detected.</p>`;

  missingDiv.innerHTML = data.high_missing.length > 0
    ? `<p>Columns with >50% missing: ${data.high_missing.map(c => `<span>${c}</span>`).join(", ")}</p>`
    : `<p>No columns with excessive missing values.</p>`;

  const tbody = document.getElementById("bi-table-body");
  tbody.innerHTML = "";

  data.column_stats.forEach((col) => {
    const tr = document.createElement("tr");
    tr.id = `row-${col.name}`;

    let guessedType = savedColumnTypes[col.name] || null;
    if (!guessedType) {
      guessedType = col.dtype === "object" ? "categorical" : "numeric";
      if (data.time_cols && data.time_cols.includes(col.name)) guessedType = "categorical";
    }

    tr.innerHTML = `
      <td>${col.name}</td>
      <td>${col.min ?? "—"}</td>
      <td>${col.max ?? "—"}</td>
      <td>${col.avg ?? "—"}</td>
      <td>${col.missing} (${col.missing_pct}%)</td>
      <td class="col-type-cell" data-type="${guessedType}">${guessedType}</td>
      <td>
        <select class="type-dropdown row-type-dropdown" data-col="${col.name}">
          <option value="numeric" ${guessedType === "numeric" ? "selected" : ""}>Numeric</option>
          <option value="categorical" ${guessedType === "categorical" ? "selected" : ""}>Categorical</option>
          <option value="time" ${guessedType === "time" ? "selected" : ""}>Time</option>
        </select>
        <button class="btn-action" data-action="rename" data-col="${col.name}">Rename</button>
        <button class="btn-action btn-action-delete" data-action="delete" data-col="${col.name}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ---- Table interactions ----
document.getElementById("bi-table").addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  const col = e.target.dataset.col;
  if (!action || !col) return;

  if (action === "rename") {
    const newName = prompt(`Rename "${col}" to:`);
    if (newName && newName.trim() !== "") {
      const row = document.getElementById(`row-${col}`);
      row.querySelector("td:first-child").textContent = newName.trim();
      row.id = `row-${newName.trim()}`;
      row.querySelector(".row-type-dropdown").dataset.col = newName.trim();
      e.target.dataset.col = newName.trim();
      row.querySelector("[data-action='delete']").dataset.col = newName.trim();
    }
  }

  if (action === "delete") {
    if (confirm(`Delete column "${col}"? This cannot be undone.`)) {
      document.getElementById(`row-${col}`).remove();
    }
  }
});

// ---- Type filter and row type dropdown ----
document.getElementById("bi-table").addEventListener("change", (e) => {
  if (e.target.classList.contains("row-type-dropdown")) {
    const col = e.target.dataset.col;
    const selectedType = e.target.value;
    const typeCell = e.target.closest("tr").querySelector(".col-type-cell");
    typeCell.textContent = selectedType;
    typeCell.dataset.type = selectedType;
  }

  if (e.target.id === "type-filter-dropdown") {
    const filterValue = e.target.value;
    document.querySelectorAll("#bi-table-body tr").forEach((row) => {
      const typeCell = row.querySelector(".col-type-cell");
      if (!typeCell) return;
      row.hidden = filterValue === "all" || typeCell.dataset.type === filterValue ? false : true;
    });
  }
});

// ---- Proceed button ----
document.getElementById("proceed-btn").addEventListener("click", () => {
  const allRows = [...document.querySelectorAll("#bi-table-body tr")];

  const timeColNames = allRows
    .filter(row => row.querySelector(".col-type-cell")?.dataset.type === "time")
    .map(row => row.querySelector("td:first-child").textContent);

  const allCols = allRows.map(row => row.querySelector("td:first-child").textContent);

  showTimeFormatPopup(timeColNames, allCols);
});

function showTimeFormatPopup(timeColNames, allCols) {
  const existing = document.getElementById("time-format-modal");
  if (existing) existing.remove();

  const nonTimeCols = allCols.filter(c => !timeColNames.includes(c));

  const overlay = document.createElement("div");
  overlay.id = "time-format-modal";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box" style="width: 440px; max-width: 95%;">
      <h2 class="modal-title">Before proceeding</h2>

      ${timeColNames.length > 0 ? `
        <p class="modal-desc">Confirm the format for each time column.</p>
        ${timeColNames.map(col => `
          <label class="modal-label">${col}</label>
          <select class="modal-input" id="tf-${col}">
            <option value="%m/%d/%Y %H:%M">MM/DD/YYYY HH:MM</option>
            <option value="%Y-%m-%d">YYYY-MM-DD</option>
            <option value="%d/%m/%Y">DD/MM/YYYY</option>
            <option value="%m/%d/%Y">MM/DD/YYYY</option>
            <option value="%Y-%m-%d %H:%M:%S">YYYY-MM-DD HH:MM:SS</option>
            <option value="unix">Unix timestamp</option>
          </select>
        `).join("")}
        <div style="border-top: 1px solid var(--panel-border); margin: 18px 0;"></div>
      ` : ""}

      <p class="modal-desc">Select the target variable for your soft sensor.</p>
      <label class="modal-label">Target variable</label>
      <select class="modal-input" id="target-variable-select">
        <option value="">— select a column —</option>
        ${nonTimeCols.map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>

      <div class="modal-actions">
        <button class="btn-secondary" id="tf-cancel-btn">Cancel</button>
        <button class="btn-primary" id="tf-confirm-btn">Confirm & Proceed</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("tf-cancel-btn").addEventListener("click", () => overlay.remove());

  document.getElementById("tf-confirm-btn").addEventListener("click", () => {
    const targetVariable = document.getElementById("target-variable-select").value;

    if (!targetVariable) {
      alert("Please select a target variable before proceeding.");
      return;
    }

    const timeFormats = {};
    timeColNames.forEach(col => {
      timeFormats[col] = document.getElementById(`tf-${col}`).value;
    });

    overlay.remove();
    window._vizTargetVariable = targetVariable;
    vizInitialized = false; // reset so dropdowns re-populate for new session
    proceedToNextStep(targetVariable, timeFormats);
  });
}

async function proceedToNextStep(targetVariable, timeFormats) {
  try {
    const response = await fetch(`${API_BASE}/create-session/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: uploadResponse.filename,
        columns: uploadResponse.column_stats.map(c => c.name),
        rows: uploadResponse.n_rows,
        project_id: currentProjectId,
        target_variable: targetVariable,
      }),
    });
    const data = await response.json();
    currentSessionId = data.session_id;
    console.log("Session created:", currentSessionId);
  } catch (err) {
    console.error("Failed to create session:", err);
  }

  document.getElementById("ws-project-id").hidden = false;
  document.getElementById("save-btn").hidden = false;
  unlockStep("visualization");
  switchToStep("visualization");
  initVisualizationPanel();
}

// ---- Step management ----
const STEPS = ["upload", "basic-info", "visualization", "data-analysis", "feature-selection", "model-training", "results"];
const unlockedSteps = new Set(["upload"]);
let currentStep = "upload";

function unlockStep(stepId) {
  unlockedSteps.add(stepId);
  const el = document.getElementById(`step-${stepId}`);
  if (el) el.classList.remove("locked");
}

function switchToStep(stepId) {
  if (!unlockedSteps.has(stepId)) return;

  STEPS.forEach(s => {
    const el = document.getElementById(`step-${s}`);
    if (el) el.classList.remove("active");
  });
  document.getElementById(`step-${stepId}`).classList.add("active");

  document.getElementById("panel-upload").hidden = stepId !== "upload";
  document.getElementById("panel-basic-info").hidden = stepId !== "basic-info";
  document.getElementById("panel-visualization").hidden = stepId !== "visualization";
  document.getElementById("panel-data-analysis").hidden = stepId !== "data-analysis";

  if (stepId === "visualization" && uploadResponse) {
    initVisualizationPanel();
  }

  currentStep = stepId;
}

function initSidebar() {
  STEPS.forEach(s => {
    if (s !== "upload") {
      const el = document.getElementById(`step-${s}`);
      if (el) el.classList.add("locked");
    }
  });

  STEPS.forEach(s => {
    const el = document.getElementById(`step-${s}`);
    if (el) {
      el.addEventListener("click", () => switchToStep(s));
    }
  });
}

// ---- Resume card click ----
resumeCard.addEventListener("click", () => {
  resumeModal.hidden = false;
});

// ---- Resume modal cancel ----
resumeCancelBtn.addEventListener("click", () => {
  resumeModal.hidden = true;
  resumeProjectIdInput.value = "";
});

// ---- Resume modal submit ----
resumeSubmitBtn.addEventListener("click", handleResumeSubmit);
resumeProjectIdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleResumeSubmit();
});

async function handleResumeSubmit() {
  const projectId = resumeProjectIdInput.value.trim();

  if (!projectId) {
    alert("Please enter a project ID.");
    return;
  }

  resumeSubmitBtn.disabled = true;
  resumeSubmitBtn.textContent = "Looking up…";

  try {
    const response = await fetch(`${API_BASE}/get-session-by-project-id/${projectId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Project not found");
    }

    currentSessionId = data.session_id;
    currentProjectId = data.project_id;
    currentProjectName = data.project_id.split("-").slice(1, -1).join(" ");
    currentUserName = data.project_id.split("-")[0];
    window._vizTargetVariable = data.target_variable || null;
    vizInitialized = false;
    uploadResponse = {
      filename: data.filename,
      column_stats: data.column_stats,
      n_rows: data.rows,
      n_features: data.column_stats.length,
      time_cols: [],
      pseudo_categorical: [],
      high_missing: [],
      n_numeric: data.column_stats.filter(c => c.dtype !== "object").length,
      n_categorical: data.column_stats.filter(c => c.dtype === "object").length,
      n_time: 0,
    };

    resumeModal.hidden = true;
    choiceGrid.hidden = true;

    document.getElementById("ws-project-name").textContent = currentProjectName;
    document.getElementById("ws-project-id").textContent = currentProjectId;
    document.getElementById("ws-project-id").hidden = false;
    document.getElementById("ws-user-name").textContent = currentUserName;
    document.getElementById("workspace").hidden = false;
    document.querySelector(".topbar").hidden = true;
    document.getElementById("save-btn").hidden = false;

    initSidebar();
    renderBasicInfo(uploadResponse, data.column_types);

    const savedStep = data.current_step || "basic-info";
    unlockStep(savedStep);
    switchToStep(savedStep);

  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    resumeSubmitBtn.disabled = false;
    resumeSubmitBtn.textContent = "Resume";
  }
}

// ---- Save button ----
document.getElementById("save-btn").addEventListener("click", async () => {
  if (!currentSessionId) {
    alert("No active session to save.");
    return;
  }

  const rows = [...document.querySelectorAll("#bi-table-body tr")];
  const columnsFinal = rows.map(r => r.querySelector("td:first-child").textContent);
  const columnTypes = {};
  rows.forEach(r => {
    const name = r.querySelector("td:first-child").textContent;
    const type = r.querySelector(".col-type-cell")?.dataset.type || "numeric";
    columnTypes[name] = type;
  });

  const saveBtn = document.getElementById("save-btn");
  saveBtn.textContent = "Saving…";
  saveBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/save-session/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: currentSessionId,
        current_step: currentStep,
        column_types: columnTypes,
        columns_final: columnsFinal,
        project_id: currentProjectId,
      }),
    });

    const data = await response.json();
    saveBtn.textContent = "✓ Saved";
    setTimeout(() => {
      saveBtn.textContent = "💾 Save";
      saveBtn.disabled = false;
    }, 2000);

  } catch (err) {
    alert("Save failed: " + err.message);
    saveBtn.textContent = "💾 Save";
    saveBtn.disabled = false;
  }
});

// ============================================================
// ---- Visualization panel ----
// ============================================================

let vizInitialized = false;  // prevent redundant dropdown re-population
let vizData = null;           // last fetched response

// Shared Plotly dark layout base
const VIZ_LAYOUT_BASE = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  margin: { t: 10, r: 10, b: 36, l: 44 },
  font: { color: "#8b97a3", size: 11, family: "inherit" },
  xaxis: {
    gridcolor: "#232c36",
    zerolinecolor: "#232c36",
    tickfont: { color: "#8b97a3", size: 10 },
  },
  yaxis: {
    gridcolor: "#232c36",
    zerolinecolor: "#232c36",
    tickfont: { color: "#8b97a3", size: 10 },
  },
  showlegend: false,
};

const VIZ_CONFIG = { displayModeBar: false, responsive: true };

// ---- Init panel: populate dropdowns ----
function initVisualizationPanel() {
  if (!uploadResponse || !uploadResponse.column_stats) return;

  const featureSel  = document.getElementById("viz-feature");
  const secondSel   = document.getElementById("viz-second-feature");
  const typeSel     = document.getElementById("viz-feature-type");

  // Only re-populate dropdowns when first entering this panel
  if (!vizInitialized) {
    const targetVar = (typeof proceedToNextStep._targetVar !== "undefined")
      ? proceedToNextStep._targetVar
      : null;

    // Collect all columns
    const allCols = uploadResponse.column_stats.map(c => c.name);

    featureSel.innerHTML = "";
    secondSel.innerHTML  = "";

    allCols.forEach(col => {
      const o1 = document.createElement("option");
      o1.value = o1.textContent = col;
      featureSel.appendChild(o1);

      const o2 = document.createElement("option");
      o2.value = o2.textContent = col;
      secondSel.appendChild(o2);
    });

    // Default second feature = target variable stored on the session
    // We store it when proceeding from basic-info
    if (window._vizTargetVariable && allCols.includes(window._vizTargetVariable)) {
      secondSel.value = window._vizTargetVariable;
    }

    // Default first feature = first column that is NOT the target
    const nonTarget = allCols.find(c => c !== secondSel.value);
    if (nonTarget) featureSel.value = nonTarget;

    vizInitialized = true;
  }

  // Wire change events (idempotent — they check vizInitialized first)
  featureSel.onchange  = loadVisualizationData;
  secondSel.onchange   = loadVisualizationData;
  typeSel.onchange     = loadVisualizationData;

  loadVisualizationData();
}

// ---- Fetch data from backend and render all charts ----
async function loadVisualizationData() {
  const feature       = document.getElementById("viz-feature").value;
  const secondFeature = document.getElementById("viz-second-feature").value;
  const featureType   = document.getElementById("viz-feature-type").value;

  if (!feature || !secondFeature || !currentSessionId) return;

  // Show loading placeholders
  ["viz-histogram", "viz-dual-plot", "viz-scatter-plot", "viz-corr-plot"].forEach(id => {
    document.getElementById(id).innerHTML =
      `<div class="viz-chart-placeholder">Loading…</div>`;
  });

  try {
    const res = await fetch(`${API_BASE}/visualize-feature/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: currentSessionId,
        feature,
        second_feature: secondFeature,
        feature_type: featureType,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to load visualization data");
    }

    vizData = await res.json();
    renderHistogram(vizData, feature);
    renderStatsTable(vizData.stats);
    renderDualPlot(vizData, feature, secondFeature);
    renderScatterPlot(vizData, feature, secondFeature);
    renderCorrStats(vizData, feature, secondFeature);

  } catch (err) {
    ["viz-histogram", "viz-dual-plot", "viz-scatter-plot", "viz-corr-plot"].forEach(id => {
      document.getElementById(id).innerHTML =
        `<div class="viz-chart-placeholder" style="color:#f87171;">Error: ${err.message}</div>`;
    });
  }
}

// ---- Card A: Distribution histogram ----
function renderHistogram(data, featureName) {
  const el = document.getElementById("viz-histogram");
  el.innerHTML = "";

  const trace = {
    x: data.histogram.x,
    y: data.histogram.y,
    type: "bar",
    marker: { color: "rgba(255,138,61,0.75)", line: { color: "rgba(255,138,61,1)", width: 1 } },
    name: featureName,
  };

  const layout = {
    ...VIZ_LAYOUT_BASE,
    xaxis: { ...VIZ_LAYOUT_BASE.xaxis, title: { text: featureName, font: { size: 10 } } },
    yaxis: { ...VIZ_LAYOUT_BASE.yaxis, title: { text: "Count", font: { size: 10 } } },
  };

  Plotly.newPlot(el, [trace], layout, VIZ_CONFIG);
}

// ---- Card A: Stats table ----
function renderStatsTable(stats) {
  const el = document.getElementById("viz-stats-table");
  const rows = [
    ["Min",      stats.min],
    ["Max",      stats.max],
    ["Mean",     stats.mean],
    ["Median",   stats.median],
    ["Skewness", stats.skewness],
  ];
  el.innerHTML = rows.map(([label, val]) => `
    <div class="viz-stat-row">
      <span class="viz-stat-label">${label}</span>
      <span class="viz-stat-value">${val}</span>
    </div>
  `).join("");
}

// ---- Card B: Dual Y-axis overlay plot ----
function renderDualPlot(data, feat1, feat2) {
  const el = document.getElementById("viz-dual-plot");
  el.innerHTML = "";

  const xVals = data.dual_series.x;
  const xLabel = data.time_col || "Index";

  const trace1 = {
    x: xVals,
    y: data.dual_series.y1,
    type: "scatter",
    mode: "lines",
    name: feat1,
    line: { color: "#ff8a3d", width: 1.5 },
  };

  const trace2 = {
    x: xVals,
    y: data.dual_series.y2,
    type: "scatter",
    mode: "lines",
    name: feat2,
    line: { color: "#38bdf8", width: 1.5 },
    yaxis: "y2",
  };

  const layout = {
    ...VIZ_LAYOUT_BASE,
    showlegend: true,
    legend: { font: { size: 10, color: "#8b97a3" }, bgcolor: "transparent" },
    xaxis: { ...VIZ_LAYOUT_BASE.xaxis, title: { text: xLabel, font: { size: 10 } } },
    yaxis: { ...VIZ_LAYOUT_BASE.yaxis, title: { text: feat1, font: { size: 10 } } },
    yaxis2: {
      overlaying: "y",
      side: "right",
      gridcolor: "#232c36",
      tickfont: { color: "#38bdf8", size: 10 },
      title: { text: feat2, font: { size: 10, color: "#38bdf8" } },
    },
  };

  Plotly.newPlot(el, [trace1, trace2], layout, VIZ_CONFIG);
}

// ---- Card C: Scatter + trend line ----
function renderScatterPlot(data, feat1, feat2) {
  const el = document.getElementById("viz-scatter-plot");
  el.innerHTML = "";

  const xa = data.scatter.x;
  const ya = data.scatter.y;

  // Linear regression for trend line
  const n = xa.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xa[i]; sumY += ya[i];
    sumXY += xa[i] * ya[i]; sumX2 += xa[i] * xa[i];
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const xMin = Math.min(...xa), xMax = Math.max(...xa);
  const trendX = [xMin, xMax];
  const trendY = [slope * xMin + intercept, slope * xMax + intercept];

  const scatterTrace = {
    x: xa, y: ya,
    type: "scatter", mode: "markers",
    name: "Data",
    marker: { color: "rgba(255,138,61,0.5)", size: 5, line: { color: "#ff8a3d", width: 0.5 } },
  };

  const lineTrace = {
    x: trendX, y: trendY,
    type: "scatter", mode: "lines",
    name: "Trend",
    line: { color: "#38bdf8", width: 2, dash: "dot" },
  };

  const layout = {
    ...VIZ_LAYOUT_BASE,
    showlegend: true,
    legend: { font: { size: 10, color: "#8b97a3" }, bgcolor: "transparent" },
    xaxis: { ...VIZ_LAYOUT_BASE.xaxis, title: { text: feat1, font: { size: 10 } } },
    yaxis: { ...VIZ_LAYOUT_BASE.yaxis, title: { text: feat2, font: { size: 10 } } },
  };

  Plotly.newPlot(el, [scatterTrace, lineTrace], layout, VIZ_CONFIG);

  // Wire toggle checkboxes
  document.getElementById("viz-show-scatter").onchange = (e) => {
    Plotly.restyle(el, { visible: e.target.checked ? true : "legendonly" }, [0]);
  };
  document.getElementById("viz-show-line").onchange = (e) => {
    Plotly.restyle(el, { visible: e.target.checked ? true : "legendonly" }, [1]);
  };
}

// ---- Card D: Correlation (scatter) + Pearson/Spearman stats ----
function renderCorrStats(data, feat1, feat2) {
  const elPlot  = document.getElementById("viz-corr-plot");
  const elStats = document.getElementById("viz-corr-stats");
  elPlot.innerHTML = "";

  const trace = {
    x: data.scatter.x,
    y: data.scatter.y,
    type: "scatter",
    mode: "markers",
    marker: { color: "rgba(56,189,248,0.45)", size: 5, line: { color: "#38bdf8", width: 0.5 } },
  };

  const layout = {
    ...VIZ_LAYOUT_BASE,
    xaxis: { ...VIZ_LAYOUT_BASE.xaxis, title: { text: feat1, font: { size: 10 } } },
    yaxis: { ...VIZ_LAYOUT_BASE.yaxis, title: { text: feat2, font: { size: 10 } } },
  };

  Plotly.newPlot(elPlot, [trace], layout, VIZ_CONFIG);

  // Stats badges
  const pearsonStr  = data.pearson  !== null ? data.pearson.toFixed(3)  : "N/A";
  const spearmanStr = data.spearman !== null ? data.spearman.toFixed(3) : "N/A";

  elStats.innerHTML = `
    <div class="viz-corr-item">
      <span class="viz-corr-label">Pearson's r</span>
      <span class="viz-corr-value">${pearsonStr}</span>
    </div>
    <div class="viz-corr-item">
      <span class="viz-corr-label">Spearman's ρ</span>
      <span class="viz-corr-value">${spearmanStr}</span>
    </div>
  `;
}

// ---- Next Step button ----
document.getElementById("viz-next-btn").addEventListener("click", () => {
  unlockStep("data-analysis");
  switchToStep("data-analysis");
});