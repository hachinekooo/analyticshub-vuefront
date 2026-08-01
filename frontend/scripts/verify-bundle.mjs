import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const maxRawBytes = 550_000
const maxGzipBytes = 180_000
const bundleDirectory = fileURLToPath(new URL('../dist/assets/js/', import.meta.url))

const bundles = readdirSync(bundleDirectory)
  .filter((name) => name.endsWith('.js'))
  .map((name) => {
    const content = readFileSync(new URL(`../dist/assets/js/${name}`, import.meta.url))
    return { name, rawBytes: content.byteLength, gzipBytes: gzipSync(content).byteLength }
  })
  .sort((left, right) => right.rawBytes - left.rawBytes)

if (bundles.length === 0) throw new Error(`No JavaScript bundles found in ${bundleDirectory}`)

const violations = bundles.filter(
  ({ rawBytes, gzipBytes }) => rawBytes > maxRawBytes || gzipBytes > maxGzipBytes,
)

if (violations.length > 0) {
  const details = violations
    .map(({ name, rawBytes, gzipBytes }) => `${name}: ${rawBytes} bytes raw, ${gzipBytes} bytes gzip`)
    .join('\n')
  throw new Error(
    `Bundle budget exceeded (max ${maxRawBytes} raw / ${maxGzipBytes} gzip bytes):\n${details}`,
  )
}

const largestRaw = bundles[0]
const largestGzip = [...bundles].sort((left, right) => right.gzipBytes - left.gzipBytes)[0]
console.log(
  `Bundle budget ok: ${bundles.length} JS chunks; largest raw ${largestRaw.name} `
    + `${largestRaw.rawBytes} bytes; largest gzip ${largestGzip.name} ${largestGzip.gzipBytes} bytes.`,
)
