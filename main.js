// main.js (COM SUPORTE A XLSX OU DOCX)

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const mammoth = require("mammoth");

function ensureBackupsDir() {
  const base = app.getPath("userData");
  const dir = path.join(base, "Backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// -----------------------------
// Helpers
// -----------------------------
function readXlsxAsRows(filePath) {
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function normalizeLine(s) {
  return (s || "").toString().replace(/\u00A0/g, " ").trim();
}

function isNumberedTopic(line) {
  // Aceita: "1 Texto", "1. Texto", "1) Texto", "2.1 Texto", "2.1. Texto", "10.3.4 Texto"
  return /^\d+(?:\.\d+)*[.)]?\s+/.test(line);
}

function isSubtopic(line) {
  // Aceita: "1.1 Texto", "1.1. Texto", "1.1) Texto", "1.2.3 Texto"
  return /^\d+\.\d+(?:\.\d+)*[.)]?\s+/.test(line);
}

function isTopLevelTopic(line) {
  // Aceita: "1 Texto", "1. Texto", "1) Texto" (e garante que não é subtopic)
  return /^\d+[.)]?\s+/.test(line) && !isSubtopic(line);
}

// ✅ heurística para detectar cabeçalho de matéria dentro do DOCX
function looksLikeMateriaHeading(line) {
  const s = normalizeLine(line);
  if (!s) return false;

  if (isNumberedTopic(s)) return false;     // não pode ser tópico numerado
  if (/\d/.test(s)) return false;           // não pode ter dígitos
  if (s.length > 70) return false;          // evita frases longas
  if (/[.;:!?]$/.test(s)) return false;     // evita linhas que parecem sentença
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false; // precisa ter letras

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 8) return false;

  const hasUpper = s === s.toUpperCase();
  const hasTitleLike = words.every(w => w.length <= 3 || w[0] === w[0].toUpperCase());

  return hasUpper || hasTitleLike;
}

async function readDocxAndConvertToRows(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value || "";

  const lines = text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  let currentMateria = "";
  let lastTopico = "";

  const rows = [];

  for (const lineRaw of lines) {
    const line = normalizeLine(lineRaw);

    // "Matéria: X"
    const m = line.match(/^mat[eé]ria\s*:\s*(.+)$/i);
    if (m) {
      currentMateria = normalizeLine(m[1]);
      lastTopico = "";
      continue;
    }

    // ✅ se a linha parece cabeçalho de matéria
    if (looksLikeMateriaHeading(line)) {
      currentMateria = line;
      lastTopico = "";
      continue;
    }

    if (!currentMateria) continue;

    // tópico nível 1
    if (isTopLevelTopic(line)) {
      lastTopico = line;
      rows.push({ MATERIA: currentMateria, TOPICO: line, SUBTOPICO: "" });
      continue;
    }

    // sub tópico
    if (isSubtopic(line)) {
      const parent = lastTopico || "(Sem tópico pai)";
      rows.push({ MATERIA: currentMateria, TOPICO: parent, SUBTOPICO: line });
      continue;
    }

    // fallback: numerado mas fora do padrão
    if (isNumberedTopic(line)) {
      lastTopico = line;
      rows.push({ MATERIA: currentMateria, TOPICO: line, SUBTOPICO: "" });
    }
  }

  return rows;
}

// -----------------------------
// IPC: XLSX
// -----------------------------
ipcMain.handle("pick-and-read-xlsx", async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: "Escolher planilha (.xlsx)",
      properties: ["openFile"],
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });

    if (result.canceled || !result.filePaths?.length) {
      return { ok: false, error: "Cancelado", canceled: true };
    }

    const filePath = result.filePaths[0];
    const rows = readXlsxAsRows(filePath);
    return { ok: true, rows, path: filePath, kind: "xlsx" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// -----------------------------
// IPC: XLSX ou DOCX
// -----------------------------
ipcMain.handle("pick-and-read-any", async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: "Escolher planilha (.xlsx) ou edital (.docx)",
      properties: ["openFile"],
      filters: [{ name: "Excel ou Word", extensions: ["xlsx", "docx"] }],
    });

    if (result.canceled || !result.filePaths?.length) {
      return { ok: false, error: "Cancelado", canceled: true };
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".xlsx") {
      const rows = readXlsxAsRows(filePath);
      return { ok: true, rows, path: filePath, kind: "xlsx" };
    }

    if (ext === ".docx") {
      const rows = await readDocxAndConvertToRows(filePath);
      return { ok: true, rows, path: filePath, kind: "docx" };
    }

    return { ok: false, error: "Formato não suportado." };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// -----------------------------
// Save backup
// -----------------------------
ipcMain.handle("studyio:saveBackupXlsx", async (_evt, bytesArray, filename) => {
  try {
    const dir = ensureBackupsDir();
    const outPath = path.join(dir, filename);
    const buf = Buffer.from(Uint8Array.from(bytesArray));
    fs.writeFileSync(outPath, buf);
    return { ok: true, path: outPath };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// -----------------------------
// IPC: App Version (✅ SÓ UMA VEZ!)
// -----------------------------
ipcMain.handle("studyio:getAppVersion", () => {
  return app.getVersion(); // vem do package.json -> "version"
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
