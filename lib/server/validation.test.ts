import { describe, expect, test } from 'vitest';
import { HttpError } from './http';
import { parseCreateSkill, parseProjectImages, parseUpdateSkill } from './validation';

describe('skill validation', () => {
    test('accepts an http or https icon_url for skill creates and updates', () => {
        expect(parseCreateSkill({ name: 'React', icon_url: 'https://cdn.example.com/react.svg', featured: true })).toMatchObject({
            name: 'React',
            icon_url: 'https://cdn.example.com/react.svg',
            featured: true,
        });
        expect(parseUpdateSkill({ icon_url: 'http://cdn.example.com/react.svg' })).toEqual({ icon_url: 'http://cdn.example.com/react.svg' });
    });

    test('normalizes empty and null icon_url values to null', () => {
        expect(parseCreateSkill({ name: 'React', icon_url: '', featured: true }).icon_url).toBeNull();
        expect(parseUpdateSkill({ icon_url: null })).toEqual({ icon_url: null });
    });

    test('rejects invalid skill icon URLs', () => {
        expect(() => parseCreateSkill({ name: 'React', icon_url: 'javascript:alert(1)', featured: true })).toThrow(HttpError);
        expect(() => parseUpdateSkill({ icon_url: 'not a url' })).toThrow(HttpError);
    });
});


describe('project image validation', () => {
    test('marks the first image as thumbnail when none is specified', () => {
        expect(parseProjectImages([
            { image_url: 'https://cdn.example.com/one.png' },
            { image_url: 'https://cdn.example.com/two.png' },
        ])).toEqual([
            { image_url: 'https://cdn.example.com/one.png', image_key: null, is_thumbnail: true, order_index: 0 },
            { image_url: 'https://cdn.example.com/two.png', image_key: null, is_thumbnail: false, order_index: 1 },
        ]);
    });

    test('makes the first image thumbnail even when a later image is marked thumbnail', () => {
        expect(parseProjectImages([
            { image_url: 'https://cdn.example.com/one.png', is_thumbnail: false },
            { image_url: 'https://cdn.example.com/two.png', is_thumbnail: true },
            { image_url: 'https://cdn.example.com/three.png', is_thumbnail: true },
        ])?.map((image) => image.is_thumbnail)).toEqual([true, false, false]);
    });

    test('keeps later images from being thumbnails while preserving order indexes', () => {
        expect(parseProjectImages([
            { image_url: 'https://cdn.example.com/one.png', order_index: 4 },
            { image_url: 'https://cdn.example.com/two.png', image_key: 'projects/two.png', is_thumbnail: true, order_index: 8 },
        ])).toEqual([
            { image_url: 'https://cdn.example.com/one.png', image_key: null, is_thumbnail: true, order_index: 4 },
            { image_url: 'https://cdn.example.com/two.png', image_key: 'projects/two.png', is_thumbnail: false, order_index: 8 },
        ]);
    });
});
