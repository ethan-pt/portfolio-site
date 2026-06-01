import type { Project, Skill } from '@/types/db';
import { HttpError } from './http';

export type ProjectCreateInput = Omit<Project, 'id' | 'created_at'>;
export type ProjectUpdateInput = Partial<Omit<Project, 'id' | 'created_at'>>;
export type SkillCreateInput = Omit<Skill, 'id' | 'created_at'>;
export type SkillUpdateInput = Partial<Omit<Skill, 'id' | 'created_at'>>;

const allowedProjectFields = new Set([
    'title',
    'description',
    'image_url',
    'image_key',
    'link',
    'category',
    'featured',
    'order_index',
]);

const allowedSkillFields = new Set(['name', 'category', 'featured']);

function validateNoUnknownFields(body: Record<string, unknown>, allowedFields: Set<string>): void {
    for (const key of Object.keys(body)) {
        if (key !== 'id' && !allowedFields.has(key)) {
            throw new HttpError(400, `Unknown field: ${key}`);
        }
    }
}

function stringField(body: Record<string, unknown>, key: string): string {
    const value = body[key];

    if (typeof value !== 'string' || value.trim() === '') {
        throw new HttpError(400, `Invalid ${key}`);
    }

    return value.trim();
}

function optionalNullableStringField(body: Record<string, unknown>, key: string): string | null | undefined {
    if (!(key in body)) {
        return undefined;
    }

    const value = body[key];

    if (value === null) {
        return null;
    }

    if (typeof value !== 'string') {
        throw new HttpError(400, `Invalid ${key}`);
    }

    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function booleanField(body: Record<string, unknown>, key: string): boolean {
    if (typeof body[key] !== 'boolean') {
        throw new HttpError(400, `Invalid ${key}`);
    }

    return body[key];
}

function optionalBooleanField(body: Record<string, unknown>, key: string): boolean | undefined {
    if (!(key in body)) {
        return undefined;
    }

    return booleanField(body, key);
}

function nullableIntegerField(body: Record<string, unknown>, key: string): number | null {
    const value = body[key];

    if (value === null) {
        return null;
    }

    if (!Number.isInteger(value)) {
        throw new HttpError(400, `Invalid ${key}`);
    }

    return value as number;
}

function optionalNullableIntegerField(body: Record<string, unknown>, key: string): number | null | undefined {
    if (!(key in body)) {
        return undefined;
    }

    return nullableIntegerField(body, key);
}

function validateUrl(value: string, key: string): void {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            throw new Error('Invalid protocol');
        }
    } catch {
        throw new HttpError(400, `Invalid ${key}`);
    }
}

export function idFromBody(body: Record<string, unknown>, label: string): number {
    const id = body.id;

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, `Missing ${label} ID`);
    }

    return id;
}

export function parseCreateProject(body: Record<string, unknown>): ProjectCreateInput {
    validateNoUnknownFields(body, allowedProjectFields);

    const imageUrl = optionalNullableStringField(body, 'image_url') ?? null;
    const imageKey = optionalNullableStringField(body, 'image_key') ?? null;
    const link = stringField(body, 'link');

    validateUrl(link, 'link');

    if (imageUrl !== null) {
        validateUrl(imageUrl, 'image_url');
    }

    return {
        title: stringField(body, 'title'),
        description: stringField(body, 'description'),
        image_url: imageUrl,
        image_key: imageKey,
        link,
        category: stringField(body, 'category'),
        featured: booleanField(body, 'featured'),
        order_index: nullableIntegerField(body, 'order_index'),
    };
}

export function parseUpdateProject(body: Record<string, unknown>): ProjectUpdateInput {
    validateNoUnknownFields(body, allowedProjectFields);

    const update: ProjectUpdateInput = {};

    for (const key of ['title', 'description', 'link', 'category'] as const) {
        if (key in body) {
            update[key] = stringField(body, key);
        }
    }

    if (update.link) {
        validateUrl(update.link, 'link');
    }

    const imageUrl = optionalNullableStringField(body, 'image_url');
    if (imageUrl !== undefined) {
        if (imageUrl !== null) {
            validateUrl(imageUrl, 'image_url');
        }
        update.image_url = imageUrl;
    }

    const imageKey = optionalNullableStringField(body, 'image_key');
    if (imageKey !== undefined) {
        update.image_key = imageKey;
    }

    const featured = optionalBooleanField(body, 'featured');
    if (featured !== undefined) {
        update.featured = featured;
    }

    const orderIndex = optionalNullableIntegerField(body, 'order_index');
    if (orderIndex !== undefined) {
        update.order_index = orderIndex;
    }

    return update;
}

export function parseCreateSkill(body: Record<string, unknown>): SkillCreateInput {
    validateNoUnknownFields(body, allowedSkillFields);

    return {
        name: stringField(body, 'name'),
        category: stringField(body, 'category'),
        featured: booleanField(body, 'featured'),
    };
}

export function parseUpdateSkill(body: Record<string, unknown>): SkillUpdateInput {
    validateNoUnknownFields(body, allowedSkillFields);

    const update: SkillUpdateInput = {};

    if ('name' in body) {
        update.name = stringField(body, 'name');
    }

    if ('category' in body) {
        update.category = stringField(body, 'category');
    }

    const featured = optionalBooleanField(body, 'featured');
    if (featured !== undefined) {
        update.featured = featured;
    }

    return update;
}
