// ═══════════════════════════════════════════════════════
// generate-voices-qwen.mjs — Pre-generate TTS mp3s from the
// Qwen3-TTS-Demo public Hugging Face Space (free, no API key).
//
// Same output contract as generate-voices.mjs (Edge TTS): writes
// public/audio/voices/<hash>.mp3 + manifest.json, consumed at
// runtime by src/lib/operator.ts.
//
// Run with:  npm run generate-voices
//
// Configurable via env:
//   VOICE     default "Alek / 俄语-阿列克"
//   LANGUAGE  default "Spanish / 西班牙语"
// ═══════════════════════════════════════════════════════

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@gradio/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Config ────────────────────────────────────────────
const SPACE = 'Qwen/Qwen3-TTS-Demo';
const VOICE = process.env.VOICE || 'Alek / 俄语-阿列克';
const LANGUAGE = process.env.LANGUAGE || 'Spanish / 西班牙语';
const ENDPOINT = '/tts_interface';

const OUT_DIR = path.join(ROOT, 'public', 'audio', 'voices');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');
const CONSTANTS = path.join(ROOT, 'src', 'lib', 'constants.ts');

// Throttle between requests — the Space is a shared free resource.
const REQUEST_DELAY_MS = Number(process.env.DELAY_MS || 1500);

// ─── Extract lines from constants.ts ───────────────────
// v7.7+: single voiceLineBriefing per phase. The previous design that
// generated separate mp3s per line (voiceLine / narration / coaching /
// complete / transition) caused abrupt voice-timbre shifts between
// lines because Qwen is stochastic across separate requests. One line
// per phase = one Qwen generation = consistent voice.
function extractLines(src) {
  const lines = new Set();
  for (const m of src.matchAll(
    /voiceLineBriefing:\s*'((?:\\'|[^'])+)'/g,
  )) {
    lines.add(m[1].replace(/\\'/g, "'"));
  }
  return [...lines];
}

// Extra hand-written lines spoken outside of MissionPhase. Intro and
// outro will normally be served by /voices/premium/*.wav (voice-cloned
// OmniVoice), but we also pre-generate a Qwen fallback so the app still
// has audio if the premium files are missing.
const EXTRA_LINES = [
  'Sistema en línea. Sincronización completa. Jugador detectado. El protocolo comienza ahora. Bienvenido.',
  'Protocolo completo. Doce fases ejecutadas. El día es tuyo, Jugador. Nos vemos mañana al amanecer.',
];

function hashLine(text) {
  return crypto
    .createHash('sha1')
    .update(`qwen|${VOICE}|${LANGUAGE}|${text}`)
    .digest('hex')
    .slice(0, 16);
}

// ─── Main ──────────────────────────────────────────────
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const src = await fs.readFile(CONSTANTS, 'utf8');
  const allLines = [...new Set([...extractLines(src), ...EXTRA_LINES])];

  console.log(`[qwen-tts] space=${SPACE}`);
  console.log(`[qwen-tts] voice=${VOICE}`);
  console.log(`[qwen-tts] language=${LANGUAGE}`);
  console.log(`[qwen-tts] ${allLines.length} unique lines.`);

  // Load existing manifest for caching.
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch { /* fresh */ }

  // Connect to the Space.
  console.log('[qwen-tts] connecting to Space...');
  const client = await Client.connect(SPACE);
  console.log('[qwen-tts] connected.');

  const manifest = {
    source: `huggingface.co/spaces/${SPACE}`,
    voice: VOICE,
    language: LANGUAGE,
    generatedAt: new Date().toISOString(),
    lines: {},
  };

  let generated = 0;
  let cached = 0;
  let totalBytes = 0;
  let index = 0;

  for (const text of allLines) {
    index++;
    const hash = hashLine(text);
    const filename = `${hash}.mp3`;
    const outFile = path.join(OUT_DIR, filename);

    const wasCached =
      existing.lines?.[text]?.file === filename &&
      (await fs.stat(outFile).catch(() => null));

    if (wasCached) {
      cached++;
      manifest.lines[text] = { file: filename };
      continue;
    }

    const preview = text.length > 48 ? `${text.slice(0, 48)}…` : text;
    process.stdout.write(
      `[qwen-tts] (${index}/${allLines.length}) "${preview}" ... `,
    );

    try {
      const result = await client.predict(ENDPOINT, {
        text,
        voice_display: VOICE,
        language_display: LANGUAGE,
      });

      // Result is an array-like; the audio FileData is typically at [0].
      const file = Array.isArray(result.data) ? result.data[0] : result.data;
      const url = file?.url || file?.path;
      if (!url) throw new Error('no audio url in response');

      // The URL can be an absolute https URL to the Space's /file= endpoint.
      const absUrl = url.startsWith('http')
        ? url
        : `https://qwen-qwen3-tts-demo.hf.space/file=${url}`;

      const res = await fetch(absUrl);
      if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(outFile, buf);

      totalBytes += buf.length;
      generated++;
      process.stdout.write(`OK ${(buf.length / 1024).toFixed(0)}KB\n`);

      manifest.lines[text] = { file: filename };
    } catch (err) {
      process.stdout.write(`FAIL ${err.message}\n`);
    }

    // Throttle to be polite with the shared Space.
    if (index < allLines.length) {
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(
    `[qwen-tts] done. generated=${generated} cached=${cached} size=+${(totalBytes / 1024).toFixed(1)} KB`,
  );
}

main().catch((err) => {
  console.error('[qwen-tts] FAILED:', err);
  process.exit(1);
});
