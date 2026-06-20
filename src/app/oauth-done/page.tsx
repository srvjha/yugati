'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function OAuthDone() {
  const params = useSearchParams();
  const error  = params.get('error');

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'yugati_oauth', error: error ?? null },
        window.location.origin,
      );
      window.close();
    } else {
      // Opened in same tab (fallback) — redirect back to settings
      window.location.replace('/dashboard/settings?tab=integrations');
    }
  }, [error]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
      {error ? 'Connection failed — closing…' : 'Connected — closing…'}
    </div>
  );
}

export default function OAuthDonePage() {
  return (
    <Suspense>
      <OAuthDone />
    </Suspense>
  );
}
