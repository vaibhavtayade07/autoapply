import { detectPortal } from '../adapters';
import type { PortalAdapter } from '../shared/types';
import type { Settings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

export interface DetectionResult {
  adapter: PortalAdapter | null;
  portalName: string;
  confidence: number;
}

export async function detectCurrentPortal(): Promise<DetectionResult> {
  // Read settings to check enabled portals
  let settings: Settings = DEFAULT_SETTINGS;
  try {
    const result = await chrome.storage.local.get('settings');
    if (result.settings) settings = result.settings as Settings;
  } catch {
    // Default to all enabled if storage unavailable
  }

  const adapter = detectPortal();
  if (!adapter) {
    return { adapter: null, portalName: 'Unknown', confidence: 0 };
  }

  // Check if this portal type is enabled in settings
  if (!settings.enabledPortals[adapter.type]) {
    return { adapter: null, portalName: adapter.name + ' (disabled)', confidence: 0 };
  }

  return {
    adapter,
    portalName: adapter.name,
    confidence: adapter.type === 'generic' ? 0.6 : 1.0,
  };
}

// MutationObserver + popstate for SPA navigation (Wellfound, etc.)
export function watchForNavigation(callback: () => void): { disconnect: () => void } {
  let debounceTimer: ReturnType<typeof setTimeout>;

  const debouncedCallback = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(callback, 200);
  };

  const observer = new MutationObserver(debouncedCallback);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also listen for History API navigation (pushState/replaceState/popstate)
  window.addEventListener('popstate', debouncedCallback);

  // Intercept pushState and replaceState to detect SPA navigation
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    originalPushState(...args);
    debouncedCallback();
  };
  history.replaceState = (...args) => {
    originalReplaceState(...args);
    debouncedCallback();
  };

  return {
    disconnect() {
      observer.disconnect();
      window.removeEventListener('popstate', debouncedCallback);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      clearTimeout(debounceTimer);
    },
  };
}
