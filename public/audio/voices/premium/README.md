# Premium voice overrides

Drop-in folder for hand-recorded mp3s that override the auto-generated
Qwen3-TTS Alek voice. Used for the ceremonial opener and closer where
the "slow premium" voice is preferred.

## Convention

`manifest.json` maps the **exact spoken text** to a file name in this
folder. At runtime, `Operator.speak(text)` checks this manifest first;
if the text matches, the corresponding mp3 is played through the shared
WebAudio graph (same as the hash-manifest mp3s, so ducking and iOS
ringer-switch bypass behave identically).

## Current entries

| Spoken text                                            | File          |
|--------------------------------------------------------|---------------|
| `Sistema en línea. Operador detectado. Bienvenido.`    | `opening.mp3` |
| `Protocolo completo. El día es tuyo, Operador.`        | `closing.mp3` |

If a file is missing, the runtime falls back to:
1. the hash-manifest mp3 (Qwen3-TTS Alek) for the same text if present, or
2. native SpeechSynthesis as a last resort.

## Adding more overrides

1. Record / generate the mp3 with the premium voice.
2. Drop it in this folder, e.g. `phase-genesis.mp3`.
3. Add an entry to `manifest.json`:
   ```json
   "Operador. Fase uno. Génesis. Confirma tu presencia. ...": { "file": "phase-genesis.mp3" }
   ```
   The key MUST match the exact spoken text (same string passed to
   `operator.speak()`; for per-phase briefings, the value of
   `mission.voiceLineBriefing` in `src/lib/constants.ts`).

## Notes

- Keep mp3s mono 44.1 kHz CBR 96 kbps or so — they decode faster on
  mobile and the quality difference vs stereo is negligible for voice.
- The premium manifest is loaded with `cache: 'no-cache'` so edits show
  up on next reload without needing a hash bump.
- Files in this folder are committed to the repo as part of the deploy.
