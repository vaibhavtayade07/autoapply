import type { PortalAdapter, FormField, Profile, CustomAnswer, FillResult } from '../shared/types';

export const WellfoundAdapter: PortalAdapter = {
  type: 'wellfound',
  name: 'Wellfound',

  detect(): boolean {
    return (
      window.location.hostname.includes('wellfound.com') ||
      window.location.hostname.includes('angel.co')
    );
  },

  getFields(): FormField[] {
    const fields: FormField[] = [];
    
    // Wellfound uses React - fields are identified by label text
    const allInputs = document.querySelectorAll('input, textarea, select');
    
    allInputs.forEach((input) => {
      const label = findLabelFor(input);
      if (!label) return;
      
      const text = label.toLowerCase();
      let profileKey = '';
      let type: FormField['type'] = 'text';
      
      if (text.includes('first name') || text.includes('first_name')) { profileKey = 'firstName'; type = 'text'; }
      else if (text.includes('last name') || text.includes('last_name')) { profileKey = 'lastName'; type = 'text'; }
      else if (text.includes('email')) { profileKey = 'email'; type = 'email'; }
      else if (text.includes('phone')) { profileKey = 'phone'; type = 'tel'; }
      else if (text.includes('linkedin')) { profileKey = 'linkedInUrl'; type = 'text'; }
      else if (text.includes('github')) { profileKey = 'githubUrl'; type = 'text'; }
      else if (text.includes('portfolio') || text.includes('website')) { profileKey = 'portfolioUrl'; type = 'text'; }
      else if (text.includes('resume') || text.includes('cv')) { profileKey = 'defaults.resumeId'; type = 'file'; }
      else if (text.includes('cover')) { profileKey = 'defaults.coverLetterId'; type = 'file'; }
      else if (input.tagName === 'TEXTAREA' || text.includes('why') || text.includes('about') || text.includes('additional')) {
        profileKey = `custom:${label}`;
        type = 'textarea';
      }
      
      if (profileKey) {
        const selector = input.id ? `#${CSS.escape(input.id)}` : `input[name="${escapeCssAttr(input.getAttribute('name') || '')}"]`;
        fields.push({
          selector,
          label,
          profileKey,
          type,
          required: (input as HTMLInputElement).required || false,
          confidence: profileKey.startsWith('custom:') ? 0.7 : 1.0,
        });
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

function escapeCssAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function findLabelFor(el: Element): string | null {
  // Try explicit label[for]
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent?.trim() || null;
  }
  
  // Try parent label
  const parentLabel = el.closest('label');
  if (parentLabel) return parentLabel.textContent?.trim() || null;
  
  // Try preceding label
  const prev = el.previousElementSibling;
  if (prev?.tagName === 'LABEL') return prev.textContent?.trim() || null;
  
  // Try aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Try placeholder as last resort
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder;
  
  return null;
}
