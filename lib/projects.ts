import type { ProjectDto } from '@/types/api';

export async function getProjects(): Promise<ProjectDto[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    return response.json();
}
