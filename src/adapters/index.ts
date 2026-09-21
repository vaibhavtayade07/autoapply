import { GreenhouseAdapter } from './greenhouse';
import { LeverAdapter } from './lever';
import { WellfoundAdapter } from './wellfound';
import { GenericAdapter } from './generic';
import type { PortalAdapter } from '../shared/types';

export const adapters: PortalAdapter[] = [
  GreenhouseAdapter,
  LeverAdapter,
  WellfoundAdapter,
  GenericAdapter,
];

export function detectPortal(): PortalAdapter | null {
  for (const adapter of adapters) {
    if (adapter.type !== 'generic' && adapter.detect()) {
      return adapter;
    }
  }
  // Fall back to generic if any form fields exist
  if (GenericAdapter.detect()) {
    return GenericAdapter;
  }
  return null;
}
