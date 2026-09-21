import React, { useState } from 'react';
import type { CustomAnswer } from '../../shared/types';

interface Props {
  answers: CustomAnswer[];
  onUpdate: (answers: CustomAnswer[]) => Promise<void>;
}

export default function AnswersTab({ answers, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState('');

  const handleAdd = async () => {
    if (!question.trim() || !answer.trim()) return;
    
    const newAnswer: CustomAnswer = {
      id: crypto.randomUUID(),
      question: question.trim(),
      answer: answer.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    
    await onUpdate([...answers, newAnswer]);
    setQuestion('');
    setAnswer('');
    setTags('');
  };

  const handleEdit = (a: CustomAnswer) => {
    setEditingId(a.id);
    setQuestion(a.question);
    setAnswer(a.answer);
    setTags(a.tags.join(', '));
  };

  const handleSave = async () => {
    if (!editingId) return;
    
    const updated = answers.map(a => 
      a.id === editingId
        ? { ...a, question: question.trim(), answer: answer.trim(), tags: tags.split(',').map(t => t.trim()).filter(Boolean) }
        : a
    );
    
    await onUpdate(updated);
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setTags('');
  };

  const handleDelete = async (id: string) => {
    await onUpdate(answers.filter(a => a.id !== id));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
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
    <div>
      {/* Add/Edit Form */}
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>
          {editingId ? 'Edit Answer' : 'Add New Answer'}
        </h3>
        
        <div style={{ marginBottom: '8px' }}>
          <label style={labelStyle}>Question</label>
          <input
            style={inputStyle}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Why do you want to work here?"
          />
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <label style={labelStyle}>Answer</label>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
          />
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <input
            style={inputStyle}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="culture, mission, growth"
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={editingId ? handleSave : handleAdd}
            disabled={!question.trim() || !answer.trim()}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: (!question.trim() || !answer.trim()) ? 0.5 : 1,
            }}
          >
            {editingId ? 'Save' : 'Add Answer'}
          </button>
          {editingId && (
            <button
              onClick={() => { setEditingId(null); setQuestion(''); setAnswer(''); setTags(''); }}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Answer List */}
      {answers.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
          No custom answers yet. Add your first one above.
        </p>
      )}
      
      {answers.map((a) => (
        <div key={a.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
            Q: {a.question}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
            {a.answer}
          </div>
          {a.tags.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {a.tags.map((tag) => (
                <span key={tag} style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#f3f4f6', borderRadius: '12px', fontSize: '11px', color: '#6b7280', marginRight: '4px' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleEdit(a)} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', fontSize: '12px' }}>
              Edit
            </button>
            <button onClick={() => handleDelete(a.id)} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', fontSize: '12px', color: '#ef4444' }}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
