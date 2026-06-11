import type { Project, ProjectImage, Skill } from '@/types/db';
import { HttpError } from './http';

export type ProjectCreateInput = Omit<Project, 'id' | 'created_at'>;
export type ProjectUpdateInput = Partial<Omit<Project, 'id' | 'created_at'>>;
export type ProjectImageInput = Pick<ProjectImage, 'image_url' | 'image_key' | 'is_thumbnail' | 'order_index'>;
export type SkillCreateInput = Omit<Skill, 'id' | 'created_at'>;
export type SkillUpdateInput = Partial<Omit<Skill, 'id' | 'created_at'>>;

const allowedProjectFields = new Set([
    'title',
    'description',
    'summary_description',
    'full_description',
    'image_url',
    'image_key',
    'images',
    'link',
    'github_url',
    'live_url',
    'featured',
    'order_index',
    'category_ids',
]);

const allowedSkillFields = new Set(['name', 'featured', 'category_ids']);
const allowedCategoryFields = new Set(['name']);

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

function optionalNullableIntegerField(body: Record<string, unknown>, key: string): number | null | undefined {
    if (!(key in body)) {
        return undefined;
    }

    const value = body[key];

    if (value === null) {
        return null;
    }

    if (!Number.isInteger(value)) {
        throw new HttpError(400, `Invalid ${key}`);
    }

    return value as number;
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

function optionalUrl(body: Record<string, unknown>, key: string): string | null | undefined {
    const value = optionalNullableStringField(body, key);
    if (value !== undefined && value !== null) {
        validateUrl(value, key);
    }
    return value;
}

export function parseProjectImages(value: unknown): ProjectImageInput[] | null {
    if (value === undefined) {
        return null;
    }

    if (!Array.isArray(value)) {
        throw new HttpError(400, 'Invalid images');
    }

    let thumbnailCount = 0;
    const images = value.map((rawImage, index) => {
        if (typeof rawImage !== 'object' || rawImage === null || Array.isArray(rawImage)) {
            throw new HttpError(400, 'Invalid images');
        }

        const image = rawImage as Record<string, unknown>;
        const imageUrl = stringField(image, 'image_url');
        validateUrl(imageUrl, 'image_url');

        const imageKey = optionalNullableStringField(image, 'image_key') ?? null;
        const isThumbnail = 'is_thumbnail' in image ? booleanField(image, 'is_thumbnail') : index === 0;
        const orderIndex = optionalNullableIntegerField(image, 'order_index') ?? index;

        if (isThumbnail) {
            thumbnailCount += 1;
        }

        return {
            image_url: imageUrl,
            image_key: imageKey,
            is_thumbnail: isThumbnail,
            order_index: orderIndex,
        };
    });

    if (thumbnailCount > 1) {
        throw new HttpError(400, 'Only one project image can be the thumbnail');
    }

    if (images.length > 0 && thumbnailCount === 0) {
        images[0] = { ...images[0], is_thumbnail: true };
    }

    return images;
}

export function idFromBody(body: Record<string, unknown>, label: string): number {
    const id = body.id;

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, `Missing ${label} ID`);
    }

    return id;
}

export function categoryIdsFromBody(body: Record<string, unknown>, required: boolean): number[] | null {
    if (!('category_ids' in body)) {
        if (required) {
            throw new HttpError(400, 'At least one category is required');
        }
        return null;
    }

    const categoryIds = body.category_ids;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0 || categoryIds.some((id) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0)) {
        throw new HttpError(400, 'Invalid category_ids');
    }

    return [...new Set(categoryIds)];
}

export function parseCategoryName(body: Record<string, unknown>): string {
    validateNoUnknownFields(body, allowedCategoryFields);
    return stringField(body, 'name');
}

export function parseCreateProject(body: Record<string, unknown>): ProjectCreateInput {
    validateNoUnknownFields(body, allowedProjectFields);

    const imageUrl = optionalUrl(body, 'image_url') ?? null;
    const imageKey = optionalNullableStringField(body, 'image_key') ?? null;
    const link = stringField(body, 'github_url' in body ? 'github_url' : 'link');
    const liveUrl = optionalUrl(body, 'live_url') ?? null;
    const description = stringField(body, 'description');
    const summaryDescription = 'summary_description' in body ? stringField(body, 'summary_description') : description;
    const fullDescription = 'full_description' in body ? stringField(body, 'full_description') : description;

    validateUrl(link, 'link');

    return {
        title: stringField(body, 'title'),
        description,
        summary_description: summaryDescription,
        full_description: fullDescription,
        image_url: imageUrl,
        image_key: imageKey,
        link,
        live_url: liveUrl,
        category: '',
        featured: booleanField(body, 'featured'),
        order_index: optionalNullableIntegerField(body, 'order_index') ?? null,
    };
}

export function parseUpdateProject(body: Record<string, unknown>): ProjectUpdateInput {
    validateNoUnknownFields(body, allowedProjectFields);

    const update: ProjectUpdateInput = {};

    for (const key of ['title', 'description', 'summary_description', 'full_description'] as const) {
        if (key in body) {
            update[key] = stringField(body, key);
        }
    }

    if ('link' in body || 'github_url' in body) {
        update.link = stringField(body, 'github_url' in body ? 'github_url' : 'link');
        validateUrl(update.link, 'link');
    }

    const liveUrl = optionalUrl(body, 'live_url');
    if (liveUrl !== undefined) {
        update.live_url = liveUrl;
    }

    const imageUrl = optionalUrl(body, 'image_url');
    if (imageUrl !== undefined) {
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
        category: '',
        featured: booleanField(body, 'featured'),
    };
}

export function parseUpdateSkill(body: Record<string, unknown>): SkillUpdateInput {
    validateNoUnknownFields(body, allowedSkillFields);

    const update: SkillUpdateInput = {};

    if ('name' in body) {
        update.name = stringField(body, 'name');
    }

    const featured = optionalBooleanField(body, 'featured');
    if (featured !== undefined) {
        update.featured = featured;
    }

    return update;
}
