import type { PortalAdapter, FormField, Profile, CustomAnswer, FillResult } from '../shared/types';

const FIELD_PATTERNS: Record<string, RegExp[]> = {
  firstName: [/first.?name/i, /given.?name/i],
  lastName: [/last.?name/i, /family.?name/i, /surname/i],
  email: [/email/i, /e-?mail/i],
  phone: [/phone/i, /mobile/i, /tel/i],
  linkedInUrl: [/linkedin/i],
  githubUrl: [/github/i],
  portfolioUrl: [/portfolio/i, /website/i, /personal.?url/i],
};

export const GenericAdapter: PortalAdapter = {
  type: 'generic',
  name: 'Generic',

  detect(): boolean {
    // Always available as fallback
    return document.querySelectorAll('input, textarea, select').length > 0;
  },

  getFields(): FormField[] {
    const fields: FormField[] = [];
    const allInputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
    
    allInputs.forEach((input) => {
      const attrs = [
        input.getAttribute('name') || '',
        input.getAttribute('id') || '',
        input.getAttribute('placeholder') || '',
        input.getAttribute('aria-label') || '',
        findLabelText(input),
      ].join(' ');

      let matched = false;
      for (const [profileKey, patterns] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(attrs)) {
            const selector = buildSelector(input);
            fields.push({
              selector,
              label: findLabelText(input) || attrs.split(' ')[0] || profileKey,
              profileKey,
              type: getFieldType(input),
              required: (input as HTMLInputElement).required || false,
              confidence: 0.8,
            });
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      if (!matched) {
        // Check for file inputs (resume/cover)
        if (input.tagName === 'INPUT' && (input as HTMLInputElement).type === 'file') {
          const fileText = attrs.toLowerCase();
          if (fileText.includes('resume') || fileText.includes('cv')) {
            fields.push({
              selector: buildSelector(input),
              label: findLabelText(input) || 'Resume',
              profileKey: 'defaults.resumeId',
              type: 'file',
              required: false,
              confidence: 0.7,
            });
          } else if (fileText.includes('cover')) {
            fields.push({
              selector: buildSelector(input),
              label: findLabelText(input) || 'Cover Letter',
              profileKey: 'defaults.coverLetterId',
              type: 'file',
              required: false,
              confidence: 0.7,
            });
          }
        }
        // Check for textareas (custom questions)
        else if (input.tagName === 'TEXTAREA') {
          const text = findLabelText(input).toLowerCase();
          if (text.includes('why') || text.includes('about') || text.includes('additional') || text.includes('cover')) {
            fields.push({
              selector: buildSelector(input),
              label: findLabelText(input),
              profileKey: `custom:${findLabelText(input)}`,
              type: 'textarea',
              required: false,
              confidence: 0.6,
            });
          }
        }
      }
    });

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

function findLabelFor(el: Element): string | null {
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent?.trim() || null;
  }
  const parentLabel = el.closest('label');
  if (parentLabel) return parentLabel.textContent?.trim() || null;
  const prev = el.previousElementSibling;
  if (prev?.tagName === 'LABEL') return prev.textContent?.trim() || null;
  return el.getAttribute('aria-label') || el.getAttribute('placeholder') || null;
}

function findLabelText(el: Element): string {
  return findLabelFor(el) || el.getAttribute('placeholder') || el.getAttribute('name') || '';
}

function escapeCssSelector(value: string): string {
  // Escape characters that are special in CSS attribute selectors
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
}

function buildSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = el.getAttribute('name');
  if (name) return `${el.tagName.toLowerCase()}[name="${escapeCssSelector(name)}"]`;
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return `${el.tagName.toLowerCase()}[placeholder="${escapeCssSelector(placeholder)}"]`;
  return `${el.tagName.toLowerCase()}`;
}

function getFieldType(el: Element): FormField['type'] {
  if (el.tagName === 'TEXTAREA') return 'textarea';
  if (el.tagName === 'SELECT') return 'select';
  const input = el as HTMLInputElement;
  switch (input.type) {
    case 'email': return 'email';
    case 'tel': return 'tel';
    case 'file': return 'file';
    case 'checkbox': return 'checkbox';
    case 'radio': return 'radio';
    default: return 'text';
  }
}
