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

export const dynamic = "force-dynamic";

export default async function Home() {
  const { env } = await getCloudflareContext({ async: true });
  const contact = getPortfolioContact();
  const [projects, skills] = await Promise.all([
    listProjectDtos(env.DB),
    listSkillDtos(env.DB),
  ]);

  return (
    <main className="min-h-screen bg-[#151515] text-[#f8f5f5]">
      <Header contact={contact} />
      <Hero contact={contact} />
      <About />
      <ProjectsSection projects={projects} />
      <SkillsSection skills={skills} />
      <ContactSection contact={contact} />
    </main>
  );
}
