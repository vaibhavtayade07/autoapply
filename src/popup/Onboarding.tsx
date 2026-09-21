import React, { useState } from 'react';
import type { Profile, StoredFile } from '../shared/types';
import { sendMessage } from '../shared/messaging';
import { MAX_FILE_SIZE } from '../shared/constants';

interface Props {
  profile: Profile;
  onSaveProfile: (profile: Profile) => Promise<void>;
  onComplete: () => Promise<void>;
}

export default function Onboarding({ profile, onSaveProfile, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Profile>({ ...profile });
  const [resumeUploaded, setResumeUploaded] = useState(false);

  const handleChange = (field: keyof Profile, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleNext = async () => {
    if (step === 1) {
      await onSaveProfile(form);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      await onComplete();
    }
  };

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Max 10MB.');
      return;
    }

    const buffer = await file.arrayBuffer();
    const storedFile: StoredFile = {
      id: crypto.randomUUID(),
      label: file.name.replace('.pdf', ''),
      type: 'resume',
      fileName: file.name,
      mimeType: file.type,
      blob: buffer,
      size: file.size,
      createdAt: Date.now(),
    };

    await sendMessage({ type: 'SAVE_FILE', payload: { file: storedFile } });
    setResumeUploaded(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block' as const,
    marginBottom: '4px',
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#374151',
  };

  return (
    <div style={{ width: '380px', minHeight: '500px', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Step {step} of 3</span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>{Math.round((step / 3) * 100)}%</span>
        </div>
        <div style={{ height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${(step / 3) * 100}%`, backgroundColor: '#2563eb', borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Step 1: Profile */}
      {step === 1 && (
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 600 }}>Welcome to AutoApply</h2>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6b7280' }}>Let's set up your profile first.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} placeholder="John" />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} placeholder="Doe" />
            </div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="john@example.com" />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>LinkedIn URL</label>
            <input style={inputStyle} value={form.linkedInUrl} onChange={(e) => handleChange('linkedInUrl', e.target.value)} placeholder="https://linkedin.com/in/johndoe" />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>GitHub URL</label>
            <input style={inputStyle} value={form.githubUrl} onChange={(e) => handleChange('githubUrl', e.target.value)} placeholder="https://github.com/johndoe" />
          </div>
        </div>
      )}

      {/* Step 2: Resume Upload */}
      {step === 2 && (
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 600 }}>Upload Your Resume</h2>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6b7280' }}>Required to start auto-filling applications.</p>
          
          <div style={{ border: '2px dashed #d1d5db', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#x1F4C4;</div>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151' }}>
              {resumeUploaded ? 'Resume uploaded!' : 'Drop your resume PDF here'}
            </p>
            {!resumeUploaded && (
              <>
                <input type="file" accept=".pdf" onChange={handleUploadResume} style={{ display: 'none' }} id="resume-upload" />
                <label htmlFor="resume-upload" style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  Choose File
                </label>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#9ca3af' }}>PDF only, max 10MB</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#x1F389;</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>You're all set!</h2>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>
            AutoApply will detect job portals and auto-fill your information. Visit any Greenhouse, Lever, or Wellfound job page to try it.
          </p>
        </div>
      )}

      {/* Navigation */}
      <button
        onClick={handleNext}
        disabled={step === 1 && (!form.firstName || !form.email)}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          borderRadius: '8px',
          backgroundColor: '#2563eb',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          opacity: (step === 1 && (!form.firstName || !form.email)) ? 0.5 : 1,
        }}
      >
        {step === 3 ? 'Get Started' : 'Continue'}
      </button>
    </div>
  );
}
