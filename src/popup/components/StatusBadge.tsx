import React from 'react';

interface Props {
  status: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

const colors = {
  success: { bg: '#d1fae5', text: '#065f46' },
  error: { bg: '#fee2e2', text: '#991b1b' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  info: { bg: '#dbeafe', text: '#1e40af' },
};

export default function StatusBadge({ status, children }: Props) {
  const style = colors[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {children}
    </span>
  );
}
