import React, { useEffect, useState } from 'react';

interface SharedResultViewProps {
  resultId: string;
  onClose: () => void;
}

/** Shows a shared match result inside the Mini App (opened from a Telegram link). */
export const SharedResultView: React.FC<SharedResultViewProps> = ({ resultId, onClose }) => {
  const [data, setData] = useState<{ text: string; imageUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/results/${encodeURIComponent(resultId)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Could not load this result.');
        return body as { text: string; imageUrl: string };
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [resultId]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#1a0b2e] text-white flex flex-col items-center justify-center p-4 overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-black bg-white/10 border border-white/20"
      >
        Close
      </button>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!error && !data && <p className="text-sm opacity-70">Loading result…</p>}
      {data && (
        <div className="w-full max-w-sm text-center">
          <img src={data.imageUrl} alt="Match results" className="w-full rounded-2xl" />
          <p className="mt-3 text-sm whitespace-pre-line">{data.text}</p>
        </div>
      )}
    </div>
  );
}
