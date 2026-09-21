import type { Profile, CustomAnswer, Settings, PortalType, FormField, StoredFile } from './types';

export type Message =
  | { type: 'PORTAL_DETECTED'; payload: { portalType: PortalType; portalName: string; url: string; confidence: number } }
  | { type: 'FILL_REQUESTED'; payload: { portalType: PortalType; fieldOverrides?: Partial<FormField>[] } }
  | { type: 'FILL_COMPLETED'; payload: { filled: number; skipped: number; errors: string[]; portalType: PortalType } }
  | { type: 'CAPTCHA_DETECTED'; payload: { portalType: PortalType; selector: string } }
  | { type: 'GET_PROFILE_FOR_FILL'; payload: { portalType: PortalType } }
  | { type: 'PROFILE_RESPONSE'; payload: { profile: Profile; customAnswers: CustomAnswer[]; settings: Settings } }
  | { type: 'SAVE_PROFILE'; payload: { profile: Profile } }
  | { type: 'GET_PROFILE' }
  | { type: 'GET_FILES' }
  | { type: 'SAVE_FILE'; payload: { file: StoredFile } }
  | { type: 'DELETE_FILE'; payload: { id: string } }
  | { type: 'GET_FILE_BLOB'; payload: { id: string } }
  | { type: 'GET_CUSTOM_ANSWERS' }
  | { type: 'SAVE_CUSTOM_ANSWER'; payload: { answer: CustomAnswer } }
  | { type: 'DELETE_CUSTOM_ANSWER'; payload: { id: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: { settings: Settings } }
  | { type: 'TRIGGER_FILL'; payload: { tabId: number } }
  | { type: 'EXPORT_ALL_DATA' }
  | { type: 'IMPORT_ALL_DATA'; payload: { data: { profile: Profile; customAnswers: CustomAnswer[]; settings: Settings; files: StoredFile[] } } };

export type MessageResponse<T = any> = { success: boolean; data?: T; error?: string };

export function sendMessage(message: Message): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(message);
}

export function onMessage(handler: (message: Message, sender: chrome.runtime.MessageSender) => Promise<MessageResponse | void>): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    Promise.resolve(handler(message, sender)).then((response) => {
      sendResponse(response ?? { success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: String(error) });
    });
    return true; // async response
  });
}
