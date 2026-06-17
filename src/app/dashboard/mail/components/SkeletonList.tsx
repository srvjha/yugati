"use client";

export function SkeletonList() {
  return (
    <div className="flex-1">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40"
        >
          <div className="w-10 shrink-0" />
          <div className="w-28 h-3 bg-zinc-900 animate-pulse" />
          <div
            className="flex-1 h-3 bg-zinc-900 animate-pulse"
            style={{ maxWidth: `${30 + ((i * 11) % 40)}%` }}
          />
          <div className="w-10 h-3 bg-zinc-900 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
