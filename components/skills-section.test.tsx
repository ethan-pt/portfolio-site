import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { SkillsSection } from "./skills-section";
import type { SkillDto } from "@/types/api";

const frontend = { id: 10, name: "Frontend" };
const backend = { id: 11, name: "Backend" };
const language = { id: 12, name: "Language" };

const skills: SkillDto[] = [
  { id: 1, name: "Zod", icon_url: null, categories: [backend], featured: false },
  { id: 2, name: "React", icon_url: "https://cdn.example.com/react.svg", categories: [frontend], featured: true },
  { id: 3, name: "TypeScript", icon_url: null, categories: [frontend, language], featured: false },
  { id: 4, name: "D1", icon_url: null, categories: [backend], featured: false },
];
const projectReferences = {
  1: { count: 2, titles: ["API", "Worker"] },
  2: { count: 1, titles: ["Dashboard"] },
  3: { count: 3, titles: ["Dashboard", "API", "Tool"] },
  4: { count: 2, titles: ["Worker", "Tool"] },
};

function skillHeadings() {
  return screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
}

function skillsSection() {
  const section = screen.getByText("Skills").closest("section");
  expect(section).toBeTruthy();
  return section as HTMLElement;
}

afterEach(() => cleanup());

describe("SkillsSection", () => {
  test("shows featured skills by default with counts and toggles non-featured skills", () => {
    render(<SkillsSection skills={skills} projectReferences={projectReferences} />);

    expect(skillHeadings()).toEqual(["React"]);
    const projectLink = screen.getByRole("link", { name: "1 project" });
    expect(projectLink.getAttribute("href")).toBe("#projects");
    expect(projectLink.getAttribute("title")).toBe("Dashboard");

    fireEvent.click(screen.getByRole("button", { name: "More skills" }));
    expect(skillHeadings()).toEqual(["React", "TypeScript", "D1", "Zod"]);
    expect(screen.getByRole("link", { name: "3 projects" }).getAttribute("title")).toBe("Dashboard, API, Tool");

    fireEvent.click(screen.getByRole("button", { name: "Less skills" }));
    expect(skillHeadings()).toEqual(["React"]);
  });

  test("requires every selected skill category while including non-featured matches", () => {
    render(<SkillsSection skills={skills} projectReferences={projectReferences} />);

    fireEvent.click(within(skillsSection()).getByLabelText("Frontend"));
    fireEvent.click(within(skillsSection()).getByLabelText("Language"));

    expect(skillHeadings()).toEqual(["TypeScript"]);
    expect(screen.queryByRole("button", { name: "More skills" })).toBeNull();
    expect(screen.queryByRole("heading", { level: 3, name: "React" })).toBeNull();
  });

  test("reset clears skill filters and restores featured-only display", () => {
    render(<SkillsSection skills={skills} projectReferences={projectReferences} />);

    fireEvent.click(screen.getByRole("button", { name: "More skills" }));
    fireEvent.click(within(skillsSection()).getByLabelText("Language"));
    expect(skillHeadings()).toEqual(["TypeScript"]);

    fireEvent.click(screen.getByRole("button", { name: "Reset skill filters" }));

    expect(skillHeadings()).toEqual(["React"]);
    expect(screen.queryByRole("button", { name: "Reset skill filters" })).toBeNull();
    expect(screen.getByRole("button", { name: "More skills" })).toBeTruthy();
  });

  test("shows all sorted skills by default when none are featured", () => {
    render(<SkillsSection skills={skills.map((skill) => ({ ...skill, featured: false }))} projectReferences={projectReferences} />);

    expect(skillHeadings()).toEqual(["TypeScript", "D1", "Zod", "React"]);
    expect(screen.queryByRole("button", { name: "More skills" })).toBeNull();
  });
});
