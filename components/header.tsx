import { HeaderNav } from "@/components/header-nav";
import type { PortfolioContact } from "@/lib/portfolio-contact";

type HeaderProps = {
  contact: PortfolioContact;
};

export function Header({ contact }: HeaderProps) {
  return <HeaderNav contact={contact} />;
}
