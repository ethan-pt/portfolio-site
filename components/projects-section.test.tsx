import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ProjectsSection } from "./projects-section";
import type { ProjectDto } from "@/types/api";

const frontend = { id: 10, name: "Frontend" };
const backend = { id: 11, name: "Backend" };
const react = { id: 20, name: "React", icon_url: null, categories: [frontend], featured: true };
const typescript = { id: 21, name: "TypeScript", icon_url: null, categories: [frontend], featured: false };
const d1 = { id: 22, name: "D1", icon_url: null, categories: [backend], featured: false };

const projects: ProjectDto[] = [
  {
    id: 1,
    title: "Dashboard",
    description: "A dashboard",
    summary_description: "A dashboard",
    full_description: "A dashboard with more implementation detail.",
    image_url: null,
    thumbnail_image: null,
    images: [],
    link: "#",
    github_url: "#",
    live_url: null,
    categories: [frontend, backend],
    featured: true,
    order_index: 1,
    skills: [react, typescript],
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
    skills: [typescript, d1],
  },
  {
    id: 3,
    title: "Full Stack Tool",
    description: "A tool",
    summary_description: "A tool",
    full_description: "A tool",
    image_url: null,
    thumbnail_image: null,
    images: [],
    link: "#",
    github_url: "#",
    live_url: null,
    categories: [frontend, backend],
    featured: false,
    order_index: null,
    skills: [react, typescript, d1],
  },
];

function projectHeadings() {
  return screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
}

afterEach(() => cleanup());

describe("ProjectsSection", () => {
  test("shows featured projects by default and toggles non-featured projects", () => {
    render(<ProjectsSection projects={projects} />);

    expect(projectHeadings()).toEqual(["Dashboard"]);
    expect(screen.getByText("A dashboard")).toBeTruthy();
    expect(screen.queryByText("A dashboard with more implementation detail.")).toBeNull();
    expect(screen.getByTestId("category-rail").getAttribute("data-layout")).toBe("compact");
    expect(screen.getByRole("button", { name: "Previous categories" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next categories" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous categories" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next categories" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.queryByText("A dashboard")).toBeNull();
    expect(screen.getByText("A dashboard with more implementation detail.")).toBeTruthy();
    expect(screen.getByTestId("category-rail").getAttribute("data-layout")).toBe("expanded");
    expect(screen.queryByRole("button", { name: "Previous categories" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next categories" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.getByText("A dashboard")).toBeTruthy();
    expect(screen.queryByText("A dashboard with more implementation detail.")).toBeNull();
    expect(screen.getByTestId("category-rail").getAttribute("data-layout")).toBe("compact");

    fireEvent.click(screen.getByRole("button", { name: "More projects" }));
    expect(projectHeadings()).toEqual(["Dashboard", "Worker API", "Full Stack Tool"]);

    fireEvent.click(screen.getByRole("button", { name: "Less projects" }));
    expect(projectHeadings()).toEqual(["Dashboard"]);
  });

  test("requires every selected skill and project category while including non-featured matches", () => {
    render(<ProjectsSection projects={projects} />);

    fireEvent.click(screen.getByLabelText("React"));
    fireEvent.click(screen.getByLabelText("D1"));
    fireEvent.click(screen.getByLabelText("Backend"));

    expect(projectHeadings()).toEqual(["Full Stack Tool"]);
    expect(screen.queryByRole("button", { name: "More projects" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 3, name: "Dashboard" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 3, name: "Worker API" })).toBeNull();
  });

  test("reset clears project filters and restores featured-only display", () => {
    render(<ProjectsSection projects={projects} />);

    fireEvent.click(screen.getByRole("button", { name: "More projects" }));
    fireEvent.click(screen.getByLabelText("D1"));
    expect(projectHeadings()).toEqual(["Worker API", "Full Stack Tool"]);

    fireEvent.click(screen.getByRole("button", { name: "Reset project filters" }));

    expect(projectHeadings()).toEqual(["Dashboard"]);
    expect(screen.queryByRole("button", { name: "Reset project filters" })).toBeNull();
    expect(screen.getByRole("button", { name: "More projects" })).toBeTruthy();
  });

  test("shows all projects by default when none are featured", () => {
    render(<ProjectsSection projects={projects.map((project) => ({ ...project, featured: false, order_index: null }))} />);

    expect(projectHeadings()).toEqual(["Dashboard", "Worker API", "Full Stack Tool"]);
    expect(screen.queryByRole("button", { name: "More projects" })).toBeNull();
  });
});
