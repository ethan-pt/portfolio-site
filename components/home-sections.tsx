"use client";

import { useState } from "react";
import type { ProjectDto, SkillDto } from "@/types/api";
import { ProjectsSection } from "./projects-section";
import { SkillsSection, type SkillProjectSummary } from "./skills-section";

type HomeSectionsProps = {
  projects: ProjectDto[];
  skills: SkillDto[];
  skillProjectReferences: Record<number, SkillProjectSummary>;
};

export function HomeSections({ projects, skills, skillProjectReferences }: HomeSectionsProps) {
  const [selectedProjectSkillIds, setSelectedProjectSkillIds] = useState<number[]>([]);
  const [selectedProjectCategoryIds, setSelectedProjectCategoryIds] = useState<number[]>([]);

  function filterProjectsToSkill(skillId: number) {
    setSelectedProjectSkillIds([skillId]);
    setSelectedProjectCategoryIds([]);
  }

  return (
    <>
      <ProjectsSection
        projects={projects}
        selectedSkillIds={selectedProjectSkillIds}
        onSelectedSkillIdsChange={setSelectedProjectSkillIds}
        selectedCategoryIds={selectedProjectCategoryIds}
        onSelectedCategoryIdsChange={setSelectedProjectCategoryIds}
      />
      <SkillsSection skills={skills} projectReferences={skillProjectReferences} onProjectCountClick={filterProjectsToSkill} />
    </>
  );
}
