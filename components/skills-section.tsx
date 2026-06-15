"use client";

import { useMemo, useState } from "react";
import type { SkillDto } from "@/types/api";
import { FilterDropdown, type FilterOption } from "./filter-dropdown";
import { SkillIcon } from "./skill-icon";

export type SkillProjectSummary = {
  count: number;
  titles: string[];
};

type SkillsSectionProps = {
  skills: SkillDto[];
  projectReferences: Record<number, SkillProjectSummary>;
  onProjectCountClick?: (skillId: number) => void;
};

function uniqueOptions(options: FilterOption[]): FilterOption[] {
  return [...new Map(options.map((option) => [option.id, option])).values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function includesAll(selectedIds: number[], availableIds: number[]): boolean {
  return selectedIds.every((selectedId) => availableIds.includes(selectedId));
}

export function SkillsSection({ skills, projectReferences, onProjectCountClick }: SkillsSectionProps) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const categoryOptions = useMemo(
    () => uniqueOptions(skills.flatMap((skill) => skill.categories)),
    [skills]
  );
  const sortedSkills = useMemo(
    () =>
      [...skills].sort((left, right) => {
        if (left.featured !== right.featured) return left.featured ? -1 : 1;

        const referenceDifference = (projectReferences[right.id]?.count ?? 0) - (projectReferences[left.id]?.count ?? 0);
        if (referenceDifference !== 0) return referenceDifference;

        return left.name.localeCompare(right.name);
      }),
    [projectReferences, skills]
  );
  const filteredSkills = useMemo(
    () =>
      sortedSkills.filter((skill) =>
        includesAll(selectedCategoryIds, skill.categories.map((category) => category.id))
      ),
    [selectedCategoryIds, sortedSkills]
  );
  const filtersActive = selectedCategoryIds.length > 0;
  const featuredSkills = filteredSkills.filter((skill) => skill.featured);
  const hasFeaturedSkills = skills.some((skill) => skill.featured);
  const hasNonFeaturedSkills = skills.some((skill) => !skill.featured);
  const canToggleMore = !filtersActive && hasFeaturedSkills && hasNonFeaturedSkills;
  const visibleSkills = filtersActive || showAllSkills || !hasFeaturedSkills ? filteredSkills : featuredSkills;

  function resetFilters() {
    setSelectedCategoryIds([]);
    setShowAllSkills(false);
  }

  return (
    <section id="skills" className="scroll-mt-24 border-y border-[#B4A5A5]/10 bg-[#301B3F]/25 px-5 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">Skills</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Technical focus</h2>
          <p className="mt-5 text-base leading-7 text-[#f0ebeb]">
            What I use day to day across my projects.
          </p>
        </div>
        {skills.length > 0 ? (
          <>
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <FilterDropdown label="Categories" options={categoryOptions} selectedIds={selectedCategoryIds} onChange={setSelectedCategoryIds} />
              {filtersActive ? (
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-[#B4A5A5]/25 px-4 py-2.5 text-sm font-semibold text-[#f6f2f2] transition hover:border-[#B4A5A5]/65 hover:bg-[#B4A5A5]/10"
                  onClick={resetFilters}
                >
                  Reset skill filters
                </button>
              ) : null}
            </div>
            {visibleSkills.length > 0 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleSkills.map((skill) => {
                    const reference = projectReferences[skill.id] ?? { count: 0, titles: [] };
                    const projectLabel = reference.count === 1 ? "project" : "projects";
                    const projectTitle = reference.titles.length > 0 ? reference.titles.join(", ") : "No linked projects";

                    return (
                      <section key={skill.id} className="rounded-md border border-[#B4A5A5]/15 bg-[#151515]/80 p-4">
                        <div className="flex items-start gap-3">
                          <SkillIcon name={skill.name} iconUrl={skill.icon_url} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-white" style={{ cursor: "default" }}>
                                {skill.name}
                              </h3>
                              {skill.featured ? (
                                <span className="rounded-full bg-[#B4A5A5] px-2 py-0.5 text-[0.65rem] font-bold text-[#151515]">
                                  Featured
                                </span>
                              ) : null}
                            </div>
                            <a
                              className="mt-2 inline-block text-sm font-semibold text-[#B4A5A5] underline-offset-4 transition hover:text-white hover:underline"
                              href="#projects"
                              title={projectTitle}
                              onClick={() => onProjectCountClick?.(skill.id)}
                            >
                              {reference.count} {projectLabel}
                            </a>
                          </div>
                        </div>
                        {skill.categories.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {skill.categories.map((category) => (
                              <span key={category.id} className="rounded-full border border-[#B4A5A5]/20 px-2 py-1 text-xs font-semibold text-[#f6f2f2]">
                                {category.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
                {canToggleMore ? (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      className="rounded-full border border-[#B4A5A5]/30 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
                      onClick={() => setShowAllSkills((isShowingAll) => !isShowingAll)}
                    >
                      {showAllSkills ? "Less skills" : "More skills"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-[#B4A5A5]/15 bg-[#151515]/80 p-8 text-[#f2eeee]">
                No skills match the selected filters.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-[#B4A5A5]/15 bg-[#151515]/80 p-8 text-[#f2eeee]">
            Skill data is ready to display once records are added to the portfolio database.
          </div>
        )}
      </div>
    </section>
  );
}
