import type { Skill } from '@/types/db';

export async function getSkills(): Promise<Skill[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/skills`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch skills: ${response.statusText}`);
    }

    return response.json();
}
