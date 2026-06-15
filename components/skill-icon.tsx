"use client";

import { useState } from 'react';

type SkillIconProps = {
  name: string;
  iconUrl?: string | null;
  className?: string;
  onImageError?: () => void;
  onImageLoad?: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function SkillIcon({ name, iconUrl, className = '', onImageError, onImageLoad }: SkillIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const effectiveIconUrl = iconUrl && failedSrc !== iconUrl ? iconUrl : null;
  const label = effectiveIconUrl ? `${name} icon` : name;

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#B4A5A5]/20 bg-[#B4A5A5]/10 text-xs font-bold text-white ${className}`}
      title={effectiveIconUrl ? `${name} icon` : 'Initials fallback'}
      aria-label={label}
    >
      {effectiveIconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Skill icon URLs are manually curated external assets.
        <img src={effectiveIconUrl} alt="" className="h-4 w-4 object-contain" onLoad={onImageLoad} onError={() => { setFailedSrc(effectiveIconUrl); onImageError?.(); }} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
