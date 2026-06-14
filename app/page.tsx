import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { About } from "@/components/about";
import { HomeSections } from "@/components/home-sections";
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

function skillProjectReferences(projects: ProjectDto[]): Record<number, { count: number; titles: string[] }> {
  return projects.reduce<Record<number, { count: number; titles: string[] }>>((references, project) => {
    for (const skill of project.skills) {
      const current = references[skill.id] ?? { count: 0, titles: [] };
      references[skill.id] = { count: current.count + 1, titles: [...current.titles, project.title] };
    }

    return references;
  }, {});
}

export default async function Home() {
  const { env } = await getCloudflareContext({ async: true });
  const contact = getPortfolioContact();
  const { projects, skills } = await getHomeData(env);
  const references = skillProjectReferences(projects);

  return (
    <main className="min-h-screen bg-[#151515] text-[#f8f5f5]">
      <Header contact={contact} />
      <Hero contact={contact} />
      <About />
      <HomeSections projects={projects} skills={skills} skillProjectReferences={references} />
      <ContactSection contact={contact} />
    </main>
  );
}
