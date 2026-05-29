import type { Project } from '@/types/db';

export async function getProjects(): Promise<Project[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    return response.json();
}
