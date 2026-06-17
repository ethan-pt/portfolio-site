"use client";

import { useRef, useState, type TouchEvent } from "react";
import type { ProjectDto, ProjectImageDto } from "@/types/api";
import { CategoryRail } from "./category-rail";

type ProjectCardProps = {
  project: ProjectDto;
  isOpen: boolean;
  onToggleOpen: () => void;
};

const IMAGE_SWIPE_THRESHOLD = 48;

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

function ProjectPlaceholder({ title, isOpen }: { title: string; isOpen: boolean }) {
  const paddingClass = isOpen ? "p-6" : "p-4";
  const initialsClass = isOpen ? "h-20 w-20 text-2xl" : "h-14 w-14 text-lg";

  return (
    <div className={`flex h-full flex-col justify-between bg-[linear-gradient(135deg,#301B3F,#3C415C)] ${paddingClass}`}>
      <div className="flex gap-2">
        <span className="h-3 w-3 rounded-full bg-[#B4A5A5]" />
        <span className="h-3 w-3 rounded-full bg-white/45" />
        <span className="h-3 w-3 rounded-full bg-black/35" />
      </div>
      <div>
        <div className={`flex ${initialsClass} items-center justify-center rounded-md border border-white/20 bg-[#151515]/35 font-bold text-white`}>
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
    <div
      aria-hidden="true"
      className="h-full w-full min-w-0 max-w-full opacity-90 transition group-hover:opacity-100"
      style={{
        backgroundImage: `url(${image.image_url})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
      }}
    />
  );
}

export function ProjectCard({ project, isOpen, onToggleOpen }: ProjectCardProps) {
  const projectImages = project.images ?? [];
  const projectSummary = project.summary_description ?? project.description;
  const projectFullDescription = project.full_description ?? project.description;
  const images = projectImages.length > 0 ? projectImages : project.thumbnail_image ? [project.thumbnail_image] : [];
  const thumbnail = project.thumbnail_image ?? images[0] ?? null;
  const thumbnailImageIndex = thumbnail ? images.findIndex((image) => image.id === thumbnail.id) : -1;
  const initialImageIndex = thumbnailImageIndex >= 0 ? thumbnailImageIndex : 0;
  const [activeImageIndex, setActiveImageIndex] = useState(initialImageIndex);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeImage = images[activeImageIndex] ?? thumbnail ?? images[0] ?? null;
  const projectHasGitHubLink = hasProjectLink(project.github_url || project.link);
  const projectHasLiveLink = hasProjectLink(project.live_url);
  const canShowMore = projectFullDescription.trim() !== projectSummary.trim() || images.length > 1;
  const canNavigateImages = images.length > 1;

  function toggleOpen() {
    onToggleOpen();
  }

  function showPreviousImage() {
    setActiveImageIndex((index) => (images.length === 0 ? 0 : index === 0 ? images.length - 1 : index - 1));
  }

  function showNextImage() {
    setActiveImageIndex((index) => (images.length === 0 ? 0 : (index + 1) % images.length));
  }

  function showImage(index: number) {
    setActiveImageIndex(index);
  }

  function handleImageTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!canNavigateImages) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleImageTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const swipeStart = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!swipeStart || !canNavigateImages) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;

    if (Math.abs(deltaX) < IMAGE_SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    if (deltaX < 0) {
      showNextImage();
    } else {
      showPreviousImage();
    }
  }

  return (
    <article
      className={[
        "group grid w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[#B4A5A5]/15 bg-[#151515] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-[#B4A5A5]/35",
        isOpen ? "md:grid-cols-[0.95fr_1.05fr]" : "md:grid-cols-[14rem_1fr]",
      ].join(" ")}
    >
      <div
        className={`relative flex w-full min-w-0 max-w-full touch-pan-y items-center justify-center overflow-hidden ${
          isOpen ? "h-full min-h-64 self-stretch" : "h-40 min-h-40 self-start md:h-auto md:self-stretch"
        } bg-[#201926]`}
        onTouchStart={handleImageTouchStart}
        onTouchEnd={handleImageTouchEnd}
      >
        {activeImage ? <ProjectImage image={activeImage} /> : <ProjectPlaceholder title={project.title} isOpen={isOpen} />}
        {canNavigateImages ? (
          <div
            className={`absolute inset-0 flex items-center justify-between px-3 ${isOpen ? "md:flex" : "md:hidden"}`}
            aria-label="Project image navigation"
          >
            <button
              type="button"
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#151515]/75 text-xl font-bold text-white shadow-lg shadow-black/30 backdrop-blur transition hover:border-white/55 hover:bg-[#301B3F]/90"
              onClick={showPreviousImage}
              aria-label="Previous project image"
            >
              <span aria-hidden="true">{"<"}</span>
            </button>
            <button
              type="button"
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#151515]/75 text-xl font-bold text-white shadow-lg shadow-black/30 backdrop-blur transition hover:border-white/55 hover:bg-[#301B3F]/90"
              onClick={showNextImage}
              aria-label="Next project image"
            >
              <span aria-hidden="true">{">"}</span>
            </button>
            <div className="pointer-events-auto absolute right-0 bottom-3 left-0 flex justify-center gap-2 px-12">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`h-2.5 w-2.5 rounded-full border border-white/60 transition ${
                    activeImageIndex === index ? "bg-white" : "bg-white/25 hover:bg-white/60"
                  }`}
                  onClick={() => showImage(index)}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-current={activeImageIndex === index ? "true" : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 max-w-full flex-col p-6 md:p-8">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
          <CategoryRail categories={project.categories} expanded={isOpen} className="min-w-0 flex-1" />
          {project.featured ? (
            <span className="w-fit shrink-0 rounded-full bg-[#B4A5A5] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[#151515] uppercase">
              Featured
            </span>
          ) : null}
        </div>
        <h3 className="mt-5 break-words text-2xl font-semibold text-white md:text-3xl">{project.title}</h3>
        <p className={`mt-4 break-words text-base leading-7 ${isOpen ? "grow text-[#d8d0d0]" : "text-[#f4eeee]"}`}>
          {isOpen ? projectFullDescription : projectSummary}
        </p>
        {!isOpen ? <div className="grow" /> : null}

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
