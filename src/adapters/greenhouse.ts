import type { PortalAdapter, FormField, Profile, CustomAnswer, FillResult } from '../shared/types';

export const GreenhouseAdapter: PortalAdapter = {
  type: 'greenhouse',
  name: 'Greenhouse',

  detect(): boolean {
    return (
      window.location.hostname.includes('greenhouse.io') ||
      !!document.querySelector('form#application_form, div.application-form-container, div[data-controller="JobApplication"]')
    );
  },

  getFields(): FormField[] {
    const fields: FormField[] = [];
    
    const mapping: Array<{ label: string; profileKey: string; selector: string; type: FormField['type'] }> = [
      { label: 'First Name', profileKey: 'firstName', selector: '#application_first_name, input[name="job_application[first_name]"]', type: 'text' },
      { label: 'Last Name', profileKey: 'lastName', selector: '#application_last_name, input[name="job_application[last_name]"]', type: 'text' },
      { label: 'Email', profileKey: 'email', selector: '#application_email, input[name="job_application[email]"], input[type="email"]', type: 'email' },
      { label: 'Phone', profileKey: 'phone', selector: '#application_phone, input[name="job_application[phone]"], input[type="tel"]', type: 'tel' },
      { label: 'LinkedIn', profileKey: 'linkedInUrl', selector: '#application_linkedin, input[name*="linkedin"]', type: 'text' },
      { label: 'GitHub', profileKey: 'githubUrl', selector: '#application_github, input[name*="github"]', type: 'text' },
      { label: 'Portfolio', profileKey: 'portfolioUrl', selector: '#application_portfolio, input[name*="portfolio"]', type: 'text' },
      { label: 'Resume', profileKey: 'defaults.resumeId', selector: 'input[type="file"][name*="resume"], input[type="file"][id*="resume"]', type: 'file' },
      { label: 'Cover Letter (File)', profileKey: 'defaults.coverLetterId', selector: 'input[type="file"][name*="cover_letter"], input[type="file"][id*="cover_letter"]', type: 'file' },
      { label: 'Cover Letter (Text)', profileKey: 'custom:Cover Letter', selector: 'textarea[name*="cover_letter"]', type: 'textarea' },
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

    // Detect custom questions via labels
    const labels = document.querySelectorAll('label');
    labels.forEach((label) => {
      const text = label.textContent?.trim() || '';
      const forAttr = label.getAttribute('for');
      const input = forAttr ? document.getElementById(forAttr) : label.querySelector('input, textarea');
      if (input && (input.tagName === 'TEXTAREA' || (input.tagName === 'INPUT' && input.getAttribute('type') === 'text'))) {
        fields.push({
          selector: input.id ? `#${CSS.escape(input.id)}` : `${input.tagName.toLowerCase()}[name="${(input.getAttribute('name') || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`,
          label: text,
          profileKey: `custom:${text}`,
          type: input.tagName === 'TEXTAREA' ? 'textarea' : 'text',
          required: (input as HTMLInputElement).required || false,
          confidence: 0.7,
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

        if (field.type === 'file') {
          // File handling done separately via uploadFile
          result.skipped++;
          continue;
        }

        let value = '';
        if (field.profileKey.startsWith('custom:')) {
          const question = field.profileKey.replace('custom:', '');
          const match = customAnswers.find(a => 
            a.question.toLowerCase().includes(question.toLowerCase()) ||
            question.toLowerCase().includes(a.question.toLowerCase())
          );
          value = match?.answer || '';
        } else if (field.profileKey === 'defaults.resumeId' || field.profileKey === 'defaults.coverLetterId') {
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
