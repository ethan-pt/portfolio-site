import { describe, expect, test } from 'vitest';
import { getSkillIcon, searchSkillIcons } from './skill-icons';

describe('skill icon lookup', () => {
    test('resolves a saved Simple Icons slug to render metadata', () => {
        expect(getSkillIcon('react')).toMatchObject({ slug: 'react', title: 'React' });
        expect(getSkillIcon(null)).toBeNull();
    });

    test('searches exact names and local aliases', () => {
        expect(searchSkillIcons('React')[0]).toMatchObject({ slug: 'react', title: 'React' });
        expect(searchSkillIcons('Cloudflare Workers')[0]).toMatchObject({ slug: 'cloudflareworkers' });
        expect(searchSkillIcons('D1')[0]).toMatchObject({ slug: 'cloudflare' });
    });

    test('returns no candidates for blank or unknown names', () => {
        expect(searchSkillIcons('')).toEqual([]);
        expect(searchSkillIcons('zzzzzz-not-a-real-skill')).toEqual([]);
    });
});
