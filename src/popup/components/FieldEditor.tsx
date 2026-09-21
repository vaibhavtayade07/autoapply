import React from 'react';

interface Field {
  key: string;
  value: string;
}

interface Props {
  fields: Field[];
  onChange: (fields: Field[]) => void;
}

export default function FieldEditor({ fields, onChange }: Props) {
  const handleAdd = () => {
    onChange([...fields, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, prop: 'key' | 'value', val: string) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [prop]: val };
    onChange(updated);
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
  };

  return (
    <div>
      {fields.map((field, i) => (
        <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          <input
            style={{ ...inputStyle, width: '100px' }}
            value={field.key}
            onChange={(e) => handleChange(i, 'key', e.target.value)}
            placeholder="Label"
          />
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={field.value}
            onChange={(e) => handleChange(i, 'value', e.target.value)}
            placeholder="Value"
          />
          <button
            onClick={() => handleRemove(i)}
            style={{ padding: '4px 8px', border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            x
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        style={{
          padding: '6px 12px',
          border: '1px dashed #d1d5db',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#6b7280',
          width: '100%',
        }}
      >
        + Add Field
      </button>
    </div>
  );
}
