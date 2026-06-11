"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminProjectDto, AdminUserDto, CategoryDto, SkillDto } from '@/types/api';

type ApiErrorBody = { error?: string; message?: string };
type ImageMode = 'unchanged' | 'upload' | 'external' | 'clear';

type ProjectForm = {
    id: number | null;
    title: string;
    description: string;
    selectedCategoryIds: number[];
    link: string;
    featured: boolean;
    selectedSkillIds: number[];
    imageMode: ImageMode;
    imageUrl: string;
    imageKey: string | null;
};

type SkillForm = {
    id: number | null;
    name: string;
    selectedCategoryIds: number[];
    featured: boolean;
};

type CategoryForm = {
    id: number | null;
    name: string;
};

type UploadState = {
    status: 'idle' | 'signing' | 'uploading' | 'finalizing' | 'complete' | 'error';
    message: string;
    progress: number;
};

const emptyProjectForm: ProjectForm = {
    id: null,
    title: '',
    description: '',
    selectedCategoryIds: [],
    link: '',
    featured: false,
    selectedSkillIds: [],
    imageMode: 'external',
    imageUrl: '',
    imageKey: null,
};

const emptySkillForm: SkillForm = {
    id: null,
    name: '',
    selectedCategoryIds: [],
    featured: false,
};

const emptyCategoryForm: CategoryForm = {
    id: null,
    name: '',
};

const inputClass = 'w-full rounded-md border border-[#B4A5A5]/25 bg-[#1f1f23] px-3 py-2 text-sm text-white outline-none transition focus:border-[#B4A5A5]/70';
const buttonClass = 'rounded-md border border-[#B4A5A5]/30 px-3 py-2 text-sm font-semibold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/10 disabled:cursor-not-allowed disabled:opacity-50';
const dangerButtonClass = 'rounded-md border border-red-300/35 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-200/75 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50';
const panelClass = 'border border-[#B4A5A5]/18 bg-[#1a1a1d]';

function categoryNames(categories: CategoryDto[]): string {
    return categories.map((category) => category.name).join(', ') || 'None';
}

function toggleId(ids: number[], id: number, checked: boolean): number[] {
    return checked ? [...ids, id] : ids.filter((currentId) => currentId !== id);
}

function projectToForm(project: AdminProjectDto): ProjectForm {
    return {
        id: project.id,
        title: project.title,
        description: project.description,
        selectedCategoryIds: project.categories.map((category) => category.id),
        link: project.link,
        featured: project.featured,
        selectedSkillIds: project.skills.map((skill) => skill.id),
        imageMode: 'unchanged',
        imageUrl: project.image_url ?? '',
        imageKey: project.image_key,
    };
}

function skillToForm(skill: SkillDto): SkillForm {
    return {
        id: skill.id,
        name: skill.name,
        selectedCategoryIds: skill.categories.map((category) => category.id),
        featured: skill.featured,
    };
}

function categoryToForm(category: CategoryDto): CategoryForm {
    return { id: category.id, name: category.name };
}

function isValidHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function sameOrder(left: number[], right: number[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index]);
}

function moveId(ids: number[], fromIndex: number, toIndex: number): number[] {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) {
        return ids;
    }

    const nextIds = [...ids];
    const [movedId] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, movedId);
    return nextIds;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
    try {
        const body = await response.json() as ApiErrorBody;
        return body.error ?? body.message ?? fallback;
    } catch {
        return fallback;
    }
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        throw new Error(await readApiError(response, 'Request failed'));
    }

    return response.json() as Promise<T>;
}

function selectedProjectImage(projects: AdminProjectDto[], form: ProjectForm): string | null {
    if (form.imageMode === 'clear') {
        return null;
    }

    if (form.imageMode === 'external' || form.imageMode === 'upload') {
        return form.imageUrl.trim() || null;
    }

    return projects.find((project) => project.id === form.id)?.image_url ?? null;
}

export function AdminDashboard({ initialUser }: { initialUser: AdminUserDto }) {
    const [user, setUser] = useState<AdminUserDto>(initialUser);
    const [projects, setProjects] = useState<AdminProjectDto[]>([]);
    const [skills, setSkills] = useState<SkillDto[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
    const [skillForm, setSkillForm] = useState<SkillForm>(emptySkillForm);
    const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
    const [featuredOrderIds, setFeaturedOrderIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingProject, setSavingProject] = useState(false);
    const [savingSkill, setSavingSkill] = useState(false);
    const [savingCategory, setSavingCategory] = useState(false);
    const [savingOrder, setSavingOrder] = useState(false);
    const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
    const [deletingSkillId, setDeletingSkillId] = useState<number | null>(null);
    const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
    const [draggingProjectId, setDraggingProjectId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [projectErrors, setProjectErrors] = useState<Record<string, string>>({});
    const [skillErrors, setSkillErrors] = useState<Record<string, string>>({});
    const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({});
    const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', message: '', progress: 0 });
    const projectEditorRef = useRef<HTMLDivElement>(null);
    const skillEditorRef = useRef<HTMLDivElement>(null);
    const categoryEditorRef = useRef<HTMLDivElement>(null);

    const skillById = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
    const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
    const serverFeaturedIds = useMemo(() => projects.filter((project) => project.featured).map((project) => project.id), [projects]);
    const featuredOrderDirty = useMemo(() => !sameOrder(featuredOrderIds, serverFeaturedIds), [featuredOrderIds, serverFeaturedIds]);
    const featuredOrderProjects = useMemo(() => featuredOrderIds.map((id) => projectById.get(id)).filter((project): project is AdminProjectDto => Boolean(project)), [featuredOrderIds, projectById]);
    const projectImage = selectedProjectImage(projects, projectForm);
    const projectBusy = savingProject || savingOrder || deletingProjectId !== null;
    const uploadBusy = uploadState.status === 'signing' || uploadState.status === 'uploading' || uploadState.status === 'finalizing';

    async function refreshData() {
        setError(null);
        const [nextProjects, nextSkills, nextCategories] = await Promise.all([
            jsonRequest<AdminProjectDto[]>('/api/admin/projects'),
            jsonRequest<SkillDto[]>('/api/admin/skills'),
            jsonRequest<CategoryDto[]>('/api/admin/categories'),
        ]);
        setProjects(nextProjects);
        setSkills(nextSkills);
        setCategories(nextCategories);
        setFeaturedOrderIds(nextProjects.filter((project) => project.featured).map((project) => project.id));
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const me = await jsonRequest<AdminUserDto | { authenticated: false }>('/api/auth/me');
                if (!cancelled && me.authenticated) {
                    setUser(me);
                }
                await refreshData();
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    function validateProject(): Record<string, string> {
        const errors: Record<string, string> = {};

        if (!projectForm.title.trim()) errors.title = 'Title is required';
        if (!projectForm.description.trim()) errors.description = 'Description is required';
        if (projectForm.selectedCategoryIds.length === 0) errors.categories = 'At least one category is required';
        if (!isValidHttpUrl(projectForm.link.trim())) errors.link = 'Use a valid http or https URL';
        if (projectForm.imageMode === 'external' && projectForm.imageUrl.trim() && !isValidHttpUrl(projectForm.imageUrl.trim())) {
            errors.imageUrl = 'Use a valid http or https image URL';
        }
        if (projectForm.imageMode === 'upload' && !projectForm.imageKey) {
            errors.imageUrl = 'Upload an image before saving';
        }

        return errors;
    }

    function validateSkill(): Record<string, string> {
        const errors: Record<string, string> = {};
        if (!skillForm.name.trim()) errors.name = 'Name is required';
        if (skillForm.selectedCategoryIds.length === 0) errors.categories = 'At least one category is required';
        return errors;
    }

    function validateCategory(): Record<string, string> {
        const errors: Record<string, string> = {};
        if (!categoryForm.name.trim()) errors.name = 'Name is required';
        return errors;
    }

    function focusProjectEditor() {
        window.requestAnimationFrame(() => projectEditorRef.current?.focus());
    }

    function focusSkillEditor() {
        window.requestAnimationFrame(() => skillEditorRef.current?.focus());
    }

    function focusCategoryEditor() {
        window.requestAnimationFrame(() => categoryEditorRef.current?.focus());
    }

    function moveFeaturedProject(projectId: number, direction: -1 | 1) {
        setFeaturedOrderIds((currentIds) => {
            const fromIndex = currentIds.indexOf(projectId);
            return moveId(currentIds, fromIndex, fromIndex + direction);
        });
    }

    function handleFeaturedDrop(targetProjectId: number) {
        if (draggingProjectId === null || draggingProjectId === targetProjectId) {
            setDraggingProjectId(null);
            return;
        }

        setFeaturedOrderIds((currentIds) => moveId(currentIds, currentIds.indexOf(draggingProjectId), currentIds.indexOf(targetProjectId)));
        setDraggingProjectId(null);
    }

    async function saveFeaturedOrder() {
        setSavingOrder(true);
        setError(null);
        try {
            await jsonRequest('/api/admin/projects/reorder', {
                method: 'PATCH',
                body: JSON.stringify({ project_ids: featuredOrderIds }),
            });
            await refreshData();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save project order');
        } finally {
            setSavingOrder(false);
        }
    }

    async function uploadImage(file: File) {
        setProjectErrors({});
        setUploadState({ status: 'signing', message: 'Requesting upload URL', progress: 15 });

        try {
            const signed = await jsonRequest<{ uploadUrl: string; key: string; publicUrl: string; headers: Record<string, string> }>('/api/admin/uploads/sign', {
                method: 'POST',
                body: JSON.stringify({ contentType: file.type, size: file.size }),
            });

            setUploadState({ status: 'uploading', message: 'Uploading image', progress: 50 });
            const uploadResponse = await fetch(signed.uploadUrl, {
                method: 'PUT',
                headers: signed.headers,
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error('R2 upload failed. Check bucket CORS for this admin origin.');
            }

            setUploadState({ status: 'finalizing', message: 'Finalizing upload', progress: 85 });
            const finalized = await jsonRequest<{ key: string; publicUrl: string }>('/api/admin/uploads/finalize', {
                method: 'POST',
                body: JSON.stringify({ key: signed.key }),
            });

            setProjectForm((current) => ({
                ...current,
                imageMode: 'upload',
                imageKey: finalized.key,
                imageUrl: finalized.publicUrl,
            }));
            setUploadState({ status: 'complete', message: 'Upload ready to save', progress: 100 });
        } catch (uploadError) {
            setUploadState({
                status: 'error',
                message: uploadError instanceof Error ? uploadError.message : 'Image upload failed',
                progress: 0,
            });
        }
    }

    async function saveProject() {
        const validation = validateProject();
        setProjectErrors(validation);
        if (Object.keys(validation).length > 0) return;

        const isEditing = projectForm.id !== null;
        const payload: Record<string, unknown> = {
            title: projectForm.title.trim(),
            description: projectForm.description.trim(),
            category_ids: projectForm.selectedCategoryIds,
            link: projectForm.link.trim(),
            featured: projectForm.featured,
            skill_ids: projectForm.selectedSkillIds,
        };

        if (isEditing) {
            payload.id = projectForm.id;
        }

        if (!isEditing || projectForm.imageMode !== 'unchanged') {
            if (projectForm.imageMode === 'upload') {
                payload.image_key = projectForm.imageKey;
                payload.image_url = projectForm.imageUrl.trim();
            } else if (projectForm.imageMode === 'external') {
                payload.image_key = null;
                payload.image_url = projectForm.imageUrl.trim() || null;
            } else if (projectForm.imageMode === 'clear') {
                payload.image_key = null;
                payload.image_url = null;
            }
        }

        setSavingProject(true);
        setError(null);
        try {
            await jsonRequest('/api/admin/projects', {
                method: isEditing ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });
            await refreshData();
            setProjectForm(emptyProjectForm);
            setUploadState({ status: 'idle', message: '', progress: 0 });
            focusProjectEditor();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save project');
        } finally {
            setSavingProject(false);
        }
    }

    async function deleteProjectRow(project: AdminProjectDto) {
        const confirmed = window.confirm(`Delete "${project.title}"? Any managed project image may also be removed.`);
        if (!confirmed) return;

        setDeletingProjectId(project.id);
        setError(null);
        try {
            await jsonRequest('/api/admin/projects', {
                method: 'DELETE',
                body: JSON.stringify({ id: project.id }),
            });
            await refreshData();
            if (projectForm.id === project.id) {
                setProjectForm(emptyProjectForm);
            }
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete project');
        } finally {
            setDeletingProjectId(null);
        }
    }

    async function saveSkill() {
        const validation = validateSkill();
        setSkillErrors(validation);
        if (Object.keys(validation).length > 0) return;

        const isEditing = skillForm.id !== null;
        setSavingSkill(true);
        setError(null);
        try {
            await jsonRequest('/api/admin/skills', {
                method: isEditing ? 'PATCH' : 'POST',
                body: JSON.stringify({
                    ...(isEditing ? { id: skillForm.id } : {}),
                    name: skillForm.name.trim(),
                    category_ids: skillForm.selectedCategoryIds,
                    featured: skillForm.featured,
                }),
            });
            await refreshData();
            setSkillForm(emptySkillForm);
            focusSkillEditor();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save skill');
        } finally {
            setSavingSkill(false);
        }
    }

    async function deleteSkillRow(skill: SkillDto) {
        const confirmed = window.confirm(`Delete "${skill.name}"? Project skill assignments may be affected.`);
        if (!confirmed) return;

        setDeletingSkillId(skill.id);
        setError(null);
        try {
            await jsonRequest('/api/admin/skills', {
                method: 'DELETE',
                body: JSON.stringify({ id: skill.id }),
            });
            await refreshData();
            if (skillForm.id === skill.id) {
                setSkillForm(emptySkillForm);
            }
            setProjectForm((current) => ({
                ...current,
                selectedSkillIds: current.selectedSkillIds.filter((id) => id !== skill.id),
            }));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete skill');
        } finally {
            setDeletingSkillId(null);
        }
    }

    async function saveCategory() {
        const validation = validateCategory();
        setCategoryErrors(validation);
        if (Object.keys(validation).length > 0) return;

        const isEditing = categoryForm.id !== null;
        setSavingCategory(true);
        setError(null);
        try {
            await jsonRequest('/api/admin/categories', {
                method: isEditing ? 'PATCH' : 'POST',
                body: JSON.stringify({
                    ...(isEditing ? { id: categoryForm.id } : {}),
                    name: categoryForm.name.trim(),
                }),
            });
            await refreshData();
            setCategoryForm(emptyCategoryForm);
            focusCategoryEditor();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save category');
        } finally {
            setSavingCategory(false);
        }
    }

    async function deleteCategoryRow(category: CategoryDto) {
        const confirmed = window.confirm(`Delete "${category.name}"? Categories still assigned to projects or skills cannot be deleted.`);
        if (!confirmed) return;

        setDeletingCategoryId(category.id);
        setError(null);
        try {
            await jsonRequest('/api/admin/categories', {
                method: 'DELETE',
                body: JSON.stringify({ id: category.id }),
            });
            await refreshData();
            if (categoryForm.id === category.id) {
                setCategoryForm(emptyCategoryForm);
            }
            setProjectForm((current) => ({ ...current, selectedCategoryIds: current.selectedCategoryIds.filter((id) => id !== category.id) }));
            setSkillForm((current) => ({ ...current, selectedCategoryIds: current.selectedCategoryIds.filter((id) => id !== category.id) }));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete category');
        } finally {
            setDeletingCategoryId(null);
        }
    }

    async function logout() {
        await jsonRequest('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
        window.location.href = '/';
    }

    return (
        <main className="min-h-screen bg-[#151515] text-[#f8f5f5]">
            <header className="border-b border-[#B4A5A5]/15 bg-[#151515]/95">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
                    <div>
                        <h1 className="text-xl font-semibold tracking-normal">Admin dashboard</h1>
                        <p className="mt-1 text-sm text-[#B4A5A5]">Signed in as {user.login}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link className={buttonClass} href="/">View site</Link>
                        <button className={buttonClass} type="button" onClick={logout}>Log out</button>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:px-6 xl:grid-cols-[1.2fr_0.8fr]">
                {error ? (
                    <div className="xl:col-span-2 rounded-md border border-red-300/35 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert">
                        {error}
                    </div>
                ) : null}

                <section className={`${panelClass} rounded-md xl:col-span-2`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#B4A5A5]/15 px-4 py-3">
                        <div>
                            <h2 className="text-base font-semibold">Featured order</h2>
                            <p className="mt-1 text-sm text-[#B4A5A5]">Drag rows or use move controls, then save the final order.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button className={buttonClass} type="button" disabled={!featuredOrderDirty || savingOrder || projectBusy} onClick={saveFeaturedOrder}>{savingOrder ? 'Saving order' : 'Save order'}</button>
                            <button className={buttonClass} type="button" disabled={!featuredOrderDirty || savingOrder} onClick={() => setFeaturedOrderIds(serverFeaturedIds)}>Reset order</button>
                        </div>
                    </div>
                    <div className="grid gap-2 p-4">
                        {loading ? <p className="text-sm text-[#B4A5A5]">Loading featured projects...</p> : featuredOrderProjects.length === 0 ? <p className="text-sm text-[#B4A5A5]">No featured projects to order.</p> : featuredOrderProjects.map((project, index) => (
                            <div
                                key={project.id}
                                className={`grid gap-3 rounded-md border px-3 py-3 text-sm md:grid-cols-[3rem_1fr_auto] md:items-center ${draggingProjectId === project.id ? 'border-[#B4A5A5]/80 bg-[#B4A5A5]/10' : 'border-[#B4A5A5]/15 bg-[#1f1f23]'}`}
                                draggable={!projectBusy}
                                onDragStart={(event) => { setDraggingProjectId(project.id); event.dataTransfer.effectAllowed = 'move'; }}
                                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
                                onDrop={() => handleFeaturedDrop(project.id)}
                                onDragEnd={() => setDraggingProjectId(null)}
                            >
                                <div className="font-mono text-[#B4A5A5]">#{index + 1}</div>
                                <div>
                                    <div className="font-semibold text-white">{project.title}</div>
                                    <div className="mt-1 text-[#B4A5A5]">{categoryNames(project.categories)}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button className={buttonClass} type="button" disabled={projectBusy || index === 0} onClick={() => moveFeaturedProject(project.id, -1)}>Up</button>
                                    <button className={buttonClass} type="button" disabled={projectBusy || index === featuredOrderProjects.length - 1} onClick={() => moveFeaturedProject(project.id, 1)}>Down</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={`${panelClass} rounded-md`}>
                    <div className="flex items-center justify-between border-b border-[#B4A5A5]/15 px-4 py-3">
                        <h2 className="text-base font-semibold">Projects</h2>
                        <button className={buttonClass} type="button" onClick={() => { setProjectForm(emptyProjectForm); setProjectErrors({}); focusProjectEditor(); }}>New project</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="text-xs uppercase text-[#B4A5A5]">
                                <tr className="border-b border-[#B4A5A5]/15">
                                    <th className="px-4 py-3 font-semibold">Title</th>
                                    <th className="px-4 py-3 font-semibold">Categories</th>
                                    <th className="px-4 py-3 font-semibold">Order</th>
                                    <th className="px-4 py-3 font-semibold">Skills</th>
                                    <th className="px-4 py-3 font-semibold">Image</th>
                                    <th className="px-4 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td className="px-4 py-8 text-[#B4A5A5]" colSpan={6}>Loading projects...</td></tr>
                                ) : projects.length === 0 ? (
                                    <tr><td className="px-4 py-8 text-[#B4A5A5]" colSpan={6}>No projects yet.</td></tr>
                                ) : projects.map((project) => (
                                    <tr key={project.id} className="border-b border-[#B4A5A5]/10 align-top">
                                        <td className="px-4 py-3 font-medium text-white">{project.title}</td>
                                        <td className="px-4 py-3 text-[#d8d0d0]">{categoryNames(project.categories)}</td>
                                        <td className="px-4 py-3 text-[#d8d0d0]">{project.featured ? project.order_index : 'Unfeatured'}</td>
                                        <td className="px-4 py-3 text-[#d8d0d0]">{project.skills.map((skill) => skill.name).join(', ') || 'None'}</td>
                                        <td className="px-4 py-3 text-[#d8d0d0]">{project.image_key ? 'Managed' : project.image_url ? 'External' : 'None'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button className={buttonClass} type="button" onClick={() => { setProjectForm(projectToForm(project)); setProjectErrors({}); focusProjectEditor(); }}>Edit</button>
                                                <button className={dangerButtonClass} type="button" disabled={deletingProjectId === project.id || savingOrder} onClick={() => deleteProjectRow(project)}>
                                                    {deletingProjectId === project.id ? 'Deleting' : 'Delete'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section ref={projectEditorRef} tabIndex={-1} className={`${panelClass} rounded-md p-4 outline-none`}>
                    <h2 className="text-base font-semibold">{projectForm.id ? 'Edit project' : 'Create project'}</h2>
                    <div className="mt-4 grid gap-3">
                        <label className="grid gap-1 text-sm">Title<input className={inputClass} value={projectForm.title} onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })} /></label>
                        {projectErrors.title ? <p className="text-sm text-red-200">{projectErrors.title}</p> : null}
                        <label className="grid gap-1 text-sm">Description<textarea className={`${inputClass} min-h-24`} value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} /></label>
                        {projectErrors.description ? <p className="text-sm text-red-200">{projectErrors.description}</p> : null}
                        <div className="grid gap-3 md:grid-cols-2">
                            <fieldset className="grid gap-2 text-sm">
                                <legend>Categories</legend>
                                <div className="grid max-h-40 gap-2 overflow-auto rounded-md border border-[#B4A5A5]/15 p-2">
                                    {categories.length === 0 ? <p className="text-sm text-[#B4A5A5]">Create categories first.</p> : categories.map((category) => (
                                        <label key={category.id} className="flex items-center gap-2 text-sm text-[#eee8e8]">
                                            <input type="checkbox" checked={projectForm.selectedCategoryIds.includes(category.id)} onChange={(event) => setProjectForm({ ...projectForm, selectedCategoryIds: toggleId(projectForm.selectedCategoryIds, category.id, event.target.checked) })} />
                                            {category.name}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <label className="grid gap-1 text-sm">Project link<input className={inputClass} value={projectForm.link} onChange={(event) => setProjectForm({ ...projectForm, link: event.target.value })} /></label>
                        </div>
                        {projectErrors.categories ? <p className="text-sm text-red-200">{projectErrors.categories}</p> : null}
                        {projectErrors.link ? <p className="text-sm text-red-200">{projectErrors.link}</p> : null}
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={projectForm.featured} onChange={(event) => setProjectForm({ ...projectForm, featured: event.target.checked })} /> Featured</label>

                        <fieldset className="grid gap-2 border-t border-[#B4A5A5]/15 pt-3">
                            <legend className="text-sm font-semibold">Skills</legend>
                            <div className="grid max-h-40 gap-2 overflow-auto rounded-md border border-[#B4A5A5]/15 p-2 sm:grid-cols-2">
                                {skills.length === 0 ? <p className="text-sm text-[#B4A5A5]">No skills available.</p> : skills.map((skill) => (
                                    <label key={skill.id} className="flex items-center gap-2 text-sm text-[#eee8e8]">
                                        <input
                                            type="checkbox"
                                            checked={projectForm.selectedSkillIds.includes(skill.id)}
                                            onChange={(event) => setProjectForm({ ...projectForm, selectedSkillIds: toggleId(projectForm.selectedSkillIds, skill.id, event.target.checked) })}
                                        />
                                        {skill.name} <span className="text-[#B4A5A5]">{categoryNames(skill.categories)}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset className="grid gap-3 border-t border-[#B4A5A5]/15 pt-3">
                            <legend className="text-sm font-semibold">Image</legend>
                            <div className="flex flex-wrap gap-2">
                                {projectForm.id ? <button className={buttonClass} type="button" onClick={() => setProjectForm({ ...projectForm, imageMode: 'unchanged' })}>Keep</button> : null}
                                <button className={buttonClass} type="button" onClick={() => setProjectForm({ ...projectForm, imageMode: 'upload' })}>Upload</button>
                                <button className={buttonClass} type="button" onClick={() => setProjectForm({ ...projectForm, imageMode: 'external', imageKey: null })}>External URL</button>
                                <button className={buttonClass} type="button" onClick={() => setProjectForm({ ...projectForm, imageMode: 'clear', imageUrl: '', imageKey: null })}>Clear</button>
                            </div>
                            <p className="text-sm text-[#B4A5A5]">Mode: {projectForm.imageMode}</p>
                            {projectForm.imageMode === 'upload' ? <input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /> : null}
                            {projectForm.imageMode === 'external' ? <label className="grid gap-1 text-sm">Image URL<input className={inputClass} value={projectForm.imageUrl} onChange={(event) => setProjectForm({ ...projectForm, imageUrl: event.target.value, imageKey: null })} /></label> : null}
                            {uploadState.message ? <p className={uploadState.status === 'error' ? 'text-sm text-red-200' : 'text-sm text-[#B4A5A5]'}>{uploadState.message} {uploadState.progress ? `${uploadState.progress}%` : ''}</p> : null}
                            {projectErrors.imageUrl ? <p className="text-sm text-red-200">{projectErrors.imageUrl}</p> : null}
                            {projectImage ? (
                                // eslint-disable-next-line @next/next/no-img-element -- Admin image previews can be external or runtime R2 assets.
                                <img className="h-32 w-full rounded-md border border-[#B4A5A5]/15 object-cover" src={projectImage} alt="Project preview" />
                            ) : null}
                        </fieldset>

                        <div className="flex flex-wrap gap-2 border-t border-[#B4A5A5]/15 pt-3">
                            <button className={buttonClass} type="button" disabled={savingProject || savingOrder || uploadBusy} onClick={saveProject}>
                                {savingProject ? 'Saving' : 'Save project'}
                            </button>
                            <button className={buttonClass} type="button" onClick={() => { setProjectForm(emptyProjectForm); setProjectErrors({}); }}>Reset</button>
                        </div>
                    </div>
                </section>

                <section className={`${panelClass} rounded-md`}>
                    <div className="flex items-center justify-between border-b border-[#B4A5A5]/15 px-4 py-3">
                        <h2 className="text-base font-semibold">Skills</h2>
                        <button className={buttonClass} type="button" onClick={() => { setSkillForm(emptySkillForm); setSkillErrors({}); focusSkillEditor(); }}>New skill</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="text-xs uppercase text-[#B4A5A5]"><tr className="border-b border-[#B4A5A5]/15"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Categories</th><th className="px-4 py-3">Featured</th><th className="px-4 py-3">Actions</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td className="px-4 py-8 text-[#B4A5A5]" colSpan={4}>Loading skills...</td></tr> : skills.length === 0 ? <tr><td className="px-4 py-8 text-[#B4A5A5]" colSpan={4}>No skills yet.</td></tr> : skills.map((skill) => (
                                    <tr key={skill.id} className="border-b border-[#B4A5A5]/10">
                                        <td className="px-4 py-3 font-medium">{skill.name}</td>
                                        <td className="px-4 py-3 text-[#d8d0d0]">{categoryNames(skill.categories)}</td>
                                        <td className="px-4 py-3 text-[#d8d0d0]">{skill.featured ? 'Yes' : 'No'}</td>
                                        <td className="px-4 py-3"><div className="flex gap-2"><button className={buttonClass} type="button" onClick={() => { setSkillForm(skillToForm(skill)); setSkillErrors({}); focusSkillEditor(); }}>Edit</button><button className={dangerButtonClass} type="button" disabled={deletingSkillId === skill.id} onClick={() => deleteSkillRow(skill)}>{deletingSkillId === skill.id ? 'Deleting' : 'Delete'}</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section ref={skillEditorRef} tabIndex={-1} className={`${panelClass} rounded-md p-4 outline-none`}>
                    <h2 className="text-base font-semibold">{skillForm.id ? 'Edit skill' : 'Create skill'}</h2>
                    <div className="mt-4 grid gap-3">
                        <label className="grid gap-1 text-sm">Name<input className={inputClass} value={skillForm.name} onChange={(event) => setSkillForm({ ...skillForm, name: event.target.value })} /></label>
                        {skillErrors.name ? <p className="text-sm text-red-200">{skillErrors.name}</p> : null}
                        <fieldset className="grid gap-2 text-sm">
                            <legend>Categories</legend>
                            <div className="grid max-h-40 gap-2 overflow-auto rounded-md border border-[#B4A5A5]/15 p-2 sm:grid-cols-2">
                                {categories.length === 0 ? <p className="text-sm text-[#B4A5A5]">Create categories first.</p> : categories.map((category) => (
                                    <label key={category.id} className="flex items-center gap-2 text-sm text-[#eee8e8]">
                                        <input type="checkbox" checked={skillForm.selectedCategoryIds.includes(category.id)} onChange={(event) => setSkillForm({ ...skillForm, selectedCategoryIds: toggleId(skillForm.selectedCategoryIds, category.id, event.target.checked) })} />
                                        {category.name}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        {skillErrors.categories ? <p className="text-sm text-red-200">{skillErrors.categories}</p> : null}
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skillForm.featured} onChange={(event) => setSkillForm({ ...skillForm, featured: event.target.checked })} /> Featured</label>
                        <div className="flex flex-wrap gap-2 border-t border-[#B4A5A5]/15 pt-3">
                            <button className={buttonClass} type="button" disabled={savingSkill} onClick={saveSkill}>{savingSkill ? 'Saving' : 'Save skill'}</button>
                            <button className={buttonClass} type="button" onClick={() => { setSkillForm(emptySkillForm); setSkillErrors({}); }}>Reset</button>
                        </div>
                    </div>
                </section>

                <section className={`${panelClass} rounded-md`}>
                    <div className="flex items-center justify-between border-b border-[#B4A5A5]/15 px-4 py-3">
                        <h2 className="text-base font-semibold">Categories</h2>
                        <button className={buttonClass} type="button" onClick={() => { setCategoryForm(emptyCategoryForm); setCategoryErrors({}); focusCategoryEditor(); }}>New category</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[420px] text-left text-sm">
                            <thead className="text-xs uppercase text-[#B4A5A5]"><tr className="border-b border-[#B4A5A5]/15"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Actions</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td className="px-4 py-8 text-[#B4A5A5]" colSpan={2}>Loading categories...</td></tr> : categories.length === 0 ? <tr><td className="px-4 py-8 text-[#B4A5A5]" colSpan={2}>No categories yet.</td></tr> : categories.map((category) => (
                                    <tr key={category.id} className="border-b border-[#B4A5A5]/10">
                                        <td className="px-4 py-3 font-medium">{category.name}</td>
                                        <td className="px-4 py-3"><div className="flex gap-2"><button className={buttonClass} type="button" onClick={() => { setCategoryForm(categoryToForm(category)); setCategoryErrors({}); focusCategoryEditor(); }}>Edit</button><button className={dangerButtonClass} type="button" disabled={deletingCategoryId === category.id} onClick={() => deleteCategoryRow(category)}>{deletingCategoryId === category.id ? 'Deleting' : 'Delete'}</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section ref={categoryEditorRef} tabIndex={-1} className={`${panelClass} rounded-md p-4 outline-none`}>
                    <h2 className="text-base font-semibold">{categoryForm.id ? 'Edit category' : 'Create category'}</h2>
                    <div className="mt-4 grid gap-3">
                        <label className="grid gap-1 text-sm">Name<input className={inputClass} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
                        {categoryErrors.name ? <p className="text-sm text-red-200">{categoryErrors.name}</p> : null}
                        <div className="flex flex-wrap gap-2 border-t border-[#B4A5A5]/15 pt-3">
                            <button className={buttonClass} type="button" disabled={savingCategory} onClick={saveCategory}>{savingCategory ? 'Saving' : 'Save category'}</button>
                            <button className={buttonClass} type="button" onClick={() => { setCategoryForm(emptyCategoryForm); setCategoryErrors({}); }}>Reset</button>
                        </div>
                    </div>
                </section>

                <aside className="xl:col-span-2 rounded-md border border-[#B4A5A5]/15 px-4 py-3 text-sm text-[#B4A5A5]">
                    Required config: AUTH_COOKIE_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_ADMIN_ID or GITHUB_ADMIN_LOGIN, SITE_ORIGIN, R2 signing variables, R2_PUBLIC_BASE_URL, and R2 CORS for this admin origin. For local device testing, keep SITE_ORIGIN, secure cookies, GitHub callback URLs, and allowedDevOrigins aligned with the preview origin.
                    {projectForm.selectedSkillIds.length > 0 ? <span className="block pt-2">Selected skills: {projectForm.selectedSkillIds.map((id) => skillById.get(id)?.name ?? id).join(', ')}</span> : null}
                    {projectForm.selectedCategoryIds.length > 0 ? <span className="block pt-2">Selected project categories: {categories.filter((category) => projectForm.selectedCategoryIds.includes(category.id)).map((category) => category.name).join(', ')}</span> : null}
                </aside>
            </div>
        </main>
    );
}
