import { describe, vi, beforeEach, Mock, test, expect } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Project } from '@/types/db';
import { GET, POST, PATCH, DELETE } from './route';


vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

describe('Projects API', () => {
    const mockDb = {
        prepare: vi.fn().mockReturnValue({
            all: vi.fn(),
            run: vi.fn(),
            get: vi.fn(),
        }),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        (getCloudflareContext as Mock).mockReturnValue({
            env: { DB: mockDb },
        });
    });

    describe('GET method', () => {
        const mockProjects: Partial<Project>[] = [
            // --- FEATURED PROJECTS (Sorted by Category DESC, then Order ASC) ---
            
            // 1. First because: Featured=true, Category='Web' (High), Order=1
            {
                id: 1,
                title: "E-Commerce Dashboard",
                category: "Web Development",
                featured: true,
                order_index: 1, // Global Unique Constraint
                created_at: "2023-01-01T00:00:00Z"
            },
            // 2. Second because: Featured=true, Category='Web' (High), Order=3
            // Note: Even though Order is 3, it beats the 'Mobile' project below because Category comes first in sort.
            {
                id: 2,
                title: "Portfolio V1",
                category: "Web Development",
                featured: true,
                order_index: 3,
                created_at: "2023-02-01T00:00:00Z"
            },
            // 3. Third because: Featured=true, Category='Mobile' (Low), Order=2
            {
                id: 3,
                title: "Fitness Tracker",
                category: "Mobile App",
                featured: true,
                order_index: 2,
                created_at: "2023-03-01T00:00:00Z"
            },
        
            // --- NON-FEATURED PROJECTS (Sorted by Category DESC, then CreatedAt DESC) ---
        
            // 4. Fourth because: Featured=false, Category='Web', Created=Today (Newest)
            {
                id: 4,
                title: "Weather Widget",
                category: "Web Development",
                featured: false,
                order_index: null, // Must be null if featured is false
                created_at: "2024-01-01T12:00:00Z"
            },
            // 5. Fifth because: Featured=false, Category='Web', Created=Yesterday (Older)
            {
                id: 5,
                title: "Old Blog Template",
                category: "Web Development",
                featured: false,
                order_index: null,
                created_at: "2023-12-31T12:00:00Z"
            },
            // 6. Sixth because: Featured=false, Category='Mobile' (Low)
            {
                id: 6,
                title: "Calculator iOS",
                category: "Mobile App",
                featured: false,
                order_index: null,
                created_at: "2024-01-01T10:00:00Z"
            }
        ];
        
        test('returns all projects and status 200 on success', async () => {
            mockDb.prepare().all.mockResolvedValue({ results: mockProjects });
                
            const response = await GET(new Request('http://localhost/api/projects'));
            const data = await response.json();
    
            expect(response.status).toBe(200);
            expect(data).toEqual(mockProjects);
        });

        test('returns empty array and status 200 when no projects exist', async () => {
            mockDb.prepare().all.mockResolvedValue({ results: [] });

            const response = await GET(new Request('http://localhost/api/projects'));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual([]);
        });

        test('tests projects ordering logic on successful GET', async () => {
            mockDb.prepare().all.mockResolvedValue({ results: mockProjects });

            const response = await GET(new Request('http://localhost/api/projects'));
            const data = await response.json();
            const expectedOrder = [
                // Featured projects first, sorted by category DESC, then order_index ASC
                mockProjects[0], // E-Commerce Dashboard (Web, Order 1)
                mockProjects[1], // Portfolio V1 (Web, Order 3)
                mockProjects[2], // Fitness Tracker (Mobile, Order 2)
                // Non-featured projects next, sorted by category DESC, then created_at DESC
                mockProjects[3], // Weather Widget (Web, Created Today)
                mockProjects[4], // Old Blog Template (Web, Created Yesterday)
                mockProjects[5], // Calculator iOS (Mobile, Created Today)
            ];
            
            expect(response.status).toBe(200);
            expect(data).toEqual(expectedOrder);
        });

        test('returns status 500 on database error', async () => {
            mockDb.prepare().all.mockRejectedValue(new Error('Database error'));

            const response = await GET(new Request('http://localhost/api/projects'));

            expect(response.status).toBe(500);
        });
    });

    describe('POST method', () => {
        test('creates a new project and returns it with status 201 on success', async () => {
            const newProjectData = {
                title: "New Portfolio",
                description: "A new portfolio project",
                image_url: "http://example.com/image.png",
                link: "http://example.com",
                category: "Web Development",
                featured: true,
                order_index: 1,
            };

            mockDb.prepare().run.mockResolvedValue({ lastRowId: 7 });

            const response = await POST(new Request('http://localhost/api/projects', {
                method: 'POST',
                body: JSON.stringify(newProjectData),
            }));
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data).toEqual({
                id: 7,
                ...newProjectData,
                created_at: expect.any(String),
            });
        });

        test('returns status 400 when required fields are missing', async () => {
            const response = await POST(new Request('http://localhost/api/projects', {
                method: 'POST',
                body: JSON.stringify({ title: "Incomplete Project" }), // Missing required fields
            }));

            expect(response.status).toBe(400);
        });

        test('returns status 400 when featured/order_index logic is violated', async () => {
            // Case 1: Featured=false but order_index is provided
            let response = await POST(new Request('http://localhost/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    title: "Invalid Project 1",
                    description: "This project has order_index but is not featured",
                    link: "http://example.com",
                    category: "Web Development",
                    featured: false,
                    order_index: 1, // Invalid
                }),
            }));
            expect(response.status).toBe(400);

            // Case 2: Featured=true but order_index is missing
            response = await POST(new Request('http://localhost/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    title: "Invalid Project 2",
                    description: "This project is featured but missing order_index",
                    link: "http://example.com",
                    category: "Web Development",
                    featured: true,
                    // order_index is missing
                }),
            }));
            expect(response.status).toBe(400);
        });

        test('returns status 500 on database error', async () => {
            mockDb.prepare().run.mockRejectedValue(new Error('Database error'));

            const response = await POST(new Request('http://localhost/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    title: "New Portfolio",
                    description: "A new portfolio project",
                    image_url: "http://example.com/image.png",
                    link: "http://example.com",
                    category: "Web Development",
                    featured: true,
                    order_index: 1,
                }),
            }));

            expect(response.status).toBe(500);
        });
    });

    describe('PATCH method', () => {
        const mockProject: Project = {
            id: 1,
            title: "E-Commerce Dashboard",
            description: "An e-commerce dashboard project",
            image_url: "http://example.com/image.png",
            link: "http://example.com",
            category: "Web Development",
            featured: true,
            order_index: 1,
            created_at: "2023-01-01T00:00:00Z"
        };

        test('updates an existing project and returns it with status 200 on success', async () => {
            const updatedData = {
                id: 1,
                title: "Updated E-Commerce Dashboard",
                description: "An updated e-commerce dashboard project",
                image_url: "http://example.com/updated-image.png",
                link: "http://example.com/updated",
                category: "Web Development",
                featured: true,
                order_index: 1,
            };

            mockDb.prepare().get.mockResolvedValue(mockProject);
            mockDb.prepare().run.mockResolvedValue({ changes: 4 });

            const response = await PATCH(new Request('http://localhost/api/projects', {
                method: 'PATCH',
                body: JSON.stringify(updatedData),
            }));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({ changes: 4 });
        });

        test('returns status 400 when project ID is missing', async () => {
            const response = await PATCH(new Request('http://localhost/api/projects', {
                method: 'PATCH',
                body: JSON.stringify({ title: "No ID Project" }), // Missing ID
            }));

            expect(response.status).toBe(400);
        });

        test('returns status 404 when project does not exist', async () => {
            mockDb.prepare().get.mockResolvedValue(undefined); // No project found

            const response = await PATCH(new Request('http://localhost/api/projects', {
                method: 'PATCH',
                body: JSON.stringify({ id: 999, title: "Nonexistent Project" }),
            }));

            expect(response.status).toBe(404);
        });

        test('returns status 400 when featured/order_index logic is violated', async () => {
            mockDb.prepare().get.mockResolvedValue(mockProject); // Existing project

            // Case 1: Featured=false but order_index is provided
            let response = await PATCH(new Request('http://localhost/api/projects', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: 1,
                    featured: false,
                    order_index: 1, // Invalid
                }),
            }));
            expect(response.status).toBe(400);

            // Case 2: Featured=true but order_index is missing
            response = await PATCH(new Request('http://localhost/api/projects', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: 1,
                    featured: true,
                    order_index: null, // Invalid
                }),
            }));
            expect(response.status).toBe(400);
        });

        test('returns status 500 on database error', async () => {
            mockDb.prepare().get.mockResolvedValue(mockProject); // Existing project
            mockDb.prepare().run.mockRejectedValue(new Error('Database error'));

            const response = await PATCH(new Request('http://localhost/api/projects', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: 1,
                    title: "Updated E-Commerce Dashboard",
                    description: "An updated e-commerce dashboard project",
                    image_url: "http://example.com/updated-image.png",
                    link: "http://example.com/updated",
                    category: "Web Development",
                    featured: true,
                    order_index: 1,
                }),
            }));

            expect(response.status).toBe(500);
        });
    });

    describe('DELETE method', () => {
        test('deletes an existing project and returns status 200 on success', async () => {
            mockDb.prepare().run.mockResolvedValue({ changes: 1 });

            const response = await DELETE(new Request('http://localhost/api/projects', {
                method: 'DELETE',
                body: JSON.stringify({ id: 1 }),
            }));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({ message: 'Project deleted successfully' });
        });

        test('returns status 400 when project ID is missing', async () => {
            const response = await DELETE(new Request('http://localhost/api/projects', {
                method: 'DELETE',
                body: JSON.stringify({}), // Missing ID
            }));

            expect(response.status).toBe(400);
        });

        test('returns status 404 when project does not exist', async () => {
            mockDb.prepare().run.mockResolvedValue({ changes: 0 }); // No project deleted

            const response = await DELETE(new Request('http://localhost/api/projects', {
                method: 'DELETE',
                body: JSON.stringify({ id: 999 }), // Nonexistent ID
            }));

            expect(response.status).toBe(404);
        });

        test('returns status 500 on database error', async () => {
            mockDb.prepare().run.mockRejectedValue(new Error('Database error'));

            const response = await DELETE(new Request('http://localhost/api/projects', {
                method: 'DELETE',
                body: JSON.stringify({ id: 1 }),
            }));

            expect(response.status).toBe(500);
        });
    });
});
