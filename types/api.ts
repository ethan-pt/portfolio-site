export interface SkillDto {
    id: number;
    name: string;
    category: string;
    featured: boolean;
}

export interface ProjectSkillDto {
    id: number;
    name: string;
    category: string;
    featured: boolean;
}

export interface ProjectDto {
    id: number;
    title: string;
    description: string;
    image_url: string | null;
    link: string;
    category: string;
    featured: boolean;
    order_index: number | null;
    skills: ProjectSkillDto[];
}

export interface AdminUserDto {
    authenticated: true;
    provider: 'github';
    githubId: string;
    login: string;
}
