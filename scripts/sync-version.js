const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const versionPath = path.join(root, "version.json");
const swPath = path.join(root, "service-worker.js");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = String(pkg.version || "").trim();

if (!version) {
  console.error("Versão inválida no package.json.");
  process.exit(1);
}

fs.writeFileSync(
  versionPath,
  JSON.stringify({ version }, null, 2) + "\n",
  "utf8"
);

if (!fs.existsSync(swPath)) {
  console.error("service-worker.js não encontrado.");
  process.exit(1);
}

let sw = fs.readFileSync(swPath, "utf8");

if (!sw.trim()) {
  console.error("service-worker.js está vazio. Restaure o arquivo antes do build.");
  process.exit(1);
}

if (!/const CACHE_NAME = "study-tracker-v[^"]+";/.test(sw)) {
  console.error("CACHE_NAME não encontrado no service-worker.js.");
  process.exit(1);
}

sw = sw.replace(
  /const CACHE_NAME = "study-tracker-v[^"]+";/,
  `const CACHE_NAME = "study-tracker-v${version}";`
);

fs.writeFileSync(swPath, sw, "utf8");

console.log(`Versão sincronizada: ${version}`);
