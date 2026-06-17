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

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.queryByText("A dashboard")).toBeNull();
    expect(screen.getByText("A dashboard with more implementation detail.")).toBeTruthy();
    expect(screen.getByTestId("category-rail").getAttribute("data-layout")).toBe("expanded");

    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.getByText("A dashboard")).toBeTruthy();
    expect(screen.queryByText("A dashboard with more implementation detail.")).toBeNull();
    expect(screen.getByTestId("category-rail").getAttribute("data-layout")).toBe("compact");

    fireEvent.click(screen.getByRole("button", { name: "More projects" }));
    expect(projectHeadings()).toEqual(["Dashboard", "Worker API", "Full Stack Tool"]);

    fireEvent.click(screen.getByRole("button", { name: "Less projects" }));
    expect(projectHeadings()).toEqual(["Dashboard"]);
  });

  test("contains project images within a fixed media frame", () => {
    const { container } = render(<ProjectsSection projects={[{
      ...projects[0],
      thumbnail_image: { id: 100, image_url: "https://cdn.example.com/project.png", image_key: null, is_thumbnail: true, order_index: 0 },
      images: [{ id: 100, image_url: "https://cdn.example.com/project.png", image_key: null, is_thumbnail: true, order_index: 0 }],
    }]} />);

    const image = container.querySelector('[style*="project.png"]');
    expect(image).toBeTruthy();
    expect(image?.className).toContain("h-full");
    expect(image?.className).toContain("w-full");
    expect(image?.className).toContain("min-w-0");
    expect(image?.className).toContain("max-w-full");
    expect(image).toHaveProperty("style.backgroundPosition", "center center");
    expect(image).toHaveProperty("style.backgroundRepeat", "no-repeat");
    expect(image).toHaveProperty("style.backgroundSize", "contain");
    expect(image?.parentElement?.className).toContain("relative");
    expect(image?.parentElement?.className).toContain("w-full");
    expect(image?.parentElement?.className).toContain("min-w-0");
    expect(image?.parentElement?.className).toContain("max-w-full");
    expect(image?.parentElement?.className).toContain("flex");
    expect(image?.parentElement?.className).toContain("items-center");
    expect(image?.parentElement?.className).toContain("justify-center");
    expect(image?.parentElement?.className).toContain("self-start");
    expect(image?.parentElement?.className).toContain("overflow-hidden");
    expect(image?.parentElement?.className).toContain("h-40");
    expect(image?.parentElement?.className).toContain("min-h-40");
    expect(image?.parentElement?.className).toContain("md:h-auto");
    expect(image?.parentElement?.className).toContain("md:self-stretch");
    expect(image?.closest("article")?.className).toContain("w-full");
    expect(image?.closest("article")?.className).toContain("min-w-0");
    expect(image?.closest("article")?.className).toContain("max-w-full");
    expect(image?.closest("article")?.className).toContain("md:grid-cols-[14rem_1fr]");

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    const expandedImage = container.querySelector('[style*="project.png"]');
    expect(expandedImage?.parentElement?.className).toContain("self-stretch");
    expect(expandedImage?.parentElement?.className).toContain("h-full");
    expect(expandedImage?.parentElement?.className).toContain("min-h-64");
    expect(expandedImage?.parentElement?.className).not.toContain("self-start");
    expect(expandedImage?.parentElement?.className).not.toContain("h-40");
    expect(expandedImage?.closest("article")?.className).toContain("md:grid-cols-[0.95fr_1.05fr]");
  });

  test("navigates project images from overlay controls and mobile swipes", () => {
    const projectWithImages: ProjectDto = {
      ...projects[0],
      thumbnail_image: { id: 101, image_url: "https://cdn.example.com/two.png", image_key: null, is_thumbnail: true, order_index: 1 },
      images: [
        { id: 100, image_url: "https://cdn.example.com/one.png", image_key: null, is_thumbnail: false, order_index: 0 },
        { id: 101, image_url: "https://cdn.example.com/two.png", image_key: null, is_thumbnail: true, order_index: 1 },
        { id: 102, image_url: "https://cdn.example.com/three.png", image_key: null, is_thumbnail: false, order_index: 2 },
      ],
    };

    const { container } = render(<ProjectsSection projects={[projectWithImages]} />);
    const mediaFrame = container.querySelector('[style*="two.png"]')?.parentElement;
    const navigation = container.querySelector('[aria-label="Project image navigation"]');

    expect(mediaFrame).toBeTruthy();
    expect(navigation?.className).toContain("md:hidden");
    expect(screen.getByRole("button", { name: "Show image 2 of 3" }).getAttribute("aria-current")).toBe("true");
    expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.queryByText("2 / 3")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next project image" }));
    expect(container.querySelector('[style*="three.png"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show image 3 of 3" }).getAttribute("aria-current")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Next project image" }));
    expect(container.querySelector('[style*="one.png"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous project image" }));
    expect(container.querySelector('[style*="three.png"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show image 2 of 3" }));
    expect(container.querySelector('[style*="two.png"]')).toBeTruthy();

    const currentMediaFrame = container.querySelector('[style*="two.png"]')?.parentElement;
    expect(currentMediaFrame).toBeTruthy();
    fireEvent.touchStart(currentMediaFrame as Element, { touches: [{ clientX: 180, clientY: 20 }] });
    fireEvent.touchEnd(currentMediaFrame as Element, { changedTouches: [{ clientX: 90, clientY: 28 }] });
    expect(container.querySelector('[style*="three.png"]')).toBeTruthy();

    fireEvent.touchStart(currentMediaFrame as Element, { touches: [{ clientX: 90, clientY: 20 }] });
    fireEvent.touchEnd(currentMediaFrame as Element, { changedTouches: [{ clientX: 170, clientY: 26 }] });
    expect(container.querySelector('[style*="two.png"]')).toBeTruthy();

    fireEvent.touchStart(currentMediaFrame as Element, { touches: [{ clientX: 180, clientY: 20 }] });
    fireEvent.touchEnd(currentMediaFrame as Element, { changedTouches: [{ clientX: 150, clientY: 24 }] });
    expect(container.querySelector('[style*="two.png"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(container.querySelector('[aria-label="Project image navigation"]')?.className).toContain("md:flex");
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
