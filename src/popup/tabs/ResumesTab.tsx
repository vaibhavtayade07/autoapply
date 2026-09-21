import React, { useRef } from 'react';
import type { StoredFile } from '../../shared/types';
import { sendMessage } from '../../shared/messaging';
import { MAX_FILE_SIZE } from '../../shared/constants';

interface Props {
  files: StoredFile[];
  defaultResumeId: string | null;
  defaultCoverLetterId: string | null;
  onUpdateDefaults: (resumeId: string | null, coverLetterId: string | null) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function ResumesTab({ files, defaultResumeId, defaultCoverLetterId, onUpdateDefaults, onRefresh }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resumes = files.filter(f => f.type === 'resume');
  const coverLetters = files.filter(f => f.type === 'cover_letter');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    const buffer = await file.arrayBuffer();
    const storedFile: StoredFile = {
      id: crypto.randomUUID(),
      label: file.name.replace('.pdf', ''),
      type: 'resume', // default, user can change
      fileName: file.name,
      mimeType: file.type,
      blob: buffer,
      size: file.size,
      createdAt: Date.now(),
    };

    await sendMessage({ type: 'SAVE_FILE', payload: { file: storedFile } });
    await onRefresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file?')) return;
    await sendMessage({ type: 'DELETE_FILE', payload: { id } });
    if (defaultResumeId === id) await onUpdateDefaults(null, defaultCoverLetterId);
    if (defaultCoverLetterId === id) await onUpdateDefaults(defaultResumeId, null);
    await onRefresh();
  };

  const handleSetDefault = async (id: string, type: 'resume' | 'cover_letter') => {
    if (type === 'resume') {
      await onUpdateDefaults(id, defaultCoverLetterId);
    } else {
      await onUpdateDefaults(defaultResumeId, id);
    }
  };

  const fileCardStyle: React.CSSProperties = {
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const btnSmall: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          + Upload Resume or Cover Letter (PDF)
        </button>
      </div>

      {/* Resumes */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          Resumes ({resumes.length})
        </h3>
        {resumes.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>No resumes uploaded yet</p>
        )}
        {resumes.map((file) => (
          <div key={file.id} style={fileCardStyle}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{file.label}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {file.fileName} · {Math.round(file.size / 1024)}KB
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleSetDefault(file.id, 'resume')}
                style={{
                  ...btnSmall,
                  backgroundColor: defaultResumeId === file.id ? '#dbeafe' : 'white',
                  borderColor: defaultResumeId === file.id ? '#2563eb' : '#d1d5db',
                }}
              >
                {defaultResumeId === file.id ? '★ Default' : 'Set Default'}
              </button>
              <button onClick={() => handleDelete(file.id)} style={{ ...btnSmall, color: '#ef4444' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cover Letters */}
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          Cover Letters ({coverLetters.length})
        </h3>
        {coverLetters.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>No cover letters uploaded yet</p>
        )}
        {coverLetters.map((file) => (
          <div key={file.id} style={fileCardStyle}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{file.label}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {file.fileName} · {Math.round(file.size / 1024)}KB
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleSetDefault(file.id, 'cover_letter')}
                style={{
                  ...btnSmall,
                  backgroundColor: defaultCoverLetterId === file.id ? '#dbeafe' : 'white',
                  borderColor: defaultCoverLetterId === file.id ? '#2563eb' : '#d1d5db',
                }}
              >
                {defaultCoverLetterId === file.id ? '★ Default' : 'Set Default'}
              </button>
              <button onClick={() => handleDelete(file.id)} style={{ ...btnSmall, color: '#ef4444' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
