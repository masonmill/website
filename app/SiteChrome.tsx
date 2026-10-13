"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "About" },
  { href: "/climbing", label: "Climbing" },
];

/** Shared header and footer for the public pages (home and /climbing). */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="site">
      <header className="sticky top-0 z-10 border-b border-[#f0f0f0] bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-[1040px] items-center justify-between gap-4 px-6">
          <Link href="/" className="text-[15px] font-semibold tracking-[-0.01em]">
            Mason Miller
          </Link>
          <div className="flex items-center gap-1 text-sm">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-2 font-medium hover:text-[#0a0a0a] ${
                    active ? "bg-[#f5f5f5] text-[#0a0a0a]" : "text-[#737373]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 font-medium text-[#737373] hover:text-[#0a0a0a]"
            >
              Resume
            </a>
          </div>
        </nav>
      </header>

      {children}

      <footer className="border-t border-[#f0f0f0]">
        <div className="mx-auto flex max-w-[1040px] flex-wrap justify-between gap-3 p-6 text-[13px] text-[#737373]">
          <span>© {new Date().getFullYear()} Mason Miller</span>
          <div className="flex gap-4">
            <a href="mailto:masonmil@umich.edu" className="hover:text-[#0a0a0a]">
              Email
            </a>
            <a
              href="https://linkedin.com/in/masonmil"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0a0a0a]"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
