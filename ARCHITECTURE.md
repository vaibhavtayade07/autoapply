# AutoApply — System Architecture

> Chrome Extension (Manifest V3) that auto-fills job applications on startup portals.
> Solo builder design — no over-engineering, no unnecessary services.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Component Diagram](#2-component-diagram)
3. [Message Passing Protocol](#3-message-passing-protocol)
4. [Storage Schema Design](#4-storage-schema-design)
5. [Build Configuration](#5-build-configuration)
6. [File-by-File Breakdown](#6-file-by-file-breakdown)
7. [Dependency List](#7-dependency-list)
8. [Key Decisions & Rationale](#8-key-decisions--rationale)

---

## 1. Project Structure

```
autoapply/
├── public/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── popup.html              # Side panel entry (MV3 side_panel)
├── src/
│   ├── background/
│   │   ├── index.ts             # Service worker entry — message router
│   │   ├── messages.ts          # Message type definitions & handlers
│   │   └── storage.ts           # chrome.storage.local CRUD wrappers
│   ├── content/
│   │   ├── index.ts             # Content script entry — injects everything
│   │   ├── detector.ts          # PortalDetector: URL + DOM sniffing
│   │   ├── engine.ts            # AutoFillEngine: orchestrates adapter calls
│   │   ├── overlay.tsx          # Floating button + preview panel (React root)
│   │   ├── styles.css           # Tailwind-imported styles for overlay
│   │   └── utils.ts             # Shared DOM helpers (nativeSetter, DataTransfer)
│   ├── adapters/
│   │   ├── types.ts             # PortalAdapter interface, FormField, PortalType
│   │   ├── greenhouse.ts        # GreenhouseAdapter
│   │   ├── lever.ts             # LeverAdapter
│   │   ├── wellfound.ts         # WellfoundAdapter
│   │   └── generic.ts           # GenericAdapter (heuristic fallback)
│   ├── sidepanel/
│   │   ├── index.tsx            # Side panel React root
│   │   ├── App.tsx              # Tab router: Profile | Resumes | Answers | Settings
│   │   ├── tabs/
│   │   │   ├── ProfileTab.tsx   # Profile form (name, email, links, etc.)
│   │   │   ├── ResumesTab.tsx   # Resume/cover letter upload + list
│   │   │   ├── AnswersTab.tsx   # Custom Q&A pairs with tags
│   │   │   └── SettingsTab.tsx  # Defaults, portal toggles, export/import
│   │   ├── Onboarding.tsx       # First-run wizard (3 steps)
│   │   └── components/
│   │       ├── FileUpload.tsx   # Drag-drop file upload to IndexedDB
│   │       ├── FieldEditor.tsx  # Reusable key-value editor for custom fields
│   │       └── StatusBadge.tsx  # Fill success/fail indicator
│   ├── shared/
│   │   ├── types.ts             # Profile, StoredFile, CustomAnswer, Settings
│   │   ├── constants.ts         # PortalType enum, STORAGE_KEYS, limits
│   │   ├── messaging.ts         # Typed message bus (content ↔ bg ↔ sidepanel)
│   │   └── db.ts                # IndexedDB wrapper (autoapply-files)
│   └── manifest.ts              # MV3 manifest (generated or manual)
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
├── package.json
└── .env                         # DEV_MODE flag only
```

**Rationale:** Single `src/` tree with `background/`, `content/`, `sidepanel/`, `adapters/`, `shared/` mirrors MV3's isolation boundaries while keeping everything in one build. No monorepo — solo builder doesn't need it.

---

## 2. Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    chrome.runtime     ┌──────────────────┐│
│  │   Side Panel      │◄──── sendMessage ────►│    Background    ││
│  │   (React/TSX)     │    onMessage         │    Service Wkr   ││
│  │                   │                       │                  ││
│  │  ┌─────────────┐ │                       │  ┌────────────┐  ││
│  │  │ ProfileTab   │ │                       │  │ Message    │  ││
│  │  │ ResumesTab   │ │                       │  │ Router     │  ││
│  │  │ AnswersTab   │ │                       │  ├────────────┤  ││
│  │  │ SettingsTab  │ │                       │  │ Storage    │  ││
│  │  └─────────────┘ │                       │  │ Manager    │  ││
│  └──────────────────┘                       │  └────────────┘  ││
│                                              └────────┬─────────┘│
│                                                       │          │
│                                        chrome.tabs   │          │
│                                        sendMessage   │          │
│                                                       ▼          │
│                                              ┌─────────────────┐ │
│                                              │  Content Script  │ │
│                                              │  (per tab)       │ │
│                                              │                  │ │
│                                              │ ┌──────────────┐ │ │
│                                              │ │PortalDetector│ │ │
│                                              │ │ URL+DOM sniff│ │ │
│                                              │ └──────┬───────┘ │ │
│                                              │        │         │ │
│                                              │        ▼         │ │
│                                              │ ┌──────────────┐ │ │
│                                              │ │ AutoFillEngine│ │ │
│                                              │ │ dispatches   │ │ │
│                                              │ └──────┬───────┘ │ │
│                                              │        │         │ │
│                                              │   ┌────┴────┐   │ │
│                                              │   ▼         ▼   │ │
│                                              │ ┌────────┐ ┌──┐ │ │
│                                              │ │Greenhse│ │..│ │ │
│                                              │ │Adapter │ │  │ │ │
│                                              │ └────────┘ └──┘ │ │
│                                              │                  │ │
│                                              │ ┌──────────────┐ │ │
│                                              │ │Overlay (FAB) │ │ │
│                                              │ │ Preview panel │ │ │
│                                              │ └──────────────┘ │ │
│                                              └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         Storage Layer                           │
│                                                                  │
│  ┌────────────────────────┐  ┌───────────────────────────────┐  │
│  │ chrome.storage.local   │  │ IndexedDB: autoapply-files    │  │
│  │ (5MB limit)            │  │ (unlimited)                   │  │
│  │                        │  │                               │  │
│  │  profile               │  │  ┌─────────────────────────┐  │  │
│  │  customAnswers         │  │  │ StoredFile              │  │  │
│  │  settings              │  │  │ id, label, type,        │  │  │
│  │  lastFillResult        │  │  │ fileName, mimeType,     │  │  │
│  │                        │  │  │ blob (ArrayBuffer),      │  │  │
│  └────────────────────────┘  │  │ size                     │  │  │
│                              │  └─────────────────────────┘  │  │
│                              └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for one fill operation:**

```
1. User opens tab → content script injects
2. PortalDetector runs (URL match + DOM probe)
3. Detector returns { portalType, portalName, confidence }
4. Content script sends PORTAL_DETECTED → background → side panel
5. Side panel shows "AutoFill available" on FAB
6. User clicks FAB → Preview Overlay opens
7. Engine calls adapter.getFields() → returns FormField[]
8. Overlay renders: detected fields × profile data, user can edit
9. User clicks "Fill" → Engine calls adapter.fill(fields, profile)
10. Engine returns { filled: 12, skipped: 1, errors: 0 }
11. Overlay shows result summary
```

---

## 3. Message Passing Protocol

### Message Types

All messages use `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`.

```ts
// src/shared/messaging.ts

type Direction = 'content→bg' | 'bg→content' | 'sidepanel→bg' | 'bg→sidepanel';

// ── Content Script → Background ──────────────────────────────

interface PortalDetected {
  type: 'PORTAL_DETECTED';
  payload: {
    portalType: PortalType;       // 'greenhouse' | 'lever' | 'wellfound' | 'generic'
    portalName: string;           // 'Greenhouse' | 'Lever' | 'Wellfound' | 'Unknown'
    url: string;
    confidence: number;           // 0-1
  };
}

interface FillRequested {
  type: 'FILL_REQUESTED';
  payload: {
    portalType: PortalType;
    fieldOverrides?: Partial<FormField>[];  // user edits from preview
  };
}

interface FillCompleted {
  type: 'FILL_COMPLETED';
  payload: {
    filled: number;
    skipped: number;
    errors: string[];
    portalType: PortalType;
  };
}

interface CaptchaDetected {
  type: 'CAPTCHA_DETECTED';
  payload: {
    portalType: PortalType;
    selector: string;             // CSS selector of captcha element
  };
}

// ── Background → Content Script ──────────────────────────────

interface GetProfileForFill {
  type: 'GET_PROFILE_FOR_FILL';
  payload: {
    portalType: PortalType;
  };
}

interface ProfileResponse {
  type: 'PROFILE_RESPONSE';
  payload: {
    profile: Profile;
    customAnswers: CustomAnswer[];
    settings: Settings;
  };
}

// ── Side Panel → Background ──────────────────────────────────

interface SaveProfile {
  type: 'SAVE_PROFILE';
  payload: { profile: Profile };
}

interface GetProfile {
  type: 'GET_PROFILE';
}

interface GetFiles {
  type: 'GET_FILES';
}

interface SaveFile {
  type: 'SAVE_FILE';
  payload: { file: StoredFile };
}

interface DeleteFile {
  type: 'DELETE_FILE';
  payload: { id: string };
}

interface GetFileBlob {
  type: 'GET_FILE_BLOB';
  payload: { id: string };
}

interface GetCustomAnswers {
  type: 'GET_CUSTOM_ANSWERS';
}

interface SaveCustomAnswer {
  type: 'SAVE_CUSTOM_ANSWER';
  payload: { answer: CustomAnswer };
}

interface DeleteCustomAnswer {
  type: 'DELETE_CUSTOM_ANSWER';
  payload: { id: string };
}

interface GetSettings {
  type: 'GET_SETTINGS';
}

interface SaveSettings {
  type: 'SAVE_SETTINGS';
  payload: { settings: Settings };
}

interface TriggerFill {
  type: 'TRIGGER_FILL';
  payload: { tabId: number };
}

interface ExportAllData {
  type: 'EXPORT_ALL_DATA';
}

interface ImportAllData {
  type: 'IMPORT_ALL_DATA';
  payload: { data: ExportPayload };
}
```

### Message Flow Diagrams

**Portal detection (content → bg → side panel):**
```
Content Script              Background              Side Panel
     │                          │                        │
     │── PORTAL_DETECTED ──────►│                        │
     │                          │── forward ────────────►│
     │                          │                        │
     │                          │                        │ (updates FAB state)
```

**Fill trigger (side panel → bg → content):**
```
Side Panel                Background              Content Script
   │                          │                        │
   │── TRIGGER_FILL(tabId) ──►│                        │
   │                          │── GET_PROFILE_FOR_FILL │
   │                          │◄── PROFILE_RESPONSE ──│
   │                          │── FILL_REQUESTED ─────►│
   │                          │                        │
   │                          │◄── FILL_COMPLETED ────│
   │◄── fill result ──────────│                        │
```

**Storage operations (side panel → bg, background reads directly):**
```
Side Panel                Background              Storage
   │                          │                        │
   │── SAVE_PROFILE ─────────►│── storage.local.set ──►│
   │                          │                        │
   │── SAVE_FILE ────────────►│── IndexedDB.put ──────►│
   │                          │                        │
   │── GET_PROFILE ──────────►│── storage.local.get ──►│
   │◄── profile data ─────────│◄──────────────────────│
```

---

## 4. Storage Schema Design

### chrome.storage.local

```ts
// Profile — standard job application fields
interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  location: string;              // "San Francisco, CA" or "Remote"
  headshotUrl: string;           // URL to headshot image (stored externally)
  workAuthorization: 'us_citizen' | 'green_card' | 'visa' | 'other';
  customFields: Array<{
    key: string;                 // "pronouns", "degree", etc.
    value: string;
  }>;
  defaults: {
    resumeId: string | null;     // IndexedDB file id
    coverLetterId: string | null;
  };
}

// Custom Answers — for "Why this company?" type questions
interface CustomAnswer {
  id: string;                    // crypto.randomUUID()
  question: string;              // "Why do you want to work here?"
  answer: string;                // User-written answer text
  tags: string[];                // ["why-company", "culture", "mission"]
}

// Settings
interface Settings {
  autoDetect: boolean;           // Auto-detect portal on page load (default: true)
  showOverlay: boolean;          // Show preview overlay before fill (default: true)
  enabledPortals: Record<PortalType, boolean>;  // Toggle per portal
  defaultResumeId: string | null;
  defaultCoverLetterId: string | null;
  onboardingComplete: boolean;
  lastFillTimestamp: number | null;
}

// Fill history (optional, for analytics — no network)
interface FillRecord {
  timestamp: number;
  portalType: PortalType;
  url: string;
  fieldsFilled: number;
  success: boolean;
}
```

### IndexedDB: `autoapply-files`

```ts
// Database: autoapply-files
// Object Store: files
// keyPath: 'id'

interface StoredFile {
  id: string;                    // crypto.randomUUID()
  label: string;                 // "Software Engineer Resume 2026"
  type: 'resume' | 'cover_letter';
  fileName: string;              // "resume_john_doe.pdf"
  mimeType: string;              // "application/pdf"
  blob: ArrayBuffer;             // The actual file bytes
  size: number;                  // bytes
  createdAt: number;             // Date.now()
}
```

**IndexedDB schema details:**

```
Database: "autoapply-files"
  └── Object Store: "files"
        ├── keyPath: "id"
        ├── indexes:
        │     ├── "type" (non-unique)     — filter resumes vs cover letters
        │     └── "createdAt" (non-unique) — sort by newest
        └── version: 1
```

**Why IndexedDB for blobs:**
- `chrome.storage.local` has a 5MB total limit — one PDF resume is often 200KB-1MB
- IndexedDB has no practical size limit (browser-dependent, usually 50%+ of disk)
- Chrome extension background service workers can access IndexedDB directly
- Content scripts share IndexedDB with the origin page — but we use the extension's own origin (`chrome-extension://<id>`) so no cross-origin issues

---

## 5. Build Configuration

### Vite + CRXJS

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import crx from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    // CRXJS handles code splitting automatically
    // Content scripts, background, side panel are separate entry points
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,            // No sourcemaps in prod build
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
```

### Manifest V3

```ts
// src/manifest.ts
import type { ManifestV3 } from 'crxjs-vite-plugin';

const manifest: ManifestV3 = {
  manifest_version: 3,
  name: 'AutoApply',
  version: '1.0.0',
  description: 'Auto-fill job applications on startup portals with one click.',

  permissions: [
    'activeTab',                 // Access current tab only (no broad host permission)
    'storage',                   // chrome.storage.local
    'sidePanel',                 // Side Panel API
  ],

  host_permissions: [
    'https://boards.greenhouse.io/*',
    'https://jobs.lever.co/*',
    'https://wellfound.com/*',
    'https://www.wellfound.com/*',
    'https://startup.jobs/*',
    // Generic: need broad permission for fallback detection
    '*://*/*',
  ],

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],

  side_panel: {
    default_path: 'public/popup.html',
  },

  action: {
    default_title: 'AutoApply',
    default_icon: {
      '16': 'public/icons/icon16.png',
      '48': 'public/icons/icon48.png',
      '128': 'public/icons/icon128.png',
    },
  },

  icons: {
    '16': 'public/icons/icon16.png',
    '48': 'public/icons/icon48.png',
    '128': 'public/icons/icon128.png',
  },
};

export default manifest;
```

### Tailwind CSS v4

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/content/**/*.{tsx,ts}',
    './src/sidepanel/**/*.{tsx,ts}',
  ],
  theme: {
    extend: {
      // Content script overlay: minimal, non-intrusive
      // Side panel: full utility set
    },
  },
  plugins: [],
} satisfies Config;
```

### TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome-types"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 6. File-by-File Breakdown

### `src/background/`

| File | Purpose |
|------|---------|
| `index.ts` | Service worker entry. Registers `chrome.runtime.onMessage` listener. Routes messages to handlers. Opens side panel on extension icon click. |
| `messages.ts` | Pure functions that handle each message type. Reads/writes storage. Returns typed responses. No DOM access. |
| `storage.ts` | Thin wrappers around `chrome.storage.local.get/set/remove`. IndexedDB helpers for file blobs. All storage ops go through here. |

### `src/content/`

| File | Purpose |
|------|---------|
| `index.ts` | Content script entry. On load: runs PortalDetector, injects overlay root element, sets up MutationObserver for SPA navigation. Listens for messages from background. |
| `detector.ts` | `PortalDetector` class. URL pattern matching first (fast, zero DOM cost). Falls back to DOM probing if URL is ambiguous. Returns `{ portalType, portalName, confidence }`. |
| `engine.ts` | `AutoFillEngine` class. Given portalType + profile + adapter, fills all detected fields. Uses adapter's `fill()` method. Handles file uploads via adapter's `uploadFile()`. Returns fill stats. |
| `overlay.tsx` | React root mounted in a shadow DOM container. Renders FAB (48px circle, bottom-right) and preview panel. FAB shows portal detection status. Preview panel lists all detected fields with edit capability. |
| `styles.css` | Tailwind `@import` + scoped styles for the overlay. Shadow DOM isolates from host page. |
| `utils.ts` | `nativeSetter()` — wraps React input bypass. `uploadFile()` — wraps DataTransfer API. `waitForElement()` — polls for dynamic DOM elements. `debounce()` — for MutationObserver. |

### `src/adapters/`

| File | Purpose |
|------|---------|
| `types.ts` | `PortalAdapter` interface: `detect()`, `getFields()`, `fill()`, `uploadFile()`. `FormField` type: selector, label, profileKey, type, required, options. `PortalType` enum. |
| `greenhouse.ts` | `GreenhouseAdapter`. Knows Greenhouse's DOM: `.field` containers, `#first_name` etc. selectors. Handles file upload via Greenhouse's custom upload widget. |
| `lever.ts` | `LeverAdapter`. Knows Lever's DOM: `lever-*` class prefixes, application form structure. |
| `wellfound.ts` | `WellfoundAdapter`. Handles Wellfound's custom React SPA. Uses MutationObserver for SPA navigation. Fallback selectors since Wellfound changes class names frequently. |
| `generic.ts` | `GenericAdapter`. Heuristic field detection: scans all `<input>`, `<select>`, `<textarea>` elements. Matches by `name`, `id`, `placeholder`, `aria-label`, associated `<label>` text. Maps to profile keys via fuzzy string matching. |

### `src/sidepanel/`

| File | Purpose |
|------|---------|
| `index.tsx` | Side panel React root. Mounts `<App />` with error boundary. |
| `App.tsx` | Tab router. 4 tabs: Profile, Resumes, Answers, Settings. First-run: shows `<Onboarding />`. Communicates with background via message bus. |
| `Onboarding.tsx` | 3-step wizard: (1) Enter name + email, (2) Upload resume, (3) Enable portals. Sets `settings.onboardingComplete = true`. |
| `tabs/ProfileTab.tsx` | Form for all Profile fields. Saves to `chrome.storage.local` on blur/change. Shows validation (email format, required fields). |
| `tabs/ResumesTab.tsx` | File upload zone + list of uploaded files. Upload sends blob to background → IndexedDB. Shows file type, size, date. Delete button. |
| `tabs/AnswersTab.tsx` | List of custom Q&A pairs. Add/edit/delete. Tag filtering. For "Why this company?" questions. |
| `tabs/SettingsTab.tsx` | Toggle auto-detect, toggle per-portal, set defaults (default resume, cover letter). Export/Import all data as JSON. |
| `components/FileUpload.tsx` | Drag-and-drop + click-to-upload. Validates file type (PDF, DOCX) and size (<5MB). Sends to background for IndexedDB storage. |
| `components/FieldEditor.tsx` | Reusable key-value editor for custom profile fields. Add/remove rows. |
| `components/StatusBadge.tsx` | Shows portal detection status: "Greenhouse detected ✓" or "Unknown portal ⚠". |

### `src/shared/`

| File | Purpose |
|------|---------|
| `types.ts` | All shared TypeScript types: Profile, StoredFile, CustomAnswer, Settings, PortalType, FormField, ExportPayload. |
| `constants.ts` | `STORAGE_KEYS` enum, `PORTAL_TYPE` enum, `MAX_FILE_SIZE`, `SUPPORTED_MIME_TYPES`, `FILL_DEBOUNCE_MS`. |
| `messaging.ts` | Typed `sendMessage()` and `onMessage()` helpers. Handles response promises. Type-safe message discrimination. |
| `db.ts` | IndexedDB wrapper: `openDB()`, `putFile()`, `getFile()`, `getAllFiles()`, `deleteFile()`. Handles version upgrades. |

---

## 7. Dependency List

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.x | UI for overlay + side panel |
| `react-dom` | 18.x | DOM rendering |

**Total: 2 packages.** Everything else is either built-in or dev-only.

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@crxjs/vite-plugin` | ^2.x | Vite plugin for Chrome Extension bundling |
| `vite` | ^5.x | Build tool |
| `@vitejs/plugin-react` | ^4.x | React JSX transform for Vite |
| `typescript` | ^5.x | Type checking |
| `@types/react` | ^18.x | React type definitions |
| `@types/react-dom` | ^18.x | ReactDOM type definitions |
| `chrome-types` | latest | Chrome API type definitions |
| `tailwindcss` | ^4.x | Utility CSS framework |
| `postcss` | ^8.x | CSS processing |
| `autoprefixer` | ^10.x | CSS vendor prefixes |
| `esbuild` | latest | Minification (bundled with Vite) |

**Bundle size estimate:**
- React: ~42KB gzipped (shared between content + side panel via CRXJS code splitting)
- Tailwind (content overlay only): ~8KB gzipped (purged)
- Side panel CSS: ~15KB gzipped
- Extension logic: ~20KB gzipped
- **Total: ~85KB gzipped** (well under 500KB limit)

---

## 8. Key Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **Single repo, no monorepo** | Solo builder — one `npm install`, one `vite build`, one `git` history. Monorepo tooling (Turborepo, Nx) adds overhead with zero benefit at this scale. |
| **chrome.storage.local for profile, IndexedDB for blobs** | Profile is small JSON (<1KB), fits in `chrome.storage.local` (5MB). File blobs (PDFs, DOCX) can be 200KB-1MB each; IndexedDB has no practical size limit. Mixing them keeps storage concerns clean. |
| **Content script does all DOM work** | MV3 service worker dies after 30s idle — cannot hold DOM references. Content scripts live as long as the tab. Background is orchestration-only. |
| **Shadow DOM for overlay** | Host page CSS cannot leak into our UI, and our CSS cannot leak out. Prevents style conflicts with portal CSS (critical for Greenhouse/Lever which have aggressive styles). |
| **Adapter-per-portal pattern** | Each portal has unique DOM structure. Greenhouse uses `#first_name`, Lever uses `input[name="name"]`, Wellfound uses React components with dynamic classes. Separate adapters isolate portal-specific breakage. |
| **GenericAdapter as fallback** | Covers any portal we haven't explicitly built for. Uses heuristic field detection (name/id/placeholder/label matching). Won't be perfect, but covers 80% of standard fields. |
| **`<all_urls>` content script match** | Required because we don't know which URLs are job portals until the user visits them. `activeTab` permission + `<all_urls>` match is the standard MV3 pattern for extensions that need to run on arbitrary pages. |
| **FAB in content script, not side panel** | FAB must be visible on the portal page itself — user doesn't want to open side panel just to see "fill available". Side panel is for management, content script overlay is for action. |
| **No network calls** | Core NFR. All profile data, file blobs, and fill logic are local. No analytics, no telemetry, no cloud sync. Privacy-first for job seekers. |
| **React for both overlay and side panel** | Shared component library, shared types, same mental model. Preact would save ~30KB but adds compatibility risk with React ecosystem. React is fine under 500KB. |
| **Typed message bus** | All messages have discriminated union types. TypeScript catches mismatched message types at compile time. No runtime `if (msg.type === 'foo')` chains without exhaustive checking. |
| **MutationObserver for SPAs** | Wellfound and some embedded Greenhouse forms are SPAs that re-render the DOM on navigation. MutationObserver with 200ms debounce re-runs portal detection when DOM changes. |
| **DataTransfer API for file uploads** | Chrome extensions cannot programmatically set `input.files` directly. DataTransfer API creates a synthetic FileList that React-controlled file inputs accept. |
| **CRXJS over manual manifest** | CRXJS handles code splitting, HMR during dev, and manifest generation. Manual manifest management is error-prone and loses HMR. |
| **No AI/LLM for field detection** | Standard fields (name, email, phone) are detectable by attribute matching. AI adds latency, cost, and privacy concerns. Reserve for v2 if needed for open-ended questions. |
| **File uploads via IndexedDB, not chrome.storage** | `chrome.storage.local` has a 5MB total limit. One PDF resume can be 500KB. IndexedDB is unlimited for practical purposes and is accessible from both background service worker and content scripts (via extension origin). |

---

## Appendix: Portal Detection Heuristics

### URL Patterns

| Portal | URL Pattern | Confidence |
|--------|-------------|------------|
| Greenhouse | `boards.greenhouse.io/*` | 1.0 |
| Lever | `jobs.lever.co/*` | 1.0 |
| Wellfound | `wellfound.com/apply/*` or `wellfound.com/companies/*/jobs/*` | 0.9 |
| Generic | Any other URL | 0.3 |

### DOM Probing (fallback when URL is ambiguous)

```ts
// Greenhouse detection: look for greenhouse-specific DOM markers
const greenhouseMarkers = [
  document.querySelector('.greenhouse-board'),
  document.querySelector('[data-controller="application"]'),
  document.querySelector('#first_name')?.closest('.field'),
];

// Lever detection
const leverMarkers = [
  document.querySelector('[class*="lever-"]'),
  document.querySelector('.application-form'),
  document.querySelector('input[name="name"]')?.closest('form[class*="lever"]'),
];

// Wellfound detection
const wellfoundMarkers = [
  document.querySelector('[class*="styles_job"]'),
  document.querySelector('[data-test="StartupApply"]'),
];
```

### Field Detection (GenericAdapter)

Priority order for matching a DOM element to a profile field:

1. `name` attribute → exact match against known field names (`first_name`, `email`, `phone`)
2. `id` attribute → exact match
3. `placeholder` attribute → fuzzy match (Levenshtein distance < 3)
4. `aria-label` attribute → fuzzy match
5. Associated `<label for="...">` text → fuzzy match
6. Sibling/parent text content → fuzzy match as last resort

**Known field name mappings:**

```ts
const FIELD_MAP: Record<string, keyof Profile> = {
  // Greenhouse
  'first_name': 'firstName',
  'last_name': 'lastName',
  'email': 'email',
  'phone': 'phone',
  'location': 'location',
  'linkedin_url': 'linkedInUrl',
  'github_url': 'githubUrl',
  'website': 'portfolioUrl',

  // Lever
  'name': 'firstName',          // Lever uses single "name" field
  'urls[LinkedIn]': 'linkedInUrl',
  'urls[GitHub]': 'githubUrl',
  'urls[Portfolio]': 'portfolioUrl',

  // Wellfound
  'firstName': 'firstName',
  'lastName': 'lastName',
  '工作地点': 'location',        // Wellfound supports CN

  // Generic (fuzzy targets)
  'first name': 'firstName',
  'last name': 'lastName',
  'phone number': 'phone',
  'linkedin': 'linkedInUrl',
  'github': 'githubUrl',
};
```

---

## Appendix: React Controlled-Input Bypass

```ts
// src/content/utils.ts

/**
 * Sets value on a React-controlled input element.
 * React overrides the native setter, so we must use the prototype's original.
 */
export function setReactInputValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  const prototype = input instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (!nativeSetter) {
    // Fallback for non-React inputs
    input.value = value;
  } else {
    nativeSetter.call(input, value);
  }

  // Dispatch events that React listens to
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Uploads a file to a file input using the DataTransfer API.
 * Works with React-controlled file inputs.
 */
export async function uploadFileToInput(
  fileInput: HTMLInputElement,
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  const dt = new DataTransfer();
  const file = new File([blob], fileName, { type: mimeType });
  dt.items.add(file);
  fileInput.files = dt.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
```

---

*Architecture version: 1.0 | Created: 2026-09-21 | Status: Design complete, ready for implementation*
