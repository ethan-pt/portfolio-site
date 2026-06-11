import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { SkillsSection } from "./skills-section";
import type { SkillDto } from "@/types/api";

const frontend = { id: 10, name: "Frontend" };
const backend = { id: 11, name: "Backend" };
const language = { id: 12, name: "Language" };

const skills: SkillDto[] = [
  { id: 1, name: "Zod", categories: [backend], featured: false },
  { id: 2, name: "React", categories: [frontend], featured: true },
  { id: 3, name: "TypeScript", categories: [frontend, language], featured: false },
  { id: 4, name: "D1", categories: [backend], featured: false },
];

function skillHeadings() {
  return screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
}

afterEach(() => cleanup());


describe("SkillsSection", () => {
  test("sorts skills by featured, project references, and name", () => {
    render(<SkillsSection skills={skills} projectReferenceCounts={{ 1: 2, 2: 1, 3: 3, 4: 2 }} />);

    expect(skillHeadings()).toEqual(["React", "TypeScript", "D1", "Zod"]);
    expect(screen.getByText("3 projects")).toBeTruthy();
    expect(screen.getByText("1 project")).toBeTruthy();
  });

  test("requires every selected skill category", () => {
    render(<SkillsSection skills={skills} projectReferenceCounts={{ 1: 2, 2: 1, 3: 3, 4: 2 }} />);

    const controls = screen.getByText("Skills").closest("section");
    expect(controls).toBeTruthy();
    fireEvent.click(within(controls as HTMLElement).getByLabelText("Frontend"));
    fireEvent.click(within(controls as HTMLElement).getByLabelText("Language"));

    expect(skillHeadings()).toEqual(["TypeScript"]);
    expect(screen.queryByRole("heading", { level: 3, name: "React" })).toBeNull();
  });

  test("resets skill filters", () => {
    render(<SkillsSection skills={skills} projectReferenceCounts={{ 1: 2, 2: 1, 3: 3, 4: 2 }} />);

    const controls = screen.getByText("Skills").closest("section");
    expect(controls).toBeTruthy();
    fireEvent.click(within(controls as HTMLElement).getByLabelText("Language"));
    expect(skillHeadings()).toEqual(["TypeScript"]);

    fireEvent.click(screen.getByRole("button", { name: "Reset skill filters" }));

    expect(skillHeadings()).toEqual(["React", "TypeScript", "D1", "Zod"]);
    expect(screen.queryByRole("button", { name: "Reset skill filters" })).toBeNull();
  });
});
