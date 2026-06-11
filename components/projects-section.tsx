"use client";

import { useMemo, useState } from "react";
import type { ProjectDto } from "@/types/api";
import { FilterDropdown, type FilterOption } from "./filter-dropdown";
import { ProjectCard } from "./project-card";

type ProjectsSectionProps = {
  projects: ProjectDto[];
};

function uniqueOptions(options: FilterOption[]): FilterOption[] {
  return [...new Map(options.map((option) => [option.id, option])).values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function includesAll(selectedIds: number[], availableIds: number[]): boolean {
  return selectedIds.every((selectedId) => availableIds.includes(selectedId));
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const skillOptions = useMemo(
    () => uniqueOptions(projects.flatMap((project) => project.skills.map((skill) => ({ id: skill.id, name: skill.name })))),
    [projects]
  );
  const categoryOptions = useMemo(
    () => uniqueOptions(projects.flatMap((project) => project.categories)),
    [projects]
  );
  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const projectSkillIds = project.skills.map((skill) => skill.id);
        const projectCategoryIds = project.categories.map((category) => category.id);

        return includesAll(selectedSkillIds, projectSkillIds) && includesAll(selectedCategoryIds, projectCategoryIds);
      }),
    [projects, selectedCategoryIds, selectedSkillIds]
  );
  const filtersActive = selectedSkillIds.length > 0 || selectedCategoryIds.length > 0;
  const featuredProjects = filteredProjects.filter((project) => project.featured);
  const hasFeaturedProjects = projects.some((project) => project.featured);
  const hasNonFeaturedProjects = projects.some((project) => !project.featured);
  const canToggleMore = !filtersActive && hasFeaturedProjects && hasNonFeaturedProjects;
  const visibleProjects = filtersActive || showAllProjects || !hasFeaturedProjects ? filteredProjects : featuredProjects;

  function resetFilters() {
    setSelectedSkillIds([]);
    setSelectedCategoryIds([]);
    setShowAllProjects(false);
  }

  return (
    <section id="projects" className="scroll-mt-24 px-5 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">Projects</p>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Selected work</h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[#f0ebeb]">
            Projects that show how I work through data, backend behavior, automation, and the
            user-facing pieces needed to make a tool useful.
          </p>
        </div>
        {projects.length > 0 ? (
          <>
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <FilterDropdown label="Skills" options={skillOptions} selectedIds={selectedSkillIds} onChange={setSelectedSkillIds} />
              <FilterDropdown label="Categories" options={categoryOptions} selectedIds={selectedCategoryIds} onChange={setSelectedCategoryIds} />
              {filtersActive ? (
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-[#B4A5A5]/25 px-4 py-2.5 text-sm font-semibold text-[#f6f2f2] transition hover:border-[#B4A5A5]/65 hover:bg-[#B4A5A5]/10"
                  onClick={resetFilters}
                >
                  Reset project filters
                </button>
              ) : null}
            </div>
            {visibleProjects.length > 0 ? (
              <>
                <div className="grid gap-7">
                  {visibleProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
                {canToggleMore ? (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      className="rounded-full border border-[#B4A5A5]/30 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
                      onClick={() => setShowAllProjects((isShowingAll) => !isShowingAll)}
                    >
                      {showAllProjects ? "Less projects" : "More projects"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-[#B4A5A5]/15 bg-[#301B3F]/35 p-8 text-[#f2eeee]">
                No projects match the selected filters.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-[#B4A5A5]/15 bg-[#301B3F]/35 p-8 text-[#f2eeee]">
            Project data is ready to display once records are added to the portfolio database.
          </div>
        )}
      </div>
    </section>
  );
}
