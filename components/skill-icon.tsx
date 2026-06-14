import type { SkillIconDto } from '@/types/api';

type SkillIconProps = {
  name: string;
  icon?: SkillIconDto | null;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function SkillIcon({ name, icon, className = '' }: SkillIconProps) {
  const label = icon ? icon.title : name;

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#B4A5A5]/20 bg-[#B4A5A5]/10 text-xs font-bold text-white ${className}`}
      title={icon ? icon.title : 'Initials fallback'}
      aria-label={label}
    >
      {icon ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" role="img" aria-hidden="true" fill={`#${icon.hex}`}>
          <path d={icon.path} />
        </svg>
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
