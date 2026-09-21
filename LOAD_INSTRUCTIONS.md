# Loading AutoApply in Chrome

## Prerequisites
- Node.js 18+ installed
- Google Chrome browser

## Build the Extension

```bash
# Install dependencies (first time only)
npm install

# Production build
npm run build

# Dev mode (watches for changes and rebuilds automatically)
npm run dev
```

The build output goes to the `dist/` folder.

## Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in the top-right corner)
3. Click **"Load unpacked"** (top-left)
4. Select the `dist` folder from this project directory
5. The AutoApply icon (blue square) will appear in your Chrome toolbar
6. Click the icon to open the side panel
7. Complete the onboarding wizard (set up your profile, upload resume/cover letter)
8. Visit a supported job portal to test:
   - [Greenhouse](https://boards.greenhouse.io)
   - [Lever](https://jobs.lever.co)
   - [Wellfound](https://wellfound.com)
   - Any other site (generic adapter)

## How to Verify It's Working

1. After loading, open Chrome DevTools on any webpage
2. Check the Console tab — you should see: `AutoApply: Content script loaded`
3. Visit a Greenhouse or Lever job posting page
4. A blue floating action button (FAB) should appear in the bottom-right corner
5. Click it to open the preview overlay showing detected form fields

## Development Workflow

- Run `npm run dev` to start file watching
- Make code changes — Vite rebuilds automatically into `dist/`
- Go to `chrome://extensions/` and click the **reload** button (circular arrow) on the AutoApply card
- Refresh the target job portal page to pick up updated content scripts

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Extension icon missing | Rebuild (`npm run build`) and re-load the `dist` folder |
| Content script not loading | Refresh the target page after reloading the extension |
| Side panel doesn't open | Ensure `sidePanel` permission is granted (check `chrome://extensions/` detail view) |
| Build fails with TypeScript errors | Run `npx tsc --noEmit` to see the full error list |
