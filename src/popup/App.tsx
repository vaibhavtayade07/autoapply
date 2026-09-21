import React, { useState, useEffect } from 'react';
import type { Profile, CustomAnswer, Settings, StoredFile } from '../shared/types';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../shared/types';
import { sendMessage } from '../shared/messaging';
import ProfileTab from './tabs/ProfileTab';
import ResumesTab from './tabs/ResumesTab';
import AnswersTab from './tabs/AnswersTab';
import SettingsTab from './tabs/SettingsTab';
import Onboarding from './Onboarding';

type Tab = 'profile' | 'resumes' | 'answers' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [customAnswers, setCustomAnswers] = useState<CustomAnswer[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileResp, answersResp, settingsResp, filesResp] = await Promise.all([
        sendMessage({ type: 'GET_PROFILE' }),
        sendMessage({ type: 'GET_CUSTOM_ANSWERS' }),
        sendMessage({ type: 'GET_SETTINGS' }),
        sendMessage({ type: 'GET_FILES' }),
      ]);
      
      if (profileResp.success) setProfile(profileResp.data || DEFAULT_PROFILE);
      if (answersResp.success) setCustomAnswers(answersResp.data || []);
      if (settingsResp.success) setSettings(settingsResp.data || DEFAULT_SETTINGS);
      if (filesResp.success) setFiles(filesResp.data || []);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (newProfile: Profile) => {
    setProfile(newProfile);
    await sendMessage({ type: 'SAVE_PROFILE', payload: { profile: newProfile } });
  };

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await sendMessage({ type: 'SAVE_SETTINGS', payload: { settings: newSettings } });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (!settings.onboardingComplete) {
    return (
      <Onboarding
        profile={profile}
        onSaveProfile={saveProfile}
        onComplete={async () => {
          const newSettings = { ...settings, onboardingComplete: true };
          await saveSettings(newSettings);
        }}
      />
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'resumes', label: 'Resumes', icon: '📄' },
    { id: 'answers', label: 'Answers', icon: '💬' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div style={{ width: '380px', minHeight: '500px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>AutoApply</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Job application auto-filler</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#2563eb' : '#6b7280',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{tab.icon}</div>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '16px 20px' }}>
        {activeTab === 'profile' && (
          <ProfileTab profile={profile} onSave={saveProfile} />
        )}
        {activeTab === 'resumes' && (
          <ResumesTab
            files={files}
            defaultResumeId={profile.defaults.resumeId}
            defaultCoverLetterId={profile.defaults.coverLetterId}
            onUpdateDefaults={async (resumeId, coverLetterId) => {
              const newProfile = { ...profile, defaults: { resumeId, coverLetterId } };
              await saveProfile(newProfile);
            }}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'answers' && (
          <AnswersTab
            answers={customAnswers}
            onUpdate={async (answers) => {
              setCustomAnswers(answers);
              for (const answer of answers) {
                await sendMessage({ type: 'SAVE_CUSTOM_ANSWER', payload: { answer } });
              }
            }}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab settings={settings} onSave={saveSettings} />
        )}
      </div>
    </div>
  );
}
