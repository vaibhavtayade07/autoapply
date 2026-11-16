# AutoApply

**One-click autofill for job applications.** A Chrome extension (Manifest V3) that detects application forms on startup job portals, fills them from your saved profile, and shows a preview before anything is submitted.

<p>
<img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white">
<img alt="React 18" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
<img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
<img alt="License" src="https://img.shields.io/badge/License-MIT-green">
</p>

---

## Why

Applying to 30 jobs means retyping the same 40 fields 30 times. AutoApply reads the form, maps your profile to the right inputs, and fills it — while keeping you in control with a preview-and-confirm step.

## Features

- **Portal-aware adapters** — dedicated handling for Greenhouse, Lever, Wellfound, and Startup.jobs, plus a generic adapter that handles standard HTML forms.
- **Preview before fill** — a floating overlay shows exactly which fields will be populated; nothing is submitted for you.
- **Side panel profile** — a persistent side panel for editing your profile, saved answers, and resume metadata.
- **Onboarding flow** — first-run wizard captures your profile in minutes.
- **React-driven input setting** — uses native property setters and `DataTransfer` events so React-controlled forms (the ones that silently ignore `.value =`) accept the data.
- **Local-first** — everything lives in `chrome.storage.local`. No backend, no account, no data leaves your browser.

## How it works

```
page DOM ──► PortalDetector ──► AutoFillEngine ──► PortalAdapter (greenhouse | lever | wellfound | generic)
                                                    │
                                     FormField[] ───┘
                                          │
                                    Preview overlay ──► user confirms ──► nativeSetter / DataTransfer
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full component diagram, message-passing protocol, and storage schema.

## Quickstart

```bash
npm install        # install dependencies
npm run build      # production build → dist/
npm run dev        # watch mode
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `dist/` folder
4. Open any supported job application page — the overlay appears

Full instructions in [`LOAD_INSTRUCTIONS.md`](LOAD_INSTRUCTIONS.md).

## Tech stack

| Layer | Choice |
|---|---|
| Extension | Chrome Manifest V3 (service worker + content scripts + side panel) |
| UI | React 18, Tailwind CSS 4 |
| Build | Vite 6 + `@crxjs/vite-plugin` |
| Language | TypeScript 5 |

## Project structure

```
src/
├── background/     # service worker, message router, storage wrappers
├── content/        # detector, autofill engine, overlay UI
├── adapters/       # per-portal field mappers (greenhouse, lever, wellfound, generic)
├── popup/          # side-panel app + onboarding
└── shared/         # constants, db, messaging types
```

## Roadmap

- [ ] Workday + SmartRecruiters adapters
- [ ] Resume upload automation
- [ ] Cover-letter templating
- [ ] Firefox build (MV3)

## License

MIT — see [LICENSE](LICENSE).
