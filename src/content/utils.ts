// React controlled-input bypass
export function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  if (input.tagName === 'TEXTAREA') {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
  } else {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      (input as HTMLInputElement).value = value;
    }
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// File upload via DataTransfer API
export async function uploadFile(input: HTMLInputElement, blob: ArrayBuffer, fileName: string, mimeType: string): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: mimeType });
    const dt = new DataTransfer();
    dt.items.add(file);

    // For React file inputs, we need to override the files property
    Object.defineProperty(input, 'files', {
      value: dt.files,
      writable: true,
      configurable: true,
    });

    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } catch (e) {
    console.error('AutoApply: File upload failed', e);
    return false;
  }
}

// Check for CAPTCHA
export function detectCaptcha(): string | null {
  const selectors = [
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
    'div.g-recaptcha',
    'div.h-captcha',
    '#captcha',
    '[data-testid="captcha"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return selector;
  }
  return null;
}

// Find label for an input element
export function findLabelFor(el: Element): string {
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent?.trim() || '';
  }
  const parentLabel = el.closest('label');
  if (parentLabel) return parentLabel.textContent?.trim() || '';
  const prev = el.previousElementSibling;
  if (prev?.tagName === 'LABEL') return prev.textContent?.trim() || '';
  return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '';
}
