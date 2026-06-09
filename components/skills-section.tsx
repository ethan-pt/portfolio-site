import type { SkillDto } from "@/types/api";

type SkillsSectionProps = {
  skills: SkillDto[];
};

function groupSkills(skills: SkillDto[]): Map<string, SkillDto[]> {
  return skills.reduce((groups, skill) => {
    const group = groups.get(skill.category) || [];
    group.push(skill);
    groups.set(skill.category, group);
    return groups;
  }, new Map<string, SkillDto[]>());
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  const skillGroups = groupSkills(skills);

  return (
    <section id="skills" className="scroll-mt-24 border-y border-[#B4A5A5]/10 bg-[#301B3F]/25 px-5 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">Skills</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Technical focus</h2>
          <p className="mt-5 text-base leading-7 text-[#f0ebeb]">
            The stack I am using across backend, full-stack, and deployment-focused projects.
          </p>
        </div>
        {skillGroups.size > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...skillGroups.entries()].map(([category, categorySkills]) => (
              <section key={category} className="rounded-lg border border-[#B4A5A5]/15 bg-[#151515]/80 p-6">
                <h3 className="text-lg font-semibold text-white">{category}</h3>
                <div className="mt-5 flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <span
                      key={skill.id}
                      className={
                        skill.featured
                          ? "rounded-full bg-[#B4A5A5] px-3 py-1.5 text-sm font-bold text-[#151515]"
                          : "rounded-full border border-[#B4A5A5]/20 px-3 py-1.5 text-sm font-semibold text-[#f6f2f2]"
                      }
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#B4A5A5]/15 bg-[#151515]/80 p-8 text-[#f2eeee]">
            Skill data is ready to display once records are added to the portfolio database.
          </div>
        )}
      </div>
    </section>
  );
}
