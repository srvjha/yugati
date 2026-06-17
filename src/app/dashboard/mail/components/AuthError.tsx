"use client";

import { Plug } from "lucide-react";

export function AuthError() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border border-zinc-800 bg-zinc-900 flex items-center justify-center">
        <Plug size={18} className="text-zinc-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Gmail not connected</p>
        <p className="text-xs text-zinc-500 mt-1">
          Connect your account to see messages
        </p>
      </div>
      <a
        href="/api/corsair/connect?plugin=gmail"
        className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-medium hover:bg-zinc-100 transition-colors"
      >
        <Plug size={12} />
        Connect Gmail
      </a>
    </div>
  );
}
