import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ContactSection } from "./contact-section";
import type { PortfolioContact } from "@/lib/portfolio-contact";

const contact: PortfolioContact = {
  email: "hello@example.com",
  emailHref: "mailto:hello@example.com",
  githubUrl: "https://github.com/example",
  linkedInUrl: "https://www.linkedin.com/in/example",
  resumeUrl: "/resume.pdf",
};

afterEach(() => cleanup());

describe("ContactSection", () => {
  test("keeps the contact box sticky on mobile and desktop", () => {
    const { container } = render(<ContactSection contact={contact} />);
    const stickyWrapper = screen.getByRole("heading", { name: "Open to software engineering roles." }).closest("section")?.firstElementChild;

    expect(stickyWrapper).toBeTruthy();
    expect(stickyWrapper?.className).toContain("sticky");
    expect(stickyWrapper?.className).toContain("top-[calc(50svh-12rem)]");
    expect(stickyWrapper?.className).toContain("md:top-[calc(50svh-13rem)]");
    expect(container.querySelector("#contact")?.className).toContain("overflow-visible");
  });
});
