// ═══════════════════════════════════════════════════════
// generate-voices.mjs — Pre-generate TTS mp3s from Microsoft
// Edge Neural voices (free, no API key). Reads all voiceLine*
// and coachingLines from src/lib/constants.ts plus a few hardcoded
// lines, produces public/audio/voices/<hash>.mp3 with a manifest
// JSON mapping "text" -> "filename" consumed at runtime.
//
// Run with:  npm run generate-voices
//
// Safe to re-run: only regenerates lines whose text hash changed.
// ═══════════════════════════════════════════════════════

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Config ────────────────────────────────────────────
const VOICE = process.env.VOICE || 'es-ES-AlvaroNeural';
// Slightly slower + lower pitch = more JARVIS-like
const RATE  = process.env.VOICE_RATE  || '-6%';
const PITCH = process.env.VOICE_PITCH || '-4Hz';

const OUT_DIR = path.join(ROOT, 'public', 'audio', 'voices');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const CONSTANTS = path.join(ROOT, 'src', 'lib', 'constants.ts');

// ─── Extract voice lines from constants.ts ──────────────
// Simple regex-based extraction — constants.ts is static and
// all strings use single quotes with no interpolation.
function extractLines(src) {
  const lines = new Set();

  // voiceLine: '...'
  for (const m of src.matchAll(/voiceLine(?:Complete)?:\s*'((?:\\'|[^'])+)'/g)) {
    lines.add(m[1].replace(/\\'/g, "'"));
  }

  // coachingLines: [ '...', '...' ]
  for (const m of src.matchAll(/coachingLines:\s*\[([\s\S]*?)\]/g)) {
    const body = m[1];
    for (const s of body.matchAll(/'((?:\\'|[^'])+)'/g)) {
      lines.add(s[1].replace(/\\'/g, "'"));
    }
  }

  return [...lines];
}

// Extra hardcoded lines living outside constants.ts
const EXTRA_LINES = [
  'Protocolo completo. El día es tuyo, Operador.',
];

// ─── Hash helper ────────────────────────────────────────
function hashLine(text) {
  return crypto
    .createHash('sha1')
    .update(`${VOICE}|${RATE}|${PITCH}|${text}`)
    .digest('hex')
    .slice(0, 16);
}

// ─── Generate a single mp3 ─────────────────────────────
async function synth(tts, text, outFile) {
  // msedge-tts exposes a stream API. We collect chunks into a buffer.
  const { audioStream } = await tts.toStream(text);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', (c) => chunks.push(c));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
  });
  const buf = Buffer.concat(chunks);
  await fs.writeFile(outFile, buf);
  return buf.length;
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const src = await fs.readFile(CONSTANTS, 'utf8');
  const allLines = [...new Set([...extractLines(src), ...EXTRA_LINES])];

  console.log(`[voices] voice=${VOICE} rate=${RATE} pitch=${PITCH}`);
  console.log(`[voices] ${allLines.length} unique lines to process.`);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
    rate: RATE,
    pitch: PITCH,
    volume: '+0%',
  });

  // Load existing manifest if present to skip unchanged lines.
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    /* no manifest yet */
  }

  const manifest = {
    voice: VOICE,
    rate: RATE,
    pitch: PITCH,
    generatedAt: new Date().toISOString(),
    lines: {},
  };

  let generated = 0;
  let cached = 0;
  let totalBytes = 0;

  for (const text of allLines) {
    const hash = hashLine(text);
    const filename = `${hash}.mp3`;
    const outFile = path.join(OUT_DIR, filename);

    const wasCached =
      existing.lines?.[text]?.file === filename &&
      (await fs.stat(outFile).catch(() => null));

    if (wasCached) {
      cached++;
    } else {
      process.stdout.write(`[voices] synth → "${text.slice(0, 48)}${text.length > 48 ? '…' : ''}"\n`);
      const bytes = await synth(tts, text, outFile);
      totalBytes += bytes;
      generated++;
    }

    manifest.lines[text] = { file: filename };
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`[voices] done. generated=${generated} cached=${cached} size=+${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`[voices] manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main().catch((err) => {
  console.error('[voices] FAILED:', err);
  process.exit(1);
});
