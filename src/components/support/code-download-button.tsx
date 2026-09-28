'use client';

import { useState, useCallback } from 'react';

export function CodeDownloadButton() {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'err'>('idle');

  const handleClick = useCallback(async () => {
    setStatus('working');
    try {
      const r = await fetch('/download-page.html');
      if (!r.ok) throw new Error(String(r.status));
      const txt = await r.text();
      const m = txt.match(/var B64="([^"]+)"/);
      if (!m) throw new Error('data not found');
      const bin = atob(m[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'baznova-latest.bundle';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('err');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, []);

  const label = status === 'working' ? 'Chargement...' : status === 'done' ? 'Termine !' : status === 'err' ? 'Erreur' : '\u2B07 Telecharger Code';
  const opacity = status === 'working' ? 'opacity-60' : '';

  return (
    <button
      onClick={handleClick}
      disabled={status === 'working'}
      className={`fixed bottom-5 right-5 z-[99999] flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors ${opacity}`}
      style={{ cursor: status === 'working' ? 'not-allowed' : 'pointer' }}
    >
      {label}
    </button>
  );
}
