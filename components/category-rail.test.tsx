import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CategoryRail } from "./category-rail";

const categories = [
  { id: 1, name: "Frontend" },
  { id: 2, name: "Backend" },
  { id: 3, name: "Automation" },
];

function mockRailSize({ clientWidth, scrollWidth }: { clientWidth: number; scrollWidth: number }) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => clientWidth,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get: () => scrollWidth,
  });
}

class MockResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    this.callback([], this as unknown as ResizeObserver);
  }

  disconnect() {}

  unobserve() {}
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CategoryRail", () => {
  test("does not show nav buttons when compact categories fit on one line", async () => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    mockRailSize({ clientWidth: 400, scrollWidth: 300 });

    render(<CategoryRail categories={categories} />);

    await waitFor(() => expect(screen.queryByRole("button", { name: "Previous categories" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Next categories" })).toBeNull();
  });

  test("shows nav buttons when compact categories overflow one line", async () => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    mockRailSize({ clientWidth: 240, scrollWidth: 500 });

    render(<CategoryRail categories={categories} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Previous categories" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Next categories" })).toBeTruthy();
  });

  test("does not show nav buttons when expanded even if categories overflow", async () => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    mockRailSize({ clientWidth: 240, scrollWidth: 500 });

    render(<CategoryRail categories={categories} expanded />);

    await waitFor(() => expect(screen.queryByRole("button", { name: "Previous categories" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Next categories" })).toBeNull();
    expect(screen.getByTestId("category-rail").getAttribute("data-layout")).toBe("expanded");
  });
});
