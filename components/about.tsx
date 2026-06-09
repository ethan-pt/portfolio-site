export function About() {
  return (
    <section id="about" className="scroll-mt-24 border-y border-[#B4A5A5]/10 bg-[#3C415C]/20 px-5 py-20 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">About</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Backend first. Full-stack when needed.</h2>
        </div>
        <div className="grid gap-6 text-lg leading-8 text-[#f3eeee]">
          <p>
            I like building the parts of software that make an application reliable: APIs, data models,
            authentication flows, storage, deployment details, and the glue between services.
          </p>
          <p>
            I also care about the frontend enough to make the full experience usable. My goal is to join a team where I can contribute,
            learn from production systems, and keep growing toward deeper backend, DevOps, and systems design work.
          </p>
        </div>
      </div>
    </section>
  );
}
