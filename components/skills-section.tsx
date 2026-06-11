import type { SkillDto } from "@/types/api";

type SkillsSectionProps = {
  skills: SkillDto[];
};

export function SkillsSection({ skills }: SkillsSectionProps) {
  return (
    <section id="skills" className="scroll-mt-24 border-y border-[#B4A5A5]/10 bg-[#301B3F]/25 px-5 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">Skills</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Technical focus</h2>
          <p className="mt-5 text-base leading-7 text-[#f0ebeb]">
            What I use day to day across my projects.
          </p>
        </div>
        {skills.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <section key={skill.id} className="rounded-lg border border-[#B4A5A5]/15 bg-[#151515]/80 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white" style={{ cursor: 'default' }}>
                    {skill.name}
                  </h3>
                  {skill.featured ? (
                    <span className="rounded-full bg-[#B4A5A5] px-2.5 py-1 text-xs font-bold text-[#151515]">
                      Featured
                    </span>
                  ) : null}
                </div>
                {skill.categories.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {skill.categories.map((category) => (
                      <span key={category.id} className="rounded-full border border-[#B4A5A5]/20 px-3 py-1.5 text-sm font-semibold text-[#f6f2f2]">
                        {category.name}
                      </span>
                    ))}
                  </div>
                ) : null}
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
