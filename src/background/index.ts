import { onMessage } from '../shared/messaging';
import { STORAGE_KEYS } from '../shared/constants';
import { getAllFiles, saveFile, deleteFile, getFileById } from '../shared/db';
import type { CustomAnswer } from '../shared/types';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../shared/types';

onMessage(async (message, sender) => {
  switch (message.type) {
    case 'GET_PROFILE': {
      const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
      return { success: true, data: result[STORAGE_KEYS.PROFILE] || DEFAULT_PROFILE };
    }
    case 'SAVE_PROFILE': {
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE]: message.payload.profile });
      return { success: true };
    }
    case 'GET_CUSTOM_ANSWERS': {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ANSWERS);
      return { success: true, data: (result[STORAGE_KEYS.CUSTOM_ANSWERS] as CustomAnswer[]) || [] };
    }
    case 'SAVE_CUSTOM_ANSWER': {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ANSWERS);
      const answers: CustomAnswer[] = (result[STORAGE_KEYS.CUSTOM_ANSWERS] as CustomAnswer[]) || [];
      const idx = answers.findIndex(a => a.id === message.payload.answer.id);
      if (idx >= 0) answers[idx] = message.payload.answer;
      else answers.push(message.payload.answer);
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_ANSWERS]: answers });
      return { success: true };
    }
    case 'DELETE_CUSTOM_ANSWER': {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ANSWERS);
      const answers: CustomAnswer[] = (result[STORAGE_KEYS.CUSTOM_ANSWERS] as CustomAnswer[]) || [];
      await chrome.storage.local.set({
        [STORAGE_KEYS.CUSTOM_ANSWERS]: answers.filter(a => a.id !== message.payload.id)
      });
      return { success: true };
    }
    case 'GET_SETTINGS': {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      return { success: true, data: result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS };
    }
    case 'SAVE_SETTINGS': {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: message.payload.settings });
      return { success: true };
    }
    case 'GET_FILES': {
      const files = await getAllFiles();
      // Return files without blob data for listing
      const list = files.map(({ blob, ...rest }) => rest);
      return { success: true, data: list };
    }
    case 'SAVE_FILE': {
      await saveFile(message.payload.file);
      return { success: true };
    }
    case 'DELETE_FILE': {
      await deleteFile(message.payload.id);
      return { success: true };
    }
    case 'GET_FILE_BLOB': {
      const file = await getFileById(message.payload.id);
      if (!file) return { success: false, error: 'File not found' };
      return { success: true, data: file };
    }
    case 'GET_PROFILE_FOR_FILL': {
      const profileResult = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
      const answersResult = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ANSWERS);
      const settingsResult = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      return {
        success: true,
        data: {
          profile: profileResult[STORAGE_KEYS.PROFILE] || DEFAULT_PROFILE,
          customAnswers: answersResult[STORAGE_KEYS.CUSTOM_ANSWERS] || [],
          settings: settingsResult[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS,
        }
      };
    }
    case 'TRIGGER_FILL': {
      // Forward to content script
      try {
        const response = await chrome.tabs.sendMessage(message.payload.tabId, { type: 'FILL_REQUESTED' });
        return { success: true, data: response };
      } catch (e) {
        return { success: false, error: 'Could not reach content script' };
      }
    }
    case 'EXPORT_ALL_DATA': {
      const profile = (await chrome.storage.local.get(STORAGE_KEYS.PROFILE))[STORAGE_KEYS.PROFILE] || DEFAULT_PROFILE;
      const customAnswers = (await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ANSWERS))[STORAGE_KEYS.CUSTOM_ANSWERS] || [];
      const settings = (await chrome.storage.local.get(STORAGE_KEYS.SETTINGS))[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
      const files = await getAllFiles();
      return { success: true, data: { profile, customAnswers, settings, files } };
    }
    case 'IMPORT_ALL_DATA': {
      const { profile, customAnswers, settings, files } = message.payload.data;
      await chrome.storage.local.set({
        [STORAGE_KEYS.PROFILE]: profile,
        [STORAGE_KEYS.CUSTOM_ANSWERS]: customAnswers,
        [STORAGE_KEYS.SETTINGS]: settings,
      });
      for (const file of files) {
        await saveFile(file);
      }
      return { success: true };
    }
    default:
      return { success: false, error: 'Unknown message type' };
  }
});

// Open side panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
