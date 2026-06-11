import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ProjectsSection } from "./projects-section";
import type { ProjectDto } from "@/types/api";

const frontend = { id: 10, name: "Frontend" };
const backend = { id: 11, name: "Backend" };
const react = { id: 20, name: "React", categories: [frontend], featured: true };
const typescript = { id: 21, name: "TypeScript", categories: [frontend], featured: false };
const d1 = { id: 22, name: "D1", categories: [backend], featured: false };

const projects: ProjectDto[] = [
  {
    id: 1,
    title: "Dashboard",
    description: "A dashboard",
    image_url: null,
    link: "#",
    categories: [frontend],
    featured: true,
    order_index: 1,
    skills: [react, typescript],
  },
  {
    id: 2,
    title: "Worker API",
    description: "An API",
    image_url: null,
    link: "#",
    categories: [backend],
    featured: false,
    order_index: null,
    skills: [typescript, d1],
  },
  {
    id: 3,
    title: "Full Stack Tool",
    description: "A tool",
    image_url: null,
    link: "#",
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
  test("requires every selected skill and project category", () => {
    render(<ProjectsSection projects={projects} />);

    fireEvent.click(screen.getByLabelText("React"));
    fireEvent.click(screen.getByLabelText("D1"));
    fireEvent.click(screen.getByLabelText("Backend"));

    expect(projectHeadings()).toEqual(["Full Stack Tool"]);
    expect(screen.queryByRole("heading", { level: 3, name: "Dashboard" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 3, name: "Worker API" })).toBeNull();
  });

  test("resets project filters without changing the original project order", () => {
    render(<ProjectsSection projects={projects} />);

    fireEvent.click(screen.getByLabelText("D1"));
    expect(projectHeadings()).toEqual(["Worker API", "Full Stack Tool"]);

    fireEvent.click(screen.getByRole("button", { name: "Reset project filters" }));

    expect(projectHeadings()).toEqual(["Dashboard", "Worker API", "Full Stack Tool"]);
    expect(screen.queryByRole("button", { name: "Reset project filters" })).toBeNull();
  });
});
