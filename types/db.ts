export interface Project {
    id: number;
    title: string;
    description: string;
    summary_description?: string | null;
    full_description?: string | null;
    image_url?: string | null;
    image_key?: string | null;
    link: string;
    live_url?: string | null;
    category: string;
    featured: boolean;
    order_index: number | null;
    created_at: string;
}

export interface ProjectImage {
    id: number;
    project_id: number;
    image_url: string;
    image_key?: string | null;
    is_thumbnail: boolean;
    order_index: number;
    created_at: string;
}

export interface Skill {
    id: number;
    name: string;
    category: string;
    icon_slug?: string | null;
    icon_url?: string | null;
    featured: boolean;
    created_at: string;
}

export interface ProjectSkill {
    project_id: number;
    skill_id: number;
}

export interface Category {
    id: number;
    name: string;
    created_at: string;
}

export interface ProjectCategory {
    project_id: number;
    category_id: number;
}

export interface SkillCategory {
    skill_id: number;
    category_id: number;
}
