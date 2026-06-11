import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { About } from "@/components/about";
import { ProjectsSection } from "@/components/projects-section";
import { SkillsSection } from "@/components/skills-section";
import { ContactSection } from "@/components/contact-section";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { listProjectDtos } from "@/lib/server/projects";
import { listSkillDtos } from "@/lib/server/skills";
import { getPortfolioContact } from "@/lib/portfolio-contact";
import type { ProjectDto, SkillDto } from "@/types/api";

export const dynamic = "force-dynamic";

async function getHomeData(env: CloudflareEnv): Promise<{ projects: ProjectDto[]; skills: SkillDto[] }> {
  try {
    const [projects, skills] = await Promise.all([
      listProjectDtos(env.DB),
      listSkillDtos(env.DB),
    ]);

    return { projects, skills };
  } catch (error) {
    console.error("Failed to load homepage data:", error);
    return { projects: [], skills: [] };
  }
}

function projectReferenceCounts(projects: ProjectDto[]): Record<number, number> {
  return projects.reduce<Record<number, number>>((counts, project) => {
    for (const skill of project.skills) {
      counts[skill.id] = (counts[skill.id] ?? 0) + 1;
    }

    return counts;
  }, {});
}

export default async function Home() {
  const { env } = await getCloudflareContext({ async: true });
  const contact = getPortfolioContact();
  const { projects, skills } = await getHomeData(env);
  const skillReferenceCounts = projectReferenceCounts(projects);

  return (
    <main className="min-h-screen bg-[#151515] text-[#f8f5f5]">
      <Header contact={contact} />
      <Hero contact={contact} />
      <About />
      <ProjectsSection projects={projects} />
      <SkillsSection skills={skills} projectReferenceCounts={skillReferenceCounts} />
      <ContactSection contact={contact} />
    </main>
  );
}
