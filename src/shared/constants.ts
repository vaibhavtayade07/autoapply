export const STORAGE_KEYS = {
  PROFILE: 'profile',
  CUSTOM_ANSWERS: 'customAnswers',
  SETTINGS: 'settings',
} as const;

export const DB_NAME = 'autoapply-files';
export const DB_STORE = 'files';
export const DB_VERSION = 1;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
