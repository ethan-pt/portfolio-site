"use client";

import type { CategoryDto } from "@/types/api";

export type FilterOption = CategoryDto;

type FilterDropdownProps = {
  label: string;
  options: FilterOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
};

export function FilterDropdown({ label, options, selectedIds, onChange }: FilterDropdownProps) {
  const selectedSet = new Set(selectedIds);
  const selectedCount = selectedIds.length;
  const dropdownLabel = selectedCount > 0 ? `${label} (${selectedCount})` : label;

  function toggleOption(optionId: number, checked: boolean) {
    if (checked) {
      onChange([...selectedIds, optionId]);
      return;
    }

    onChange(selectedIds.filter((selectedId) => selectedId !== optionId));
  }

  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-[#B4A5A5]/20 bg-[#151515] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#B4A5A5]/55 hover:bg-[#301B3F]/45 [&::-webkit-details-marker]:hidden">
        <span>{dropdownLabel}</span>
        <span className="text-xs text-[#B4A5A5] transition group-open:rotate-180" aria-hidden="true">
          v
        </span>
      </summary>
      <div className="absolute left-0 z-20 mt-2 grid max-h-72 w-64 overflow-auto rounded-md border border-[#B4A5A5]/20 bg-[#151515] p-2 shadow-2xl shadow-black/45">
        {options.length > 0 ? (
          options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-3 rounded px-2.5 py-2 text-sm text-[#f6f2f2] transition hover:bg-[#301B3F]/70"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#B4A5A5]"
                checked={selectedSet.has(option.id)}
                onChange={(event) => toggleOption(option.id, event.target.checked)}
              />
              <span>{option.name}</span>
            </label>
          ))
        ) : (
          <p className="px-2.5 py-2 text-sm text-[#B4A5A5]">No options available.</p>
        )}
      </div>
    </details>
  );
}
