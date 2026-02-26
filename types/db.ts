export interface Project {
    id: number;
    title: string;
    description: string;
    image_url?: string;
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
