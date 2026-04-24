# Sleep ambient loops

Drop your real ambient MP3s here with the exact names below. The Night
Mode screen already wires them up by these filenames; no code change
required to swap placeholders for real audio.

| File              | Suggested content                    | Recommended length |
|-------------------|--------------------------------------|--------------------|
| `rain.mp3`        | Soft rain on a roof, no thunder      | 60–120 s, seamless loop |
| `ocean.mp3`       | Gentle waves rolling in, no seagulls | 60–120 s, seamless loop |
| `forest.mp3`      | Crickets + rustling leaves at dusk   | 60–120 s, seamless loop |
| `whitenoise.mp3`  | Even band-limited white/pink noise   | 30–60 s, seamless loop |
| `fire.mp3`        | Crackling fireplace, no voices       | 60–120 s, seamless loop |
| `drone.mp3`       | Warm ambient pad / drone             | 60–180 s, seamless loop |

## Encoding tips

- 128 kbps, 44.1 kHz, stereo or mono — whatever keeps the file under
  ~2 MB each.
- Make sure the first and last 20 ms fade in/out at sample level so
  the loop point is inaudible.
- Avoid sudden transients near the loop boundary.

## Why the current files are tiny

`rain.mp3` etc. are currently ~418-byte placeholders (one silent MPEG
frame). They are only here so the browser `<audio>` element can
instantiate without throwing. The `SleepSoundPicker` UI detects
`duration < 3 s` and shows a small "placeholder" badge on the card
so you know at a glance which tracks still need the real audio.
