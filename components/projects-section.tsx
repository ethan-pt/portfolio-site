import type { ProjectDto } from "@/types/api";
import { ProjectCard } from "./project-card";

type ProjectsSectionProps = {
  projects: ProjectDto[];
};

export function ProjectsSection({ projects }: ProjectsSectionProps) {
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
          <div className="grid gap-7">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#B4A5A5]/15 bg-[#301B3F]/35 p-8 text-[#f2eeee]">
            Project data is ready to display once records are added to the portfolio database.
          </div>
        )}
      </div>
    </section>
  );
}
