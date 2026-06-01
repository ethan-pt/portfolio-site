import type { SkillDto } from '@/types/api';

export async function getSkills(): Promise<SkillDto[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/skills`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch skills: ${response.statusText}`);
    }

    return response.json();
}
