export interface Project {
    id: number;
    title: string;
    description: string;
    image_url?: string;
    link?: string;
    featured: boolean;
    order_index?: number;
    created_at: string;
}

export interface Skill {
    id: number;
    name: string;
    category: string;
    created_at: string;
}
