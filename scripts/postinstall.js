const fs = require('fs')
const path = require('path')

function patchRollup() {
  const rollupFile = path.join(__dirname, 'node_modules/rollup/dist/es/shared/node-entry.js')
  if (!fs.existsSync(rollupFile)) {
    console.log('[postinstall] rollup file not found, skipping patch')
    return
  }

  let content = fs.readFileSync(rollupFile, 'utf-8')
  const target = "plugin.name = `${anonymousPrefix}${index + 1}`;"
  const replacement = "try { plugin.name = `${anonymousPrefix}${index + 1}`; } catch(e) { Object.defineProperty(plugin, 'name', { value: `${anonymousPrefix}${index + 1}`, configurable: true }); }"

  if (content.includes(replacement)) {
    console.log('[postinstall] rollup already patched')
    return
  }

  if (content.includes(target)) {
    content = content.replace(target, replacement)
    fs.writeFileSync(rollupFile, content, 'utf-8')
    console.log('[postinstall] rollup patched successfully')
  } else {
    console.log('[postinstall] rollup target not found, skipping')
  }
}

function createSsrEntry() {
  const ssrDir = path.join(__dirname, 'node_modules/@dcloudio/vite-plugin-uni/lib/ssr')
  const entryFile = path.join(ssrDir, 'entry-server.js')

  if (!fs.existsSync(ssrDir)) {
    fs.mkdirSync(ssrDir, { recursive: true })
  }

  if (!fs.existsSync(entryFile)) {
    fs.writeFileSync(entryFile, "export default async function (context) { return {} }\n", 'utf-8')
    console.log('[postinstall] SSR entry-server.js created')
  } else {
    console.log('[postinstall] SSR entry-server.js already exists')
  }
}

patchRollup()
createSsrEntry()
