export function About() {
  return (
    <section id="about" className="scroll-mt-24 border-y border-[#B4A5A5]/10 bg-[#3C415C]/20 px-5 py-20 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] text-[#B4A5A5] uppercase">About</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Self-taught and backend-focused.</h2>
        </div>
        <div className="grid gap-6 text-lg leading-8 text-[#f3eeee]">
          <p>
            Before software, I worked in fast-paced restaurant and logistics environments where
            accuracy, communication, and follow-through mattered every day.
          </p>
          <p>
            That background still shapes how I approach engineering: understand the workflow, find
            the bottlenecks, keep changes clear, and stay calm when something breaks.
          </p>
          <p>
            Most of my project work has focused on APIs, database-backed applications, authentication,
            deployment details, and automation I needed to make those systems run. I also work
            across the frontend when a project needs a clear, usable workflow.
          </p>
        </div>
      </div>
    </section>
  );
}
