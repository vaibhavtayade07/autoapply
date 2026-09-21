import type { PortalAdapter, FormField, Profile, CustomAnswer, FillResult } from '../shared/types';

export const LeverAdapter: PortalAdapter = {
  type: 'lever',
  name: 'Lever',

  detect(): boolean {
    return (
      window.location.hostname.includes('lever.co') ||
      !!document.querySelector('div.posting-page, form[data-qa="lever-form"], div.application-form')
    );
  },

  getFields(): FormField[] {
    const fields: FormField[] = [];
    
    const mapping: Array<{ label: string; profileKey: string; selector: string; type: FormField['type'] }> = [
      { label: 'First Name', profileKey: 'firstName', selector: 'input[data-qa="name-first"], input[name="name"]', type: 'text' },
      { label: 'Last Name', profileKey: 'lastName', selector: 'input[data-qa="name-last"]', type: 'text' },
      { label: 'Email', profileKey: 'email', selector: 'input[data-qa="email"], input[type="email"]', type: 'email' },
      { label: 'Phone', profileKey: 'phone', selector: 'input[data-qa="phone"], input[type="tel"]', type: 'tel' },
      { label: 'Resume', profileKey: 'defaults.resumeId', selector: 'input[data-qa="file-resume"], input[type="file"][name*="resume"]', type: 'file' },
      { label: 'Cover Letter (File)', profileKey: 'defaults.coverLetterId', selector: 'input[data-qa="file-cover"]', type: 'file' },
      { label: 'Cover Letter (Text)', profileKey: 'custom:Cover Letter', selector: 'textarea[data-qa="cover-letter-text"]', type: 'textarea' },
      { label: 'LinkedIn', profileKey: 'linkedInUrl', selector: 'input[data-qa="urls-linkedin"], input[name*="linkedin"]', type: 'text' },
      { label: 'GitHub', profileKey: 'githubUrl', selector: 'input[data-qa="urls-github"], input[name*="github"]', type: 'text' },
      { label: 'Portfolio', profileKey: 'portfolioUrl', selector: 'input[data-qa="urls-portfolio"], input[name*="portfolio"]', type: 'text' },
    ];

    for (const m of mapping) {
      const el = document.querySelector(m.selector);
      if (el) {
        fields.push({
          selector: m.selector,
          label: m.label,
          profileKey: m.profileKey,
          type: m.type,
          required: (el as HTMLInputElement).required || false,
          confidence: 1.0,
        });
      }
    }

    return fields;
  },

  fill(fields, profile, customAnswers, fileSelections): FillResult {
    const result: FillResult = { filled: 0, skipped: 0, errors: [] };
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

    for (const field of fields) {
      try {
        const el = document.querySelector(field.selector) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!el) { result.skipped++; continue; }

        if (field.type === 'file') { result.skipped++; continue; }

        let value = '';
        if (field.profileKey.startsWith('custom:')) {
          const question = field.profileKey.replace('custom:', '');
          const match = customAnswers.find(a => 
            a.question.toLowerCase().includes(question.toLowerCase()) ||
            question.toLowerCase().includes(a.question.toLowerCase())
          );
          value = match?.answer || '';
        } else if (field.profileKey.startsWith('defaults.')) {
          result.skipped++;
          continue;
        } else {
          value = (profile as any)[field.profileKey] || '';
        }

        if (!value) { result.skipped++; continue; }

        // Handle single name field (Lever quirk)
        if (field.selector.includes('name') && !field.selector.includes('first') && !field.selector.includes('last')) {
          value = `${profile.firstName} ${profile.lastName}`.trim();
        }

        if (el.tagName === 'TEXTAREA' && textareaSetter) {
          textareaSetter.call(el, value);
        } else if (nativeSetter) {
          nativeSetter.call(el, value);
        }
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        result.filled++;
      } catch (e) {
        result.errors.push({ field: field.label, reason: String(e) });
      }
    }

    return result;
  },
};
