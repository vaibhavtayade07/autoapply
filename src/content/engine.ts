import type { Profile, CustomAnswer, PortalAdapter, FormField, FillResult } from '../shared/types';
import { detectCurrentPortal, watchForNavigation, type DetectionResult } from './detector';
import { uploadFile, detectCaptcha } from './utils';
import { getFileById } from '../shared/db';

export class AutoFillEngine {
  private currentAdapter: PortalAdapter | null = null;
  private currentFields: FormField[] = [];
  private observer: { disconnect: () => void } | null = null;

  start(): void {
    this.detect();
    this.observer = watchForNavigation(() => this.detect());
  }

  stop(): void {
    this.observer?.disconnect();
  }

  async detect(): Promise<DetectionResult> {
    const result = await detectCurrentPortal();
    this.currentAdapter = result.adapter;
    this.currentFields = result.adapter?.getFields() || [];
    return result;
  }

  getFields(): FormField[] {
    return this.currentFields;
  }

  getAdapter(): PortalAdapter | null {
    return this.currentAdapter;
  }

  async fill(
    profile: Profile,
    customAnswers: CustomAnswer[],
    fileSelections?: { resumeId?: string; coverLetterId?: string }
  ): Promise<FillResult> {
    if (!this.currentAdapter) {
      return { filled: 0, skipped: 0, errors: [{ field: 'none', reason: 'No portal detected' }] };
    }

    // Check for CAPTCHA
    const captcha = detectCaptcha();
    if (captcha) {
      return {
        filled: 0,
        skipped: 0,
        errors: [{ field: 'CAPTCHA', reason: `CAPTCHA detected at ${captcha}. Complete it manually, then click Fill again.` }],
      };
    }

    // Fill text fields via adapter
    const result = this.currentAdapter.fill(this.currentFields, profile, customAnswers, fileSelections);

    // Handle file uploads
    const fileFields = this.currentFields.filter(f => f.type === 'file');
    for (const field of fileFields) {
      try {
        const el = document.querySelector(field.selector) as HTMLInputElement | null;
        if (!el || el.type !== 'file') continue;

        let fileId: string | null = null;
        if (field.profileKey === 'defaults.resumeId') {
          fileId = fileSelections?.resumeId || profile.defaults.resumeId;
        } else if (field.profileKey === 'defaults.coverLetterId') {
          fileId = fileSelections?.coverLetterId || profile.defaults.coverLetterId;
        }

        if (fileId) {
          const file = await getFileById(fileId);
          if (file) {
            const success = await uploadFile(el, file.blob, file.fileName, file.mimeType);
            if (success) result.filled++;
            else result.errors.push({ field: field.label, reason: 'File upload failed' });
          } else {
            result.skipped++;
          }
        } else {
          result.skipped++;
        }
      } catch (e) {
        result.errors.push({ field: field.label, reason: String(e) });
      }
    }

    return result;
  }
}
