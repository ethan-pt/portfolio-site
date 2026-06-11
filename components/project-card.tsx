"use client";

import { useState } from "react";
import type { ProjectDto, ProjectImageDto } from "@/types/api";

type ProjectCardProps = {
  project: ProjectDto;
  isOpen: boolean;
  onToggleOpen: () => void;
};

function projectInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function hasProjectLink(link: string | null | undefined): link is string {
  return Boolean(link && link.trim() !== "" && link.trim() !== "#");
}

function ProjectPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-64 flex-col justify-between bg-[linear-gradient(135deg,#301B3F,#3C415C)] p-6">
      <div className="flex gap-2">
        <span className="h-3 w-3 rounded-full bg-[#B4A5A5]" />
        <span className="h-3 w-3 rounded-full bg-white/45" />
        <span className="h-3 w-3 rounded-full bg-black/35" />
      </div>
      <div>
        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-white/20 bg-[#151515]/35 text-2xl font-bold text-white">
          {projectInitials(title)}
        </div>
        <p className="mt-5 max-w-xs text-sm font-semibold tracking-[0.18em] text-white/75 uppercase">
          Project preview
        </p>
      </div>
    </div>
  );
}

function ProjectImage({ image }: { image: ProjectImageDto }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- R2 images run unoptimized on Cloudflare.
    <img
      src={image.image_url}
      alt=""
      className="h-full min-h-64 w-full object-cover opacity-90 transition group-hover:opacity-100"
    />
  );
}

export function ProjectCard({ project, isOpen, onToggleOpen }: ProjectCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const projectImages = project.images ?? [];
  const projectSummary = project.summary_description ?? project.description;
  const projectFullDescription = project.full_description ?? project.description;
  const images = projectImages.length > 0 ? projectImages : project.thumbnail_image ? [project.thumbnail_image] : [];
  const thumbnail = project.thumbnail_image ?? images[0] ?? null;
  const activeImage = isOpen ? images[activeImageIndex] ?? thumbnail : thumbnail;
  const projectHasGitHubLink = hasProjectLink(project.github_url || project.link);
  const projectHasLiveLink = hasProjectLink(project.live_url);
  const canShowMore = projectFullDescription.trim() !== projectSummary.trim() || images.length > 1;

  function toggleOpen() {
    if (!isOpen) {
      setActiveImageIndex(0);
    }
    onToggleOpen();
  }

  function showPreviousImage() {
    setActiveImageIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  }

  function showNextImage() {
    setActiveImageIndex((index) => (index + 1) % images.length);
  }

  return (
    <article className="group grid overflow-hidden rounded-lg border border-[#B4A5A5]/15 bg-[#151515] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-[#B4A5A5]/35 md:grid-cols-[0.95fr_1.05fr]">
      <div className="min-h-64 bg-[#301B3F]">
        {activeImage ? <ProjectImage image={activeImage} /> : <ProjectPlaceholder title={project.title} />}
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
        <p className="mt-4 text-base leading-7 text-[#f4eeee]">{projectSummary}</p>
        {isOpen ? <p className="mt-4 grow text-base leading-7 text-[#d8d0d0]">{projectFullDescription}</p> : <div className="grow" />}
        {isOpen && images.length > 1 ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#B4A5A5]/15 pt-4">
            <button
              type="button"
              className="rounded-md border border-[#B4A5A5]/30 px-3 py-2 text-sm font-semibold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
              onClick={showPreviousImage}
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-[#B4A5A5]">{activeImageIndex + 1} / {images.length}</span>
            <button
              type="button"
              className="rounded-md border border-[#B4A5A5]/30 px-3 py-2 text-sm font-semibold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
              onClick={showNextImage}
            >
              Next
            </button>
          </div>
        ) : null}
        {project.skills.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {project.skills.map((skill) => (
              <span key={skill.id} className="rounded-full bg-[#3C415C]/65 px-3 py-1 text-xs font-semibold text-[#f8f5f5]">
                {skill.name}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-7 flex flex-wrap gap-3">
          {projectHasGitHubLink ? (
            <a
              href={project.github_url || project.link}
              className="inline-flex w-fit rounded-full border border-[#B4A5A5]/30 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          ) : null}
          {projectHasLiveLink ? (
            <a
              href={project.live_url ?? undefined}
              className="inline-flex w-fit rounded-full border border-[#B4A5A5]/30 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
              rel="noopener noreferrer"
              target="_blank"
            >
              Live
            </a>
          ) : null}
          {canShowMore ? (
            <button
              type="button"
              className="inline-flex w-fit rounded-full border border-[#B4A5A5]/30 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#301B3F]"
              onClick={toggleOpen}
              aria-expanded={isOpen}
            >
              {isOpen ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
