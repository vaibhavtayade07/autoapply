import React, { useState } from 'react';
import type { Profile } from '../../shared/types';
import FieldEditor from '../components/FieldEditor';

interface Props {
  profile: Profile;
  onSave: (profile: Profile) => Promise<void>;
}

export default function ProfileTab({ profile, onSave }: Props) {
  const [form, setForm] = useState<Profile>({ ...profile });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof Profile, value: string) => {
    setForm({ ...form, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block' as const,
    marginBottom: '4px',
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#374151',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>First Name *</label>
          <input
            style={inputStyle}
            value={form.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            placeholder="John"
          />
        </div>
        <div>
          <label style={labelStyle}>Last Name *</label>
          <input
            style={inputStyle}
            value={form.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Email *</label>
        <input
          style={inputStyle}
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label style={labelStyle}>Phone</label>
        <input
          style={inputStyle}
          type="tel"
          value={form.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div>
        <label style={labelStyle}>LinkedIn URL</label>
        <input
          style={inputStyle}
          value={form.linkedInUrl}
          onChange={(e) => handleChange('linkedInUrl', e.target.value)}
          placeholder="https://linkedin.com/in/johndoe"
        />
      </div>

      <div>
        <label style={labelStyle}>GitHub URL</label>
        <input
          style={inputStyle}
          value={form.githubUrl}
          onChange={(e) => handleChange('githubUrl', e.target.value)}
          placeholder="https://github.com/johndoe"
        />
      </div>

      <div>
        <label style={labelStyle}>Portfolio URL</label>
        <input
          style={inputStyle}
          value={form.portfolioUrl}
          onChange={(e) => handleChange('portfolioUrl', e.target.value)}
          placeholder="https://johndoe.dev"
        />
      </div>

      <div>
        <label style={labelStyle}>Location</label>
        <input
          style={inputStyle}
          value={form.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="San Francisco, CA"
        />
      </div>

      <div>
        <label style={labelStyle}>Work Authorization</label>
        <select
          style={inputStyle}
          value={form.workAuthorization}
          onChange={(e) => handleChange('workAuthorization', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="us_citizen">US Citizen</option>
          <option value="green_card">Green Card</option>
          <option value="h1b">H1B Visa</option>
          <option value="opt">OPT</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Custom Fields */}
      <div>
        <label style={labelStyle}>Custom Fields</label>
        <FieldEditor
          fields={form.customFields}
          onChange={(customFields) => setForm({ ...form, customFields })}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '10px 16px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: saved ? '#10b981' : '#2563eb',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
      >
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}
      </button>
    </div>
  );
}
