"use client";

import { useState } from "react";
import type { PortfolioContact } from "@/lib/portfolio-contact";

type HeaderNavProps = {
  contact: PortfolioContact;
};

const navItems = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

const linkButtonClass =
  "rounded-full border border-[#B4A5A5]/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#B4A5A5]/65 hover:bg-[#B4A5A5]/10";

const sectionButtonClass =
  "rounded-full border border-[#B4A5A5]/20 px-4 py-2 text-sm font-semibold text-[#f6f2f2] transition hover:border-[#B4A5A5]/65 hover:bg-[#B4A5A5]/10 hover:text-white";

export function HeaderNav({ contact }: HeaderNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#B4A5A5]/15 bg-[#151515]/92 backdrop-blur-xl">
        <nav
          className="mx-auto flex h-[73px] max-w-6xl items-center justify-between px-5 md:px-8"
          aria-label="Primary"
        >
          <a
            href="#"
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#B4A5A5]/30 bg-[#3C415C]/45 transition hover:border-[#B4A5A5]/65 hover:bg-[#B4A5A5]/10"
            aria-label="Go to top"
            onClick={closeMobileMenu}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Header image can be a runtime-configured Cloudflare/R2 asset. */}
            <img src="/bug.jpg" alt="" className="h-full w-full object-cover" />
          </a>

          <div className="hidden items-center gap-3 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className={sectionButtonClass}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <a href={contact.githubUrl} className={linkButtonClass} rel="noopener noreferrer" target="_blank">
              GitHub
            </a>
            <a href={contact.linkedInUrl} className={linkButtonClass} rel="noopener noreferrer" target="_blank">
              LinkedIn
            </a>
            {contact.resumeUrl ? (
              <a href={contact.resumeUrl} className={linkButtonClass} rel="noopener noreferrer" target="_blank">
                Resume
              </a>
            ) : null}
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#B4A5A5]/25 text-white transition hover:border-[#B4A5A5]/65 hover:bg-[#B4A5A5]/10 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            <span className="grid gap-1.5" aria-hidden="true">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>
        </nav>

        {menuOpen ? (
          <div id="mobile-menu" className="border-t border-[#B4A5A5]/15 bg-[#151515] md:hidden">
            <div className="mx-auto grid max-w-6xl gap-2 px-5 py-4">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-[#B4A5A5]/20 px-3 py-3 text-base font-semibold text-[#f6f2f2] transition hover:border-[#B4A5A5]/55 hover:bg-[#301B3F]"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <a href={contact.githubUrl} className={linkButtonClass} rel="noopener noreferrer" target="_blank" onClick={closeMobileMenu}>
                  GitHub
                </a>
                <a href={contact.linkedInUrl} className={linkButtonClass} rel="noopener noreferrer" target="_blank" onClick={closeMobileMenu}>
                  LinkedIn
                </a>
                {contact.resumeUrl ? (
                  <a href={contact.resumeUrl} className={linkButtonClass} rel="noopener noreferrer" target="_blank" onClick={closeMobileMenu}>
                    Resume
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div className="h-[73px]" aria-hidden="true" />
    </>
  );
}
