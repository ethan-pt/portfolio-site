"use client";

import { useRef } from "react";
import type { CategoryDto } from "@/types/api";

type CategoryRailProps = {
  categories: CategoryDto[];
  expanded?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function CategoryRail({ categories, expanded = false, size = "md", className = "" }: CategoryRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  if (categories.length === 0) {
    return null;
  }

  const railGap = size === "sm" ? "gap-1.5" : "gap-3";
  const railLayout = expanded
    ? "flex flex-wrap " + railGap
    : "flex max-w-full flex-nowrap " + railGap + " overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
  const chipSize = size === "sm"
    ? "px-2 py-1 tracking-normal text-[#f6f2f2] normal-case"
    : "px-3 py-1 tracking-[0.14em] text-[#B4A5A5] uppercase";
  const canNavigate = !expanded && categories.length > 1;
  const railClassName = canNavigate ? "" : className;

  function scrollCategories(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.75, 120), behavior: "smooth" });
  }

  const rail = (
    <div
      ref={railRef}
      className={railLayout + " " + railClassName}
      data-layout={expanded ? "expanded" : "compact"}
      data-testid="category-rail"
    >
      {categories.map((category) => (
        <span
          key={category.id}
          className={"shrink-0 whitespace-nowrap rounded-full border border-[#B4A5A5]/20 text-xs font-semibold " + chipSize}
        >
          {category.name}
        </span>
      ))}
    </div>
  );

  if (!canNavigate) {
    return rail;
  }

  return (
    <div className={"flex min-w-0 items-center gap-2 " + className}>
      <button
        type="button"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#B4A5A5]/20 text-sm font-bold text-[#B4A5A5] transition hover:border-[#B4A5A5]/55 hover:bg-[#B4A5A5]/10 hover:text-white"
        aria-label="Previous categories"
        onClick={() => scrollCategories(-1)}
      >
        <span aria-hidden="true">{"<"}</span>
      </button>
      <div className="min-w-0 flex-1">{rail}</div>
      <button
        type="button"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#B4A5A5]/20 text-sm font-bold text-[#B4A5A5] transition hover:border-[#B4A5A5]/55 hover:bg-[#B4A5A5]/10 hover:text-white"
        aria-label="Next categories"
        onClick={() => scrollCategories(1)}
      >
        <span aria-hidden="true">{">"}</span>
      </button>
    </div>
  );
}
