import { describe, expect, test } from 'vitest';
import { HttpError } from './http';
import { parseCreateSkill, parseUpdateSkill } from './validation';

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
