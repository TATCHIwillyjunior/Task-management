import { useState } from 'react';

export default function CopyId({ id }) {
  const [copied, setCopied] = useState(false);
  const text = String(id || '');

  function copy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!text) return <span style={{ color: 'var(--muted)' }}>—</span>;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{text}</span>
      <button
        onClick={copy}
        title="Copy to clipboard"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '1px 3px',
          borderRadius: 3,
          fontSize: 11,
          lineHeight: 1,
          color: copied ? '#4db87a' : 'var(--muted)',
          transition: 'color 0.2s',
        }}
      >
        {copied ? '✓' : '⧉'}
      </button>
    </span>
  );
}
