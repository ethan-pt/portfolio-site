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

export interface ProjectImageDto {
    id: number;
    image_url: string;
    image_key: string | null;
    is_thumbnail: boolean;
    order_index: number;
}

export interface ProjectDto {
    id: number;
    title: string;
    description: string;
    summary_description: string;
    full_description: string;
    image_url: string | null;
    thumbnail_image: ProjectImageDto | null;
    images: ProjectImageDto[];
    link: string;
    github_url: string;
    live_url: string | null;
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
