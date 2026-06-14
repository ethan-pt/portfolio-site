export interface CategoryDto {
    id: number;
    name: string;
}

export interface SkillIconDto {
    slug: string;
    title: string;
    hex: string;
    path: string;
}

export type SkillIconCandidateDto = SkillIconDto;

export interface SkillDto {
    id: number;
    name: string;
    icon_slug: string | null;
    icon: SkillIconDto | null;
    categories: CategoryDto[];
    featured: boolean;
}

export type ProjectSkillDto = SkillDto;

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
