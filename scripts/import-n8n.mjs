import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workflowsDir = path.join(rootDir, 'n8n')
const checkOnly = process.argv.includes('--check-only')
const isWindows = process.platform === 'win32'
const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'n8n'

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}

function runN8n(args) {
  const commandArgs = isWindows ? ['/d', '/s', '/c', 'n8n', ...args] : args
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    timeout: 300_000,
    windowsHide: true,
  })

  if (result.error?.code === 'ENOENT') {
    fail('n8n no está instalado. Ejecuta: npm install --global n8n')
  }

  if (result.error?.code === 'ETIMEDOUT') {
    fail('n8n no respondió. Detén el servidor local antes de importar y vuelve a ejecutar el comando.')
  }

  if (result.error) {
    fail(`no se pudo ejecutar n8n: ${result.error.message}`)
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'fallo desconocido').trim()
    fail(`n8n ${args[0]} falló: ${detail}`)
  }

  return result.stdout.trim()
}

if (!existsSync(workflowsDir)) {
  fail(`no existe el directorio ${workflowsDir}`)
}

const workflows = readdirSync(workflowsDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => {
    const fullPath = path.join(workflowsDir, file)
    let workflow

    try {
      workflow = JSON.parse(readFileSync(fullPath, 'utf8'))
    } catch (error) {
      fail(`${file} no contiene JSON válido: ${error.message}`)
    }

    if (!workflow.name || !Array.isArray(workflow.nodes) || !workflow.connections) {
      fail(`${file} no tiene la estructura mínima de un workflow de n8n`)
    }

    return { file, fullPath, name: workflow.name }
  })

if (workflows.length === 0) {
  fail('no hay workflows JSON para importar')
}

console.log(`Workflows válidos: ${workflows.length}`)

if (checkOnly) {
  for (const workflow of workflows) console.log(`- ${workflow.name}`)
  process.exit(0)
}

console.log('Consultando los workflows instalados; n8n puede tardar unos minutos en iniciar...')
const installedNames = new Set(
  runN8n(['list:workflow'])
    .split(/\r?\n/)
    .map((line) => line.match(/^[^|]+\|(.+)$/)?.[1]?.trim())
    .filter(Boolean),
)

const missing = workflows.filter((workflow) => !installedNames.has(workflow.name))
const existing = workflows.filter((workflow) => installedNames.has(workflow.name))

for (const workflow of existing) console.log(`Ya existe: ${workflow.name}`)

if (missing.length > 0) {
  const importDir = mkdtempSync(path.join(tmpdir(), 'orquestai-n8n-'))
  try {
    for (const workflow of missing) copyFileSync(workflow.fullPath, path.join(importDir, workflow.file))
    runN8n(['import:workflow', '--separate', '--input', importDir])
    for (const workflow of missing) console.log(`Importado: ${workflow.name}`)
  } finally {
    rmSync(importDir, { recursive: true, force: true })
  }
}

console.log(`Listo: ${missing.length} importado(s), ${existing.length} existente(s).`)
