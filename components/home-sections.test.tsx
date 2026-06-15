import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { HomeSections } from "./home-sections";
import type { ProjectDto, SkillDto } from "@/types/api";

const frontend = { id: 10, name: "Frontend" };
const backend = { id: 11, name: "Backend" };
const react: SkillDto = { id: 20, name: "React", icon_url: null, categories: [frontend], featured: false };
const d1: SkillDto = { id: 21, name: "D1", icon_url: null, categories: [backend], featured: true };

const projects: ProjectDto[] = [
  {
    id: 1,
    title: "Dashboard",
    description: "A dashboard",
    summary_description: "A dashboard",
    full_description: "A dashboard",
    image_url: null,
    thumbnail_image: null,
    images: [],
    link: "#",
    github_url: "#",
    live_url: null,
    categories: [frontend],
    featured: true,
    order_index: 1,
    skills: [react],
  },
  {
    id: 2,
    title: "Worker API",
    description: "An API",
    summary_description: "An API",
    full_description: "An API",
    image_url: null,
    thumbnail_image: null,
    images: [],
    link: "#",
    github_url: "#",
    live_url: null,
    categories: [backend],
    featured: false,
    order_index: null,
    skills: [d1],
  },
];

const references = {
  20: { count: 1, titles: ["Dashboard"] },
  21: { count: 1, titles: ["Worker API"] },
};

afterEach(() => cleanup());

describe("HomeSections", () => {
  test("clicking a skill project count filters the projects section to that skill", () => {
    render(<HomeSections projects={projects} skills={[react, d1]} skillProjectReferences={references} />);

    expect(screen.getByRole("heading", { level: 3, name: "Dashboard" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 3, name: "Worker API" })).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: "1 project" }));

    expect(screen.getByRole("heading", { level: 3, name: "Worker API" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 3, name: "Dashboard" })).toBeNull();
  });
});
