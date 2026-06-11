export interface Project {
    id: number;
    title: string;
    description: string;
    image_url?: string | null;
    image_key?: string | null;
    link: string;
    category: string;
    featured: boolean;
    order_index: number | null;
    created_at: string;
}

export interface Skill {
    id: number;
    name: string;
    category: string;
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
