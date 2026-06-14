import iconsData from 'simple-icons/icons.json';
import * as simpleIcons from 'simple-icons';
import { slugToVariableName, titleToSlug } from 'simple-icons/sdk';
import type { SimpleIcon } from 'simple-icons';
import type { SkillIconCandidateDto, SkillIconDto } from '@/types/api';

type IconData = {
    title: string;
    slug: string;
    hex: string;
    aliases?: {
        aka?: string[];
        old?: string[];
        dup?: { title: string }[];
    };
};

const iconCatalog = iconsData as IconData[];
const iconExports = simpleIcons as unknown as Record<string, SimpleIcon | undefined>;

const aliases = new Map<string, string>([
    ['cloudflare worker', 'cloudflareworkers'],
    ['cloudflare workers', 'cloudflareworkers'],
    ['d1', 'cloudflare'],
    ['next', 'nextdotjs'],
    ['next.js', 'nextdotjs'],
    ['node', 'nodedotjs'],
    ['node.js', 'nodedotjs'],
    ['postgres', 'postgresql'],
    ['sqlite d1', 'cloudflare'],
    ['tailwind', 'tailwindcss'],
]);

function normalize(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function iconFromSimpleIcon(icon: SimpleIcon): SkillIconDto {
    return {
        slug: icon.slug,
        title: icon.title,
        hex: icon.hex,
        path: icon.path,
    };
}

export function getSkillIcon(slug: string | null | undefined): SkillIconDto | null {
    if (!slug) return null;

    const variableName = slugToVariableName(slug);
    const icon = iconExports[variableName];
    return icon ? iconFromSimpleIcon(icon) : null;
}

function candidateToIcon(candidate: IconData): SkillIconCandidateDto | null {
    return getSkillIcon(candidate.slug) ?? {
        slug: candidate.slug,
        title: candidate.title,
        hex: candidate.hex,
        path: '',
    };
}

function searchableNames(icon: IconData): string[] {
    return [
        icon.title,
        icon.slug,
        ...(icon.aliases?.aka ?? []),
        ...(icon.aliases?.old ?? []),
        ...(icon.aliases?.dup ?? []).map((alias) => alias.title),
    ];
}

function scoreIcon(icon: IconData, query: string): number {
    const normalizedQuery = normalize(query);
    const querySlug = titleToSlug(query);
    const aliasSlug = aliases.get(query.toLowerCase().trim());

    if (aliasSlug && icon.slug === aliasSlug) return 120;
    if (icon.slug === querySlug) return 110;

    let score = 0;
    for (const name of searchableNames(icon)) {
        const normalizedName = normalize(name);
        if (normalizedName === normalizedQuery) score = Math.max(score, 100);
        else if (normalizedName.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedName)) score = Math.max(score, 80);
        else if (normalizedName.includes(normalizedQuery)) score = Math.max(score, 55);
    }

    return score;
}

export function searchSkillIcons(query: string, limit = 8): SkillIconCandidateDto[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    return iconCatalog
        .map((icon) => ({ icon, score: scoreIcon(icon, trimmedQuery) }))
        .filter((result) => result.score > 0)
        .sort((left, right) => right.score - left.score || left.icon.title.localeCompare(right.icon.title))
        .slice(0, limit)
        .map((result) => candidateToIcon(result.icon))
        .filter((icon): icon is SkillIconCandidateDto => Boolean(icon));
}
