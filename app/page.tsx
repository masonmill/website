import Image from "next/image";
import Link from "next/link";
import SiteChrome from "./SiteChrome";

export default function Home() {
  return (
    <SiteChrome>
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-24 px-6 pt-[88px] pb-24">
        <section className="flex flex-wrap items-center gap-14">
          <div className="reveal flex min-w-0 flex-[1_1_440px] flex-col gap-7">
            <div className="flex flex-col gap-3.5">
              <span className="mono text-[13px] tracking-[0.02em] text-[#737373]">
                Software Engineer · Apple
              </span>
              <h1 className="m-0 text-[clamp(44px,11vw,64px)] leading-none font-semibold tracking-[-0.04em]">
                Mason Miller
              </h1>
            </div>
            <div className="flex max-w-[560px] flex-col gap-3.5 text-[19px] leading-[1.6] text-pretty text-[#404040]">
              <p>
                Hey! I&apos;m Mason, Software Engineer at Apple and recent{" "}
                <span className="whitespace-nowrap">CS graduate</span> from the University of
                Michigan.
              </p>
              <p>
                I&apos;m broadly interested in the research and development of performant,
                reliable, scalable, and maintainable software systems.
              </p>
              <p>Outside of work, I enjoy rock climbing, playing drum set, and reading.</p>
            </div>
            <div
              className="reveal flex flex-wrap items-center gap-2.5 pt-1"
              style={{ animationDelay: "200ms" }}
            >
              <a
                href="mailto:masonmil@umich.edu"
                className="flex h-10 items-center rounded-full bg-[#0a0a0a] px-4 text-sm font-medium text-white hover:bg-[#262626]"
              >
                Get in touch
              </a>
              <a
                href="https://linkedin.com/in/masonmil"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-2 rounded-full border border-[#e5e5e5] px-3.5 text-sm font-medium hover:border-[#a3a3a3]"
              >
                <Image src="/linkedin.svg" alt="" width={16} height={16} />
                <span>LinkedIn</span>
              </a>
              <Link
                href="/climbing"
                className="flex h-10 items-center gap-2 rounded-full border border-[#e5e5e5] px-3.5 text-sm font-medium hover:border-[#a3a3a3]"
              >
                <span className="size-[7px] rounded-[2px] bg-[#16a34a]" />
                <span>Climbing log</span>
              </Link>
            </div>
          </div>
          <div
            className="reveal min-w-[240px] flex-[0_1_320px]"
            style={{ animationDuration: "900ms", animationDelay: "120ms" }}
          >
            <Image
              src="/headshot.jpg"
              alt="Mason Miller"
              width={640}
              height={640}
              priority
              className="block aspect-square w-full rounded-[20px] bg-[#f5f5f5] object-cover"
            />
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
