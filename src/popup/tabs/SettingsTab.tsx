import React from 'react';
import type { Settings } from '../../shared/types';
import { sendMessage } from '../../shared/messaging';

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
}

export default function SettingsTab({ settings, onSave }: Props) {
  const handleExport = async () => {
    const response = await sendMessage({ type: 'EXPORT_ALL_DATA' });
    if (response.success && response.data) {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autoapply-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        alert('Invalid JSON file.');
        return;
      }
      
      // Validate expected structure
      if (!data || typeof data !== 'object') {
        alert('Invalid data format.');
        return;
      }
      if (!data.profile || typeof data.profile !== 'object') {
        alert('Missing or invalid profile data.');
        return;
      }
      if (!Array.isArray(data.customAnswers)) {
        alert('Missing or invalid custom answers data.');
        return;
      }
      if (!data.settings || typeof data.settings !== 'object') {
        alert('Missing or invalid settings data.');
        return;
      }
      if (!Array.isArray(data.files)) {
        alert('Missing or invalid files data.');
        return;
      }
      
      if (confirm('This will replace all your current data. Continue?')) {
        await sendMessage({ type: 'IMPORT_ALL_DATA', payload: { data } });
        window.location.reload();
      }
    };
    input.click();
  };

  const toggleStyle: React.CSSProperties = {
    width: '40px',
    height: '22px',
    borderRadius: '11px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
  };

  const toggleKnob = (on: boolean): React.CSSProperties => ({
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'white',
    position: 'absolute',
    top: '2px',
    left: on ? '20px' : '2px',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Portal Toggles */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          Enabled Portals
        </h3>
        {(['greenhouse', 'lever', 'wellfound', 'generic'] as const).map((portal) => (
          <div key={portal} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: '14px', color: '#374151', textTransform: 'capitalize' }}>{portal}</span>
            <button
              onClick={() => {
                const newSettings = {
                  ...settings,
                  enabledPortals: {
                    ...settings.enabledPortals,
                    [portal]: !settings.enabledPortals[portal],
                  },
                };
                onSave(newSettings);
              }}
              style={{
                ...toggleStyle,
                backgroundColor: settings.enabledPortals[portal] ? '#2563eb' : '#d1d5db',
              }}
            >
              <div style={toggleKnob(settings.enabledPortals[portal])} />
            </button>
          </div>
        ))}
      </div>

      {/* General Settings */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          General
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>Auto-detect portal</span>
          <button
            onClick={() => onSave({ ...settings, autoDetect: !settings.autoDetect })}
            style={{
              ...toggleStyle,
              backgroundColor: settings.autoDetect ? '#2563eb' : '#d1d5db',
            }}
          >
            <div style={toggleKnob(settings.autoDetect)} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>Show preview before fill</span>
          <button
            onClick={() => onSave({ ...settings, showOverlay: !settings.showOverlay })}
            style={{
              ...toggleStyle,
              backgroundColor: settings.showOverlay ? '#2563eb' : '#d1d5db',
            }}
          >
            <div style={toggleKnob(settings.showOverlay)} />
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          Data Management
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExport}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Export Data
          </button>
          <button
            onClick={handleImport}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Import Data
          </button>
        </div>
      </div>

      {/* Reset Onboarding */}
      <div>
        <button
          onClick={async () => {
            if (confirm('Reset onboarding? This will show the setup wizard again on next open.')) {
              await onSave({ ...settings, onboardingComplete: false });
              window.location.reload();
            }
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Reset Onboarding
        </button>
      </div>

      {/* Version */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
        AutoApply v1.0.0 - Data stays local - Zero network calls
      </div>
    </div>
  );
}
