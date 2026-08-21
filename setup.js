#!/usr/bin/env node
import { execSync, spawn } from "node:child_process"
import fs from "node:fs"
import https from "node:https"
import os from "node:os"
import path from "node:path"
import { createWriteStream } from "node:fs"
import { pipeline } from "node:stream/promises"
import { fileURLToPath } from "node:url"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const IS_WIN = process.platform === "win32"
const PY = path.join(ROOT, "ml-core", ".venv", IS_WIN ? "Scripts\\python.exe" : "bin/python")
const ML_CORE = path.join(ROOT, "ml-core")

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const c = useColor
  ? { info: "\x1b[1;36m", ok: "\x1b[1;32m", warn: "\x1b[1;33m", err: "\x1b[1;31m", end: "\x1b[0m" }
  : { info: "", ok: "", warn: "", err: "", end: "" }

const say = (m) => console.log(`${c.info}==>${c.end} ${m}`)
const ok = (m) => console.log(`${c.ok}  OK${c.end} ${m}`)
const warn = (m) => console.log(`${c.warn}WARN${c.end} ${m}`)
const die = (m) => {
  console.error(`${c.err}ERR ${c.end} ${m}`)
  process.exit(1)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", encoding: "utf8", ...opts })
}

function capture(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts }).trim()
}

function usage() {
  console.log(`
Cafebot setup: uv -> dependencias JS -> backend Python -> app Electron

Uso:
  corepack pnpm setup          Prepara todo y arranca backend + app
  node setup.js --setup-only   Solo prepara el entorno, no arranca nada
  node setup.js --help

Requisitos:
  - Node.js 22+ (corepack viene incluido en Node)
  - Internet (la primera ejecución descarga dependencias y modelos)

Python NO hace falta instalarlo: uv lo descarga y gestiona automáticamente.
`)
}

function preflight() {
  const major = Number(process.versions.node.split(".")[0])
  if (major < 22) {
    die(`Node.js 22+ requerido (tienes ${process.versions.node}). Instálalo desde https://nodejs.org`)
  }
  try {
    capture("corepack pnpm --version")
  } catch {
    try {
      run("corepack enable")
    } catch {}
    try {
      capture("corepack pnpm --version")
    } catch {
      die("corepack/pnpm no funcionan. Asegúrate de tener Node.js 22+.")
    }
  }
  ok(`Node ${process.versions.node} · pnpm ${capture("corepack pnpm --version")}`)
}

function ensureUv() {
  try {
    ok(`uv ya instalado: ${capture("uv --version")}`)
    return
  } catch {}
  const localBin = path.join(os.homedir(), ".local", "bin")
  process.env.PATH = localBin + path.delimiter + process.env.PATH
  try {
    ok(`uv encontrado en ~/.local/bin: ${capture("uv --version")}`)
    return
  } catch {}
  say("uv no está instalado. Instalándolo...")
  if (IS_WIN) {
    run('powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"')
  } else {
    try {
      run("curl -LsSf https://astral.sh/uv/install.sh | sh")
    } catch {
      run("wget -qO- https://astral.sh/uv/install.sh | sh")
    }
  }
  try {
    ok(`uv instalado: ${capture("uv --version")}`)
  } catch {
    die("uv no quedó disponible. Cierra y abre la terminal (o añade ~/.local/bin al PATH) y vuelve a correr el script.")
  }
}

function electronBinaryPresent(dir) {
  return (
    fs.existsSync(path.join(dir, "dist", "electron.exe")) ||
    fs.existsSync(path.join(dir, "dist", "electron")) ||
    fs.existsSync(path.join(dir, "dist", "Electron.app"))
  )
}

function ensureElectron() {
  const pnpmDir = path.join(ROOT, "node_modules", ".pnpm")
  let dirs = []
  try {
    dirs = fs.readdirSync(pnpmDir)
  } catch {}
  const hit = dirs.find((d) => d.startsWith("electron@"))
  if (!hit) {
    warn("No se encontró el paquete 'electron'. ¿Falló 'pnpm install'?")
    return
  }
  const dir = path.join(pnpmDir, hit, "node_modules", "electron")
  if (electronBinaryPresent(dir)) {
    ok("Binario de Electron presente")
    return
  }
  say("Descargando el binario de Electron (postinstall)...")
  try {
    run("node install.js", { cwd: dir })
  } catch {}
  if (electronBinaryPresent(dir)) {
    ok("Binario de Electron listo")
  } else {
    warn(`No se pudo descargar el binario de Electron. Manual: cd "${dir}" && node install.js`)
  }
}

function lzmaOk() {
  try {
    run(`"${PY}" -c "import lzma"`, { cwd: ML_CORE, stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

async function download(url, dest) {
  let current = url
  for (let i = 0; i < 6; i++) {
    const res = await new Promise((resolve, reject) => {
      https.get(current, (r) => resolve(r)).on("error", reject)
    })
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume()
      current = new URL(res.headers.location, current).href
      continue
    }
    if (res.statusCode !== 200) {
      res.resume()
      throw new Error(`HTTP ${res.statusCode}`)
    }
    await pipeline(res, createWriteStream(dest))
    return
  }
  throw new Error("demasiados redireccionamientos")
}

async function fixLzma() {
  if (!IS_WIN) return
  say("Verificando '_lzma.pyd' (Smart App Control en Windows)...")
  if (lzmaOk()) {
    ok("lzma importa correctamente")
    return
  }
  warn("import lzma falla (bloqueo por política de App Control). Reemplazando con la copia firmada de python.org...")
  const stdlib = capture(`"${PY}" -c "import sysconfig; print(sysconfig.get_paths()['stdlib'])"`, { cwd: ML_CORE })
  const dllsDir = path.join(path.dirname(stdlib), "DLLs")
  const pyver = capture(`"${PY}" -c "import platform; print(platform.python_version())"`, { cwd: ML_CORE })
  const url = `https://www.python.org/ftp/python/${pyver}/python-${pyver}-embed-amd64.zip`
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cafebot-"))
  say(`Descargando _lzma.pyd firmado desde python.org (${pyver})...`)
  try {
    await download(url, path.join(tmp, "embed.zip"))
  } catch (e) {
    warn(`Descarga fallida para ${pyver} (${e.message}); se mantiene el _lzma.pyd original.`)
    fs.rmSync(tmp, { recursive: true, force: true })
    return
  }
  try {
    if (IS_WIN) {
      run(`powershell -NoProfile -Command "Expand-Archive -Force '${tmp}\\embed.zip' -DestinationPath '${tmp}'"`)
    } else {
      run("unzip -o embed.zip _lzma.pyd", { cwd: tmp })
    }
  } catch (e) {
    warn(`No se pudo extraer _lzma.pyd de la build oficial (${e.message}).`)
    fs.rmSync(tmp, { recursive: true, force: true })
    return
  }
  const target = path.join(dllsDir, "_lzma.pyd")
  const signed = path.join(tmp, "_lzma.pyd")
  if (!fs.existsSync(signed)) {
    warn("No se encontró _lzma.pyd en la build oficial.")
    fs.rmSync(tmp, { recursive: true, force: true })
    return
  }
  const backup = path.join(tmp, "_lzma.pyd.orig")
  if (fs.existsSync(target)) fs.copyFileSync(target, backup)
  fs.copyFileSync(signed, target)
  if (lzmaOk()) {
    ok("lzma corregido con la copia firmada")
  } else {
    warn("lzma sigue fallando; se restauró el archivo original.")
    if (fs.existsSync(backup)) fs.copyFileSync(backup, target)
  }
  fs.rmSync(tmp, { recursive: true, force: true })
}

let backendPid = null
let backendLog = null

function startBackend() {
  backendLog = fs.openSync(path.join(ML_CORE, "backend.log"), "a")
  const child = spawn(PY, ["-m", "uvicorn", "ml_core.server:app", "--host", "127.0.0.1", "--port", "8765"], {
    cwd: ML_CORE,
    stdio: ["ignore", backendLog, backendLog],
    detached: true,
  })
  child.unref()
  backendPid = child.pid
  fs.writeFileSync(path.join(ROOT, ".backend.pid"), String(child.pid))
}

function stopBackend() {
  if (backendPid) {
    try {
      process.kill(backendPid)
    } catch {}
    backendPid = null
  }
  if (backendLog) {
    try {
      fs.closeSync(backendLog)
    } catch {}
    backendLog = null
  }
  try {
    fs.rmSync(path.join(ROOT, ".backend.pid"))
  } catch {}
}

async function isBackendUp() {
  try {
    const res = await fetch("http://127.0.0.1:8765/health", { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

async function waitForBackend(timeoutMs = 180000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isBackendUp()) return true
    await sleep(3000)
  }
  return false
}

async function launch() {
  if (await isBackendUp()) {
    ok("El backend ya responde en http://127.0.0.1:8765")
  } else {
    say("Arrancando ml-core (FastAPI) en http://127.0.0.1:8765 ...")
    startBackend()
    if (await waitForBackend()) {
      ok("Backend listo (primer arranque: ~1-2 min descargando modelos)")
    } else {
      warn("El backend no respondió a tiempo. Revisa ml-core/backend.log")
    }
  }
  process.on("SIGINT", () => {
    stopBackend()
    process.exit(130)
  })
  process.on("SIGTERM", () => {
    stopBackend()
    process.exit(143)
  })
  say("Arrancando la app de escritorio (Electron)...  Ctrl+C detiene todo.")
  try {
    run("corepack pnpm dev", { cwd: ROOT })
  } catch {
  } finally {
    stopBackend()
  }
}

async function main() {
  const args = process.argv.slice(2)
  let setupOnly = false
  for (const arg of args) {
    if (arg === "--setup-only") setupOnly = true
    else if (arg === "--help" || arg === "-h") {
      usage()
      return
    } else die(`Argumento desconocido: ${arg} (usa --help)`)
  }
  say("Cafebot setup — comenzando")
  preflight()
  ensureUv()
  say("Instalando dependencias JS (corepack pnpm install)...")
  run("corepack pnpm install", { cwd: ROOT })
  ensureElectron()
  say("Instalando backend Python (uv sync)...")
  run("uv sync", { cwd: ML_CORE })
  await fixLzma()
  say("Compilando mensajes Paraglide (i18n)...")
  run("corepack pnpm --filter @cafebot/i18n compile", { cwd: ROOT })
  try {
    run("corepack pnpm type-check", { cwd: ROOT })
    ok("type-check OK")
  } catch {
    warn("type-check falló; revisa con 'corepack pnpm type-check'")
  }
  if (setupOnly) {
    ok("Setup completo. Arranca con: corepack pnpm setup")
    return
  }
  await launch()
}

main().catch((e) => die(e && e.message ? e.message : String(e)))