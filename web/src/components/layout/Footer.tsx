import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";
import { NAV } from "@/lib/nav";

import { Container } from "./Container";
import { Wordmark } from "./Wordmark";

/** LinkedIn glyph — lucide v1 ships no brand icons, so it is drawn inline. */
function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.71h.05c.53-.95 1.83-1.96 3.76-1.96C21.4 8.75 22 11 22 14.1V21h-4v-6.1c0-1.46-.03-3.33-2.06-3.33-2.06 0-2.38 1.58-2.38 3.22V21h-3.9V9Z" />
    </svg>
  );
}

/** YouTube glyph, drawn inline for the same reason. */
function YouTubeMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.83.42A2.51 2.51 0 0 0 2.4 7.2 26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .4 4.8 2.51 2.51 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.83-.42a2.51 2.51 0 0 0 1.77-1.78A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.4-4.8ZM10 15.02V8.98L15.2 12 10 15.02Z" />
    </svg>
  );
}

const SOCIAL = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/ryan-roland-dabao-55416187",
    mark: LinkedInMark,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@RyanRolandDabao",
    mark: YouTubeMark,
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-hairline bg-surface">
      <Container width="wide" className="py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,17rem)_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A free, open-source Amazon PPC toolkit for Filipino virtual assistants moving into
              specialist roles. Quizzes, SOPs, workflows, templates and real account case studies.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIAL.map(({ label, href, mark: Mark }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${label} — Ryan Roland Dabao`}
                  className="inline-flex size-11 items-center justify-center rounded-lg border border-hairline text-muted transition-colors hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <Mark />
                </a>
              ))}
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:gap-x-8"
          >
            {NAV.map((group) => (
              <div key={group.id}>
                <h2 className="font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
                  {group.label}
                </h2>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded text-sm text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <AddToHomeScreen variant="footer" className="mt-10" />

        <div className="mt-12 border-t border-hairline pt-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm text-ink">
                Built by{" "}
                <a
                  href="https://linkedin.com/in/ryan-roland-dabao-55416187"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                >
                  Ryan Roland Dabao
                </a>{" "}
                — Amazon PPC Lead Manager and VA coach in Iloilo City, Philippines.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-faint">
                10+ years of remote eCommerce, 6+ years on Amazon Advertising, ad budgets up to
                $500K/month across home decor, toys, consumables, supplements, cosmetics,
                sportswear and automotive.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-xs text-faint lg:items-end">
              <a
                href="https://projectamazonph-courses.netlify.app"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                ProjectAmazonPH coaching
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
              <p>
                Content and code released under the MIT License. Credit the source when you share
                it.
              </p>
              <p className="tabular">© {year} PPC Academy</p>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
