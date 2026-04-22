# Premium voice overrides

Drop-in folder for voice-cloned mp3s that override the auto-generated
Qwen3-TTS Alek voice. The app checks this folder **first** for every
line spoken via `Operator.speak()`; if the line matches a key in
`manifest.json`, the corresponding mp3 plays. Otherwise it falls back
to the hash-manifest Qwen mp3 (already pre-generated) and finally to
the browser's SpeechSynthesis.

## Casting — 3 voices across 14 lines

The protocol is split into **three emotional registers** mapped to
three cloned voices:

| Register                    | When to use                            | Personality                       |
|-----------------------------|----------------------------------------|-----------------------------------|
| **A · Hombre motivación intensa** | Physical push, wake-up, cold, cardio | Commanding, urgent, energizing    |
| **B · Mujer motivadora suave**    | Body care, hydration, nutrition, rest | Calm, grounded, caring            |
| **C · Mujer mentalidad**          | Cognitive work, stoicism, clarity     | Analytical, focused, measured     |

### Full casting table

| # | File                | Fase                    | Voz | Racional                                                    |
|---|---------------------|-------------------------|-----|-------------------------------------------------------------|
| 0 | `00-opening.mp3`    | Intro ceremonial        | **A** | Despertar el sistema, tono de comando                     |
| 1 | `01-genesis.mp3`    | Despertar + cama        | **A** | "Primer acto": empuje para salir de la cama                |
| 2 | `02-aqua.mp3`       | Hidratación             | **B** | Cuidado corporal, calma post-despertar                     |
| 3 | `03-flex.mp3`       | Movilidad / stretching  | **B** | Movimiento cuidadoso, respiración                          |
| 4 | `04-surge.mp3`      | Cardio / correr         | **A** | Salir al frío, correr, empuje físico                       |
| 5 | `05-forge.mp3`      | Fuerza                  | **A** | Levantar peso, densidad, "sin excusas"                     |
| 6 | `06-pneuma.mp3`     | Respiración Wim Hof     | **B** | Ojos cerrados, hiperventilación guiada, calma              |
| 7 | `07-cryo.mp3`       | Ducha fría              | **A** | Dominar reflejo de huida, resistir el impulso              |
| 8 | `08-refuel.mp3`     | Desayuno                | **B** | Comer con calma, nutrición, sin prisa                      |
| 9 | `09-helio.mp3`      | Luz solar + entorno     | **C** | Claridad, ritmo circadiano, organizar espacio              |
| 10 | `10-void.mp3`      | Meditación estoica      | **C** | Premeditatio Malorum, análisis mental                      |
| 11 | `11-codex.mp3`     | Journaling              | **C** | Escribir a mano, claridad de pensamiento                   |
| 12 | `12-cipher.mp3`    | Lectura + Active Recall | **C** | Extraer idea, estructurar conocimiento                     |
| 13 | `13-closing.mp3`   | Outro ceremonial        | **B** | Cierre sereno, "nos vemos mañana"                          |

Distribución: **5 × A (intenso)**, **5 × B (suave)**, **4 × C (mentalidad)**.

Cada bloque del día tiene su curva emocional:

- **Bloque 1 · Fragua oscura (fases 1-7)**: alterna **A** (empuje físico) con **B**
  (cuidado corporal) — el cuerpo oscila entre estrés y recuperación.
- **Bloque 2 · Ventana anabólica (fase 8)**: **B** sola — transición reparadora.
- **Bloque 3 · Filo cognitivo (fases 9-12)**: **C** sostenida — mente analítica.
- **Outro**: **B** — descanso ganado.

## Cómo generar los 14 mp3s con Fish Audio

1. Crea cuenta en https://fish.audio (gratis).
2. Sube cada una de tus 3 voces de referencia como **"Voice clone"**. Dales nombres claros:
   - `Voz A · Hombre intenso`
   - `Voz B · Mujer suave`
   - `Voz C · Mujer mentalidad`
3. Para cada fila de la tabla: abre el generador, selecciona la voz
   correspondiente (A/B/C), pega el texto exacto del `manifest.json`
   (la key de la entry), genera, descarga como `.mp3`.
4. Renómbralo al nombre de archivo de la tabla (`00-opening.mp3`, etc.).
5. Déjalo en esta carpeta.
6. Commit + push → en ~1 min estará en tu iPhone.

## Textos exactos a sintetizar

Están **todos** en `manifest.json` como las keys de cada entry. Copia
tal cual — un carácter distinto rompe el match y la app usa el fallback
Qwen en su lugar (la app no se rompe, solo no usará tu clon premium).

## Formato

- **Mp3**, mono, 44.1 kHz, 96-128 kbps — suficiente para voz y ligero.
- Fish Audio exporta en este rango por defecto.
- Si lo descargas como `.wav`, convierte o cambia la extensión en `manifest.json`.

## Cómo funciona el fallback

En `src/lib/operator.ts`, `Operator.speak(text)`:

1. Busca `text` en `public/audio/voices/premium/manifest.json`.
   Si match → fetch ese mp3 → reproduce vía WebAudio.
2. Si no, busca `text` en `public/audio/voices/manifest.json` (hash manifest).
   Si match → fetch el mp3 hash → reproduce. *(Siempre presente para las 14 líneas.)*
3. Si no, `speechSynthesis.speak(text)` con voz nativa del OS.

Esto significa que **puedes subir los 14 mp3s de a uno**, sin romper nada.
Los que faltan usan la voz Qwen Alek (ya generada, suena bien).
