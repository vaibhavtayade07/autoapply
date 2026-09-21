export type PortalType = 'greenhouse' | 'lever' | 'wellfound' | 'generic' | 'none';

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  location: string;
  headshotUrl: string;
  workAuthorization: string;
  customFields: Array<{ key: string; value: string }>;
  defaults: {
    resumeId: string | null;
    coverLetterId: string | null;
  };
}

export interface StoredFile {
  id: string;
  label: string;
  type: 'resume' | 'cover_letter';
  fileName: string;
  mimeType: string;
  blob: ArrayBuffer;
  size: number;
  createdAt: number;
}

export interface CustomAnswer {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

export interface Settings {
  autoDetect: boolean;
  showOverlay: boolean;
  enabledPortals: Record<PortalType, boolean>;
  defaultResumeId: string | null;
  defaultCoverLetterId: string | null;
  onboardingComplete: boolean;
}

export interface FormField {
  selector: string;
  label: string;
  profileKey: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'file' | 'radio' | 'checkbox';
  required: boolean;
  options?: string[];
  confidence: number;
}

export interface FillResult {
  filled: number;
  skipped: number;
  errors: Array<{ field: string; reason: string }>;
}

export interface PortalAdapter {
  type: PortalType;
  name: string;
  detect(): boolean;
  getFields(): FormField[];
  fill(fields: FormField[], profile: Profile, customAnswers: CustomAnswer[], fileSelections?: { resumeId?: string; coverLetterId?: string }): FillResult;
}

export const DEFAULT_PROFILE: Profile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  linkedInUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  location: '',
  headshotUrl: '',
  workAuthorization: '',
  customFields: [],
  defaults: { resumeId: null, coverLetterId: null },
};

export const DEFAULT_SETTINGS: Settings = {
  autoDetect: true,
  showOverlay: true,
  enabledPortals: { greenhouse: true, lever: true, wellfound: true, generic: true, none: false },
  defaultResumeId: null,
  defaultCoverLetterId: null,
  onboardingComplete: false,
};
