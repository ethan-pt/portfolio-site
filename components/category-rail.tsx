"use client";

import type { CategoryDto } from "@/types/api";

type CategoryRailProps = {
  categories: CategoryDto[];
  expanded?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function CategoryRail({ categories, expanded = false, size = "md", className = "" }: CategoryRailProps) {
  if (categories.length === 0) {
    return null;
  }

  const railLayout = expanded
    ? "flex flex-wrap gap-3"
    : "flex max-w-full flex-nowrap gap-3 overflow-x-auto pb-1";
  const chipSize = size === "sm"
    ? "px-2 py-1 tracking-normal text-[#f6f2f2] normal-case"
    : "px-3 py-1 tracking-[0.14em] text-[#B4A5A5] uppercase";

  return (
    <div
      className={`${railLayout} ${className}`}
      data-layout={expanded ? "expanded" : "compact"}
      data-testid="category-rail"
    >
      {categories.map((category) => (
        <span
          key={category.id}
          className={`shrink-0 whitespace-nowrap rounded-full border border-[#B4A5A5]/20 text-xs font-semibold ${chipSize}`}
        >
          {category.name}
        </span>
      ))}
    </div>
  );
}
