export type PortfolioContact = {
  email: string;
  emailHref: string;
  githubUrl: string;
  linkedInUrl: string;
  resumeUrl: string | null;
};

function requiredEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function contactEmailHref(email: string): string {
  return email.startsWith("mailto:") ? email : `mailto:${email}`;
}

export function getPortfolioContact(): PortfolioContact {
  const email = requiredEnv("NEXT_PUBLIC_PORTFOLIO_EMAIL", "admin@ethan-pt.dev");

  return {
    email,
    emailHref: contactEmailHref(email),
    githubUrl: requiredEnv("NEXT_PUBLIC_GITHUB_URL", "https://github.com/ethan-pt"),
    linkedInUrl: requiredEnv("NEXT_PUBLIC_LINKEDIN_URL", "https://www.linkedin.com/in/ethantubbe"),
    resumeUrl: requiredEnv("NEXT_PUBLIC_RESUME_URL", "./software-main.pdf"),
  };
}
