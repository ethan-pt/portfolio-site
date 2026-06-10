import type { PortfolioContact } from "@/lib/portfolio-contact";

type HeroProps = {
  contact: PortfolioContact;
};

export function Hero({ contact }: HeroProps) {
  return (
    <section className="relative flex min-h-[calc(100svh-73px)] items-center px-5 py-12 md:px-8">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top_left,#301B3F_0%,rgba(48,27,63,0.36)_34%,rgba(21,21,21,0)_72%)]" />
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">
            Backend-focused software engineer
          </p>
          <h1 className="mt-5 text-5xl leading-tight font-semibold text-white md:text-7xl">
            Ethan Tubbe
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#f2eeee] md:text-xl md:leading-9">
            Self-taught, backend-focused software engineer with prior operations experience. I build
            practical web systems, backend services, and tools around real project needs.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {["Backend", "Web apps", "Databases", "Automation"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#B4A5A5]/20 px-4 py-2 text-sm font-semibold text-[#f8f5f5]"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={contact.emailHref}
              className="rounded-full border border-[#B4A5A5]/30 bg-[#B4A5A5]/10 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/20"
            >
              Contact Ethan
            </a>
            {contact.resumeUrl ? (
              <a
                href={contact.resumeUrl}
                className="rounded-full border border-[#B4A5A5]/30 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/10"
                rel="noopener noreferrer"
                target="_blank"
              >
                View Resume
              </a>
            ) : null}
            <a
              href="#projects"
              className="rounded-full border border-[#B4A5A5]/30 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/10"
            >
              View Projects
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
