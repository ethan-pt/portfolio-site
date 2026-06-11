export interface CategoryDto {
    id: number;
    name: string;
}

export interface SkillDto {
    id: number;
    name: string;
    categories: CategoryDto[];
    featured: boolean;
}

export interface ProjectSkillDto {
    id: number;
    name: string;
    categories: CategoryDto[];
    featured: boolean;
}

export interface ProjectDto {
    id: number;
    title: string;
    description: string;
    image_url: string | null;
    link: string;
    categories: CategoryDto[];
    featured: boolean;
    order_index: number | null;
    skills: ProjectSkillDto[];
}

export interface AdminProjectDto extends ProjectDto {
    image_key: string | null;
}

export interface AdminUserDto {
    authenticated: true;
    provider: 'github';
    githubId: string;
    login: string;
}
