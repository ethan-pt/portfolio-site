import type { ProjectDto } from "@/types/api";

type ProjectCardProps = {
  project: ProjectDto;
};

function projectInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function hasProjectLink(link: string): boolean {
  return link.trim() !== "" && link.trim() !== "#";
}

export function ProjectCard({ project }: ProjectCardProps) {
  const projectHasLink = hasProjectLink(project.link);

  return (
    <article className="group grid overflow-hidden rounded-lg border border-[#B4A5A5]/15 bg-[#151515] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-[#B4A5A5]/35 md:grid-cols-[0.95fr_1.05fr]">
      <div className="min-h-64 bg-[#301B3F]">
        {project.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 images run unoptimized on Cloudflare.
          <img
            src={project.image_url}
            alt=""
            className="h-full min-h-64 w-full object-cover opacity-90 transition group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full min-h-64 flex-col justify-between bg-[linear-gradient(135deg,#301B3F,#3C415C)] p-6">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#B4A5A5]" />
              <span className="h-3 w-3 rounded-full bg-white/45" />
              <span className="h-3 w-3 rounded-full bg-black/35" />
            </div>
            <div>
              <div className="flex h-20 w-20 items-center justify-center rounded-md border border-white/20 bg-[#151515]/35 text-2xl font-bold text-white">
                {projectInitials(project.title)}
              </div>
              <p className="mt-5 max-w-xs text-sm font-semibold tracking-[0.18em] text-white/75 uppercase">
                Project preview
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          {project.categories.map((category) => (
            <span key={category.id} className="rounded-full border border-[#B4A5A5]/20 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[#B4A5A5] uppercase">
              {category.name}
            </span>
          ))}
          {project.featured ? (
            <span className="rounded-full bg-[#B4A5A5] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[#151515] uppercase">
              Featured
            </span>
          ) : null}
        </div>
        <h3 className="mt-5 text-2xl font-semibold text-white md:text-3xl">{project.title}</h3>
        <p className="mt-4 grow text-base leading-7 text-[#f4eeee]">{project.description}</p>
        {project.skills.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {project.skills.map((skill) => (
              <span key={skill.id} className="rounded-full bg-[#3C415C]/65 px-3 py-1 text-xs font-semibold text-[#f8f5f5]">
                {skill.name}
              </span>
            ))}
          </div>
        ) : null}
        {projectHasLink ? (
          <a
            href={project.link}
            className="mt-7 inline-flex w-fit rounded-full border border-[#B4A5A5]/30 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open Project
          </a>
        ) : null}
      </div>
    </article>
  );
}
