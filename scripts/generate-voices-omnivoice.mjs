// ═══════════════════════════════════════════════════════
// Generate premium voice-cloned lines via k2-fsa/OmniVoice HF Space.
//
// Uses the reference audio at ./musica principal.mp3 (user-provided)
// with a user-provided transcription to clone the voice, then synthesises
// the two ceremonial lines (opening + closing) that are wired into the
// app via public/audio/voices/premium/manifest.json.
//
// Output: public/audio/voices/premium/opening.wav and closing.wav.
// WAV (not mp3) because OmniVoice returns wav and the browser's
// decodeAudioData handles both transparently.
// ═══════════════════════════════════════════════════════

import { Client } from '@gradio/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const REF_AUDIO = path.resolve('musica principal.mp3');
const REF_TEXT =
  'Buenos días jefe, es hora de levantarse vamos a por lo que nos pertenece, ' +
  'conoces esa sensación de que naciste predestinado a ganar, bueno... ' +
  'aun no hemos llegado a esto pero sabemos que es solo cuestión de tiempo, ' +
  'solo hay que seguir luchando cada día. Su éxito, jefe es inevitable';

const OUTPUT_DIR = path.resolve('public/audio/voices/premium');

const LINES = [
  {
    file: 'opening.wav',
    text:
      'Sistema en línea. Sincronización completa. Jugador detectado. ' +
      'El protocolo comienza ahora. Bienvenido.',
  },
  {
    file: 'closing.wav',
    text:
      'Protocolo completo. Doce fases ejecutadas. ' +
      'El día es tuyo, Jugador. Nos vemos mañana al amanecer.',
  },
];

// Instruct prompt — OmniVoice only accepts a fixed vocabulary of tokens
// (age, gender, pitch, whisper, accent). Free-form prompts are rejected
// with a ValueError. Comma+space separated. Empty = rely purely on the
// reference audio's natural prosody, which is what we want for a clean
// voice clone.
const INSTRUCT = 'male, low pitch';

console.log('[omnivoice] loading reference audio:', REF_AUDIO);
const refBuf = await fs.readFile(REF_AUDIO);
console.log(`[omnivoice] reference audio size: ${(refBuf.length / 1024).toFixed(1)} KB`);
const refBlob = new Blob([refBuf], { type: 'audio/mpeg' });

const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
  console.warn('[omnivoice] WARNING: HF_TOKEN env var not set.');
  console.warn('[omnivoice] OmniVoice runs on ZeroGPU which requires a logged-in HF account.');
  console.warn('[omnivoice] Anonymous quota = 0s. Set $env:HF_TOKEN="hf_..." and retry.');
  console.warn('[omnivoice] Get a token at https://huggingface.co/settings/tokens');
}
console.log('[omnivoice] connecting to Space k2-fsa/OmniVoice...');
const app = await Client.connect('k2-fsa/OmniVoice', HF_TOKEN ? { token: HF_TOKEN } : {});
console.log('[omnivoice] connected.');

await fs.mkdir(OUTPUT_DIR, { recursive: true });

for (const line of LINES) {
  const outPathPre = path.join(OUTPUT_DIR, line.file);
  try {
    const existing = await fs.stat(outPathPre);
    if (existing.size > 0) {
      console.log(`[omnivoice] skip "${line.file}" (already exists, ${(existing.size / 1024).toFixed(1)} KB)`);
      continue;
    }
  } catch { /* not found, proceed */ }

  console.log(`[omnivoice] generating "${line.file}"`);
  console.log(`           text: "${line.text.slice(0, 72)}${line.text.length > 72 ? '…' : ''}"`);
  const t0 = Date.now();

  let result;
  try {
    result = await app.predict('/_clone_fn', [
      line.text,   // Text to Synthesize
      'Spanish',   // Language
      refBlob,     // Reference Audio
      REF_TEXT,    // Reference Text
      INSTRUCT,    // Instruct
      32,          // Inference Steps
      2.0,         // Guidance Scale (CFG)
      true,        // Denoise
      1.0,         // Speed
      0,           // Duration (0 = auto)
      true,        // Preprocess Prompt
      true,        // Postprocess Output
    ]);
  } catch (err) {
    console.error('[omnivoice] predict failed:', err);
    process.exitCode = 1;
    continue;
  }

  const ms = Date.now() - t0;
  const audio = result?.data?.[0];
  const status = result?.data?.[1];
  if (!audio) {
    console.error(`[omnivoice] no audio returned. status="${status}"`);
    process.exitCode = 1;
    continue;
  }

  // Gradio returns the audio as either a string URL or an object with
  // { url, path, name, ... }. Normalise.
  const url =
    typeof audio === 'string'
      ? audio
      : audio.url || audio.path || (audio.data && audio.data.url);
  if (!url) {
    console.error('[omnivoice] could not extract URL from audio payload:', audio);
    process.exitCode = 1;
    continue;
  }

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[omnivoice] fetch ${url} -> ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUTPUT_DIR, line.file);
  await fs.writeFile(outPath, buf);
  console.log(
    `[omnivoice] saved ${line.file} (${(buf.length / 1024).toFixed(1)} KB) in ${(ms / 1000).toFixed(1)} s. status="${status}"`,
  );
}

console.log('[omnivoice] done.');
