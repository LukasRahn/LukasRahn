// Builds assets/banner-dark.svg and assets/banner-light.svg.
//
// All lettering is converted to outlines, so the banner looks the same on every
// machine and needs no font at view time. To rebuild after changing the text:
//
//   npm i --no-save opentype.js @fontsource/cascadia-mono
//   node assets/build-banner.mjs
//
// Typeface: Cascadia Mono (SIL Open Font License 1.1).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'

const here = dirname(fileURLToPath(import.meta.url))
const fontDir = join(process.cwd(), 'node_modules/@fontsource/cascadia-mono/files')

function loadFont(weight) {
  const buf = readFileSync(join(fontDir, `cascadia-mono-latin-${weight}-normal.woff`))
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

const fonts = { 400: loadFont(400), 600: loadFont(600), 700: loadFont(700) }

const W = 1280
const H = 400
const GAP = 12
const RADIUS = 10
const HEADER = 42

const THEMES = {
  dark: {
    pane: '#1a1a1a',
    header: '#222222',
    border: '#333333',
    active: '#5fa3a3',
    text: '#e6e6e6',
    dim: '#9a9a9a',
    bar: '#2b2b2b',
    accent: '#74b8b8',
    working: '#95c795',
    idle: '#6e6e6e',
  },
  light: {
    pane: '#f6f6f4',
    header: '#ecece9',
    border: '#d5d5d1',
    active: '#2f7d7d',
    text: '#1f1f1f',
    dim: '#5c6063',
    bar: '#dcdcd8',
    accent: '#2f7d7d',
    working: '#1a7f37',
    idle: '#a3a3a0',
  },
}

const n = (v) => Math.round(v * 100) / 100

// One run of outlined text. Returns the path data and where the run ends.
function outline(str, x, baseline, size, weight, { tracking = 0, anchor = 'start' } = {}) {
  const font = fonts[weight]
  const scale = size / font.unitsPerEm
  const glyphs = font.stringToGlyphs(str)
  const width = glyphs.reduce((sum, g) => sum + g.advanceWidth * scale + tracking, 0) - tracking
  let cx = anchor === 'end' ? x - width : x
  let d = ''
  for (const g of glyphs) {
    d += g.getPath(cx, baseline, size).toPathData(1)
    cx += g.advanceWidth * scale + tracking
  }
  return { d, endX: cx - tracking }
}

function glyphs(fill, ...runs) {
  return `<path fill="${fill}" d="${runs.map((r) => r.d).join('')}"/>`
}

// A pane: body, header strip with a status dot and a name, and its border on top.
function pane(t, { x, y, w, h, name, label, dot, active = false, bars = [] }) {
  const r = RADIUS
  const top = `M${x},${y + HEADER}V${y + r}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}V${y + HEADER}z`
  const mid = y + HEADER / 2
  const out = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${t.pane}"/>`,
    `<path d="${top}" fill="${t.header}"/>`,
    `<path d="M${x},${y + HEADER}h${w}" stroke="${t.border}"/>`,
    `<circle cx="${x + 22}" cy="${mid}" r="5" fill="${dot}"/>`,
    glyphs(t.text, outline(name, x + 38, mid + 6.5, 18, 600)),
  ]
  if (label) out.push(glyphs(t.dim, outline(label, x + w - 18, mid + 6, 16, 400, { anchor: 'end' })))
  let by = y + HEADER + 22
  for (const width of bars) {
    out.push(`<rect x="${x + 18}" y="${by}" width="${width}" height="8" rx="4" fill="${t.bar}"/>`)
    by += 20
  }
  out.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${active ? t.active : t.border}" stroke-width="${active ? 2 : 1}"/>`,
  )
  return out.join('\n')
}

function banner(t) {
  const inset = 1 // keeps the 2px active border inside the viewBox
  const leftW = 778
  const rightX = inset + leftW + GAP
  const rightW = W - inset - rightX
  const halfW = (rightW - GAP) / 2
  const rowB = 94
  const rowM = 94
  const rowT = H - 2 * inset - rowM - rowB - 2 * GAP

  const me = { x: inset, y: inset, w: leftW, h: H - 2 * inset }
  // Two runs, so the word gap can be narrower than a full monospace cell.
  const first = outline('Lukas', me.x + 44, 206, 98, 700, { tracking: -3 })
  const last = outline('Rahn', first.endX + 34, 206, 98, 700, { tracking: -3 })
  const line1 = outline('I build developer tools. Lately a terminal', me.x + 48, 268, 26, 400)
  const line2 = outline('that runs many sessions side by side.', me.x + 48, 305, 26, 400)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">Lukas Rahn. I build developer tools. Lately a terminal that runs many sessions side by side.</title>
<style>.caret{animation:blink 1.2s steps(1,end) infinite}@keyframes blink{50%{opacity:0}}@media (prefers-reduced-motion:reduce){.caret{animation:none}}</style>
${pane(t, { ...me, name: 'LukasRahn', label: 'just coding', dot: t.accent, active: true })}
${glyphs(t.text, first, last)}
${glyphs(t.dim, line1, line2)}
<rect class="caret" x="${n(line2.endX + 8)}" y="282" width="14" height="29" rx="2" fill="${t.accent}"/>
${pane(t, { x: rightX, y: inset, w: rightW, h: rowT, name: 'Manifold', label: 'TypeScript', dot: t.working, bars: [300, 196, 252, 128] })}
${pane(t, { x: rightX, y: inset + rowT + GAP, w: rightW, h: rowM, name: 'claude-pulse', label: 'JavaScript', dot: t.accent, bars: [224] })}
${pane(t, { x: rightX, y: H - inset - rowB, w: halfW, h: rowB, name: 'TradeRepublicApi', dot: t.idle, bars: [132] })}
${pane(t, { x: rightX + halfW + GAP, y: H - inset - rowB, w: halfW, h: rowB, name: 'Streamdeck-Plugin', dot: t.idle, bars: [96] })}
</svg>
`
}

for (const [name, theme] of Object.entries(THEMES)) {
  const file = join(here, `banner-${name}.svg`)
  writeFileSync(file, banner(theme))
  console.log(`${file}  ${(readFileSync(file).length / 1024).toFixed(1)} KB`)
}
