import React, { useState, useEffect } from 'react';
import type { Profile, CustomAnswer, FormField, FillResult, Settings } from '../shared/types';
import { sendMessage } from '../shared/messaging';
import { AutoFillEngine } from './engine';

// Floating Action Button
function FloatingActionButton({ onClick, portalName }: { onClick: () => void; portalName: string }) {
  return (
    <button
      onClick={onClick}
      title={`AutoApply — Fill this form (${portalName})`}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    </button>
  );
}

// Preview Overlay
function PreviewOverlay({
  fields,
  profile,
  customAnswers,
  portalName,
  onFill,
  onClose,
}: {
  fields: FormField[];
  profile: Profile;
  customAnswers: CustomAnswer[];
  portalName: string;
  onFill: (overrides: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      if (field.profileKey.startsWith('custom:')) {
        const question = field.profileKey.replace('custom:', '');
        const match = customAnswers.find(a =>
          a.question.toLowerCase().includes(question.toLowerCase()) ||
          question.toLowerCase().includes(a.question.toLowerCase())
        );
        initial[field.selector] = match?.answer || '';
      } else if (field.profileKey.startsWith('defaults.')) {
        initial[field.selector] = '[File]';
      } else {
        initial[field.selector] = (profile as unknown as Record<string, unknown>)[field.profileKey] as string || '';
      }
    }
    return initial;
  });

  const [editing, setEditing] = useState<string | null>(null);

  const handleFill = () => {
    onFill(values);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '560px',
        maxHeight: '80vh',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        zIndex: 2147483647,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>AutoApply Preview</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Portal: {portalName} — {fields.length} fields detected
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af' }}>×</button>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Field</th>
              <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Value</th>
              <th style={{ width: '40px', padding: '8px 0' }}></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.selector} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 0', color: '#374151' }}>
                  {field.label}
                  {field.confidence < 0.7 && <span style={{ color: '#f59e0b', marginLeft: '4px' }}>⚠</span>}
                </td>
                <td style={{ padding: '8px 0' }}>
                  {editing === field.selector ? (
                    <input
                      type="text"
                      value={values[field.selector] || ''}
                      onChange={(e) => setValues({ ...values, [field.selector]: e.target.value })}
                      onBlur={() => setEditing(null)}
                      autoFocus
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditing(field.selector)}
                      style={{ cursor: 'pointer', color: field.type === 'file' ? '#6b7280' : '#111827' }}
                    >
                      {field.type === 'file' ? '[File upload]' : (values[field.selector] || '—')}
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 0', textAlign: 'center' }}>
                  {field.type !== 'file' && (
                    <button
                      onClick={() => setEditing(field.selector)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px' }}
                      title="Edit"
                    >
                      ✎
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {fields.filter(f => f.confidence < 0.7).length} low-confidence fields
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px' }}
          >
            Skip
          </button>
          <button
            onClick={handleFill}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            Fill All Fields →
          </button>
        </div>
      </div>
    </div>
  );
}

// Result Toast
function FillResultToast({ result, onClose }: { result: FillResult; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '90px',
        right: '24px',
        padding: '12px 20px',
        borderRadius: '8px',
        backgroundColor: result.errors.length > 0 ? '#fef3c7' : '#d1fae5',
        color: result.errors.length > 0 ? '#92400e' : '#065f46',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 2147483647,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        maxWidth: '320px',
      }}
    >
      <strong>{result.filled} fields filled</strong>
      {result.skipped > 0 && <span> · {result.skipped} skipped</span>}
      {result.errors.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '13px' }}>
          {result.errors.map((e, i) => <div key={i}>⚠ {e.field}: {e.reason}</div>)}
        </div>
      )}
    </div>
  );
}

// Main Overlay App
export function OverlayApp() {
  const [showPreview, setShowPreview] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [customAnswers, setCustomAnswers] = useState<CustomAnswer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [portalName, setPortalName] = useState('');
  const [result, setResult] = useState<FillResult | null>(null);
  const [engine] = useState(() => new AutoFillEngine());

  useEffect(() => {
    engine.start();

    // Detect portal on load
    engine.detect().then((detected) => {
      if (detected.adapter) {
        setPortalName(detected.portalName);
        setFields(engine.getFields());
      }
    });

    // Load settings
    sendMessage({ type: 'GET_SETTINGS' }).then((resp) => {
      if (resp.success && resp.data) setSettings(resp.data);
    });

    // Listen for messages from background
    const listener = (msg: { type: string }) => {
      if (msg.type === 'FILL_REQUESTED') {
        handleOpenPreview();
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    return () => {
      engine.stop();
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const handleOpenPreview = async () => {
    // Re-detect
    const detected = await engine.detect();
    if (!detected.adapter) return;

    setPortalName(detected.portalName);
    setFields(engine.getFields());

    // Get profile data
    const response = await sendMessage({ type: 'GET_PROFILE_FOR_FILL', payload: { portalType: detected.adapter.type } });
    if (!response.success || !response.data) return;

    setProfile(response.data.profile);
    setCustomAnswers(response.data.customAnswers);

    // If showOverlay is disabled, fill directly without preview
    if (settings && !settings.showOverlay) {
      const fillResult = await engine.fill(response.data.profile, response.data.customAnswers);
      setResult(fillResult);
    } else {
      setShowPreview(true);
    }
  };

  const handleFill = async (overrides: Record<string, string>) => {
    if (!profile) return;

    // Apply overrides to profile
    const adjustedProfile = { ...profile };
    for (const [selector, value] of Object.entries(overrides)) {
      const field = fields.find(f => f.selector === selector);
      if (field && !field.profileKey.startsWith('defaults.') && !field.profileKey.startsWith('custom:')) {
        (adjustedProfile as unknown as Record<string, unknown>)[field.profileKey] = value;
      }
    }

    const fillResult = await engine.fill(adjustedProfile, customAnswers);
    setResult(fillResult);
    setShowPreview(false);
  };

  return (
    <>
      <FloatingActionButton onClick={handleOpenPreview} portalName={portalName} />
      {showPreview && profile && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 2147483646,
            }}
            onClick={() => setShowPreview(false)}
          />
          <PreviewOverlay
            fields={fields}
            profile={profile}
            customAnswers={customAnswers}
            portalName={portalName}
            onFill={handleFill}
            onClose={() => setShowPreview(false)}
          />
        </>
      )}
      {result && <FillResultToast result={result} onClose={() => setResult(null)} />}
    </>
  );
}
