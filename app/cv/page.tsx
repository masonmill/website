import type { Metadata } from "next";
import SiteChrome from "../SiteChrome";

export const metadata: Metadata = {
  title: "CV — Mason Miller",
};

type Entry = {
  org: string;
  role?: string;
  dates: string;
  detail?: string;
  bullets: React.ReactNode[];
};

const EDUCATION: Entry[] = [
  {
    org: "University of Michigan",
    role: "B.S. in Computer Science, with Distinction",
    dates: "Aug 2022 – May 2026",
    detail: "GPA: 3.88/4.00",
    bullets: [
      <>
        <b>Coursework:</b> Advanced Operating Systems (graduate), Operating Systems, Distributed
        Systems, Computer Architecture, Computer Organization, Theory of Computation, Web Systems
      </>,
    ],
  },
];

const RESEARCH: Entry[] = [
  {
    org: "Ordered Systems Lab, University of Michigan",
    role: "Undergraduate Research Assistant",
    dates: "May 2024 – May 2026",
    detail: "Advisor: Prof. Ryan (Peng) Huang",
    bullets: [
      <>
        <b>DistDebug-Bench:</b> Co-authored a benchmark of 120 real-world bugs from 11 production
        distributed systems (e.g., Ray, Kubernetes, ZooKeeper) that tests whether LLM agents can
        find root causes in code
      </>,
      "As one of three annotators, collected and annotated every Ray bug, standardized the annotation schema, and audited labels suite-wide",
      <>
        Evaluated state-of-the-art agents and analyzed traces, finding that agents reach the right
        component but commit early to the first plausible explanation (<i>tunnel vision</i>)
      </>,
      <>
        <b>Cirdan:</b> Contributed to a harness that keeps competing hypotheses open in a tree,
        raising block coverage by up to 22.7 points; built Docker test environments and
        context-injection pipelines, and prototyped a fresh-context evaluator agent
      </>,
    ],
  },
  {
    org: "Boyle Lab, Michigan Medicine",
    role: "Undergraduate Research Assistant",
    dates: "May 2023 – Aug 2023",
    detail: "Advisor: Prof. Alan P. Boyle, Computational Medicine and Bioinformatics",
    bullets: [
      "Sped up a nanopore sequencing analysis pipeline by porting it from Python to C/C++ with the NCBI C++ Toolkit, supporting a study linking mobile element insertions to Alzheimer's disease",
    ],
  },
];

const INDUSTRY: Entry[] = [
  {
    org: "Apple",
    role: "Software Engineer, Siri Runtime Systems and Interaction",
    dates: "Oct 2026 – Present",
    bullets: ["Research and evaluation work to improve Siri model performance"],
  },
  {
    org: "Citadel",
    role: "Software Engineer Intern, Electronic Trading Engineering Core",
    dates: "Jun 2026 – Aug 2026",
    bullets: [
      "Prototyped fast state recovery for trading applications",
      "Built a distributed service for sharing reference data across trading applications",
    ],
  },
  {
    org: "Apple",
    role: "Software Engineer Intern, CoreOS Storage Device Drivers",
    dates: "May 2025 – Aug 2025",
    bullets: ["Built user-space testing and fuzzing infrastructure for kernel storage drivers"],
  },
  {
    org: "Qumulo",
    role: "Member of Technical Staff Intern, Cloud Read Cache",
    dates: "Jan 2025 – Apr 2025",
    bullets: ["Worked on cloud cluster cost reduction and distributed caching"],
  },
];

const PROJECTS: Entry[] = [
  {
    org: "Virtual Memory Pager",
    role: "C++",
    dates: "Operating Systems",
    bullets: ["Pager for swap- and file-backed virtual memory with clock eviction and deferred zero-filling and copying"],
  },
  {
    org: "Sharded Key/Value Store with Paxos Groups",
    role: "Go",
    dates: "Distributed Systems",
    bullets: ["Fault-tolerant key/value store sharded across Paxos groups, with linearizable two-phase shard handoff"],
  },
  {
    org: "Multiprocessor Thread Library",
    role: "C++",
    dates: "Operating Systems",
    bullets: ["Preemptive multiprocessor thread library with mutexes, condition variables, and a shared scheduler"],
  },
  {
    org: "Concurrent Network File Server",
    role: "C/C++",
    dates: "Operating Systems",
    bullets: ["Multi-threaded TCP file server with hand-over-hand reader-writer locking and crash-consistent disk writes"],
  },
];

const TEACHING: Entry[] = [
  {
    org: "University of Michigan",
    role: "Instructional Assistant, Distributed Systems (EECS 491)",
    dates: "Jan 2026 – May 2026",
    detail: "Instructor: Prof. Brian Noble",
    bullets: ["Taught Paxos, replication, and sharding in weekly lab sections and office hours 7–12 hours/week"],
  },
  {
    org: "University of Michigan",
    role: "Instructional Assistant, Operating Systems (EECS 482)",
    dates: "Aug 2025 – Dec 2025",
    detail: "Instructor: Prof. Peter Chen",
    bullets: ["Mentored students on threads, virtual memory, and file systems in office hours 5–10 hours/week"],
  },
];

const HONORS = [
  {
    title: "James B. Angell Scholar",
    detail: "University of Michigan, two or more consecutive terms of all-A grades",
    date: "2024, 2026",
  },
  {
    title: "William J. Branstrom Freshman Prize",
    detail: "University of Michigan, top 5% of the first-year class",
    date: "2023",
  },
];

const SKILLS: [string, string][] = [
  ["Languages", "C++, C, Python, Go, SQL, Bash"],
  ["Systems", "Linux, virtual memory (mmap, huge pages, copy-on-write), custom allocators, XNU/IOKit, io_uring"],
  ["Distributed", "gRPC, replication, sharding, Paxos, Raft, TCP/IP, Kubernetes, Docker, GCP, AWS, Azure"],
  ["ML and Agents", "model evaluation, training data synthesis, ablation studies, LLM agent harnesses, Claude Code"],
  ["Testing and Debugging", "GDB, fuzzing, fault injection, AddressSanitizer, Valgrind, QEMU"],
];

const PUB_LINKS = [
  { label: "OpenReview", href: "https://openreview.net/forum?id=Pbjabxdt5U" },
  { label: "arXiv", href: "https://arxiv.org/abs/2611.03523" },
  { label: "Code", href: "https://github.com/OrderLab/distdebug-bench" },
  { label: "Website", href: "https://distdebug.com" },
];

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <section
      className="reveal grid gap-4 border-t border-[#0a0a0a] pt-5 md:grid-cols-[200px_1fr] md:gap-8"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
      <div className="flex min-w-0 flex-col gap-7">{children}</div>
    </section>
  );
}

function EntryView({ entry }: { entry: Entry }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span className="text-base font-medium">{entry.org}</span>
          <span className="mono text-[13px] whitespace-nowrap text-[#737373]">{entry.dates}</span>
        </div>
        {entry.role && <span className="text-[15px] text-[#404040]">{entry.role}</span>}
        {entry.detail && <span className="text-[13px] text-[#737373]">{entry.detail}</span>}
      </div>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.6] text-[#404040] marker:text-[#a3a3a3]">
        {entry.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

export default function CVPage() {
  const sections: [string, Entry[]][] = [
    ["Research Experience", RESEARCH],
    ["Industry Experience", INDUSTRY],
    ["Selected Projects", PROJECTS],
    ["Teaching Experience", TEACHING],
  ];
  let delay = 120;
  const next = () => (delay += 60);

  return (
    <SiteChrome>
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-12 px-6 pt-[72px] pb-16">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3.5">
            <span className="mono text-[13px] text-[#737373]">Curriculum vitae</span>
            <h1 className="m-0 text-[clamp(40px,10vw,56px)] leading-none font-semibold tracking-[-0.04em]">
              CV
            </h1>
          </div>
        </div>

        <Section title="Research Interests" delay={next()}>
          <p className="m-0 max-w-[640px] text-[15px] leading-[1.6] text-pretty text-[#404040]">
            Operating systems and distributed systems: in specialized systems, what the runtime should
            manage automatically vs. what applications should control explicitly, especially for
            memory and state management.
          </p>
        </Section>

        <Section title="Education" delay={next()}>
          {EDUCATION.map((e) => (
            <EntryView key={e.org} entry={e} />
          ))}
        </Section>

        <Section title="Publications" delay={next()}>
          <div className="flex flex-col gap-1.5 text-[15px] leading-[1.6] text-[#404040]">
            <span className="text-base font-medium text-[#0a0a0a]">
              DistDebug-Bench: Can LLM Agents Diagnose Bugs in Distributed Systems?
            </span>
            <span>
              Y. Jiang, C. Liu, J. Rose, <b className="text-[#0a0a0a]">M. Miller</b>, R. Thavamani,
              J. Wu, Y. Huang, J. Xu, P. Huang
            </span>
            <span className="text-[13px] text-[#737373] italic">
              NeurIPS 2026, Evaluations &amp; Datasets Track
            </span>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {PUB_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 items-center rounded-full border border-[#e5e5e5] px-2.5 text-xs font-medium hover:border-[#a3a3a3]"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </Section>

        {sections.map(([title, entries]) => (
          <Section key={title} title={title} delay={next()}>
            {entries.map((e) => (
              <EntryView key={`${e.org}-${e.role}`} entry={e} />
            ))}
          </Section>
        ))}

        <Section title="Honors and Awards" delay={next()}>
          {HONORS.map((h) => (
            <div key={h.title} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-medium">{h.title}</span>
                <span className="text-[13px] text-[#737373]">{h.detail}</span>
              </div>
              <span className="mono text-[13px] text-[#737373]">{h.date}</span>
            </div>
          ))}
        </Section>

        <Section title="Technical Skills" delay={next()}>
          <dl className="m-0 grid gap-x-6 gap-y-3 text-[15px] leading-[1.6] sm:grid-cols-[180px_1fr]">
            {SKILLS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium">{k}</dt>
                <dd className="m-0 text-[#404040]">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </main>
    </SiteChrome>
  );
}
