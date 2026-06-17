import type { PortfolioContact } from "@/lib/portfolio-contact";

type ContactSectionProps = {
  contact: PortfolioContact;
};

export function ContactSection({ contact }: ContactSectionProps) {
  return (
    <section
      id="contact"
      className="relative isolate min-h-[140svh] scroll-mt-24 overflow-visible px-5 py-20 md:px-8 md:py-28"
    >
      <div className="sticky top-[calc(50svh-12rem)] mx-auto flex max-w-6xl items-start pb-24 md:top-[calc(50svh-13rem)] md:pb-32">
        <div className="grid w-full gap-8 rounded-lg border border-[#B4A5A5]/15 bg-[#3C415C]/30 p-8 shadow-2xl shadow-black/20 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">Contact</p>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Open to software engineering roles.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#f4eeee]">
              I&apos;m interested in teams that value reliability, clear communication, and steady
              ownership. Email is the best way to reach me.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:min-w-72 md:grid-cols-1">
            <a
              href={contact.emailHref}
              className="rounded-full border border-[#B4A5A5]/30 bg-[#B4A5A5]/10 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/20"
            >
              {contact.email}
            </a>
            <a
              href={contact.githubUrl}
              className="rounded-full border border-[#B4A5A5]/30 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/10"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            {contact.resumeUrl ? (
              <a
                href={contact.resumeUrl}
                className="rounded-full border border-[#B4A5A5]/30 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/10"
                rel="noopener noreferrer"
                target="_blank"
              >
                Resume
              </a>
            ) : null}
            <a
              href={contact.linkedInUrl}
              className="rounded-full border border-[#B4A5A5]/30 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-[#B4A5A5]/70 hover:bg-[#B4A5A5]/10"
              rel="noopener noreferrer"
              target="_blank"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
