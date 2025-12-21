"use client";

import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "motion/react";
import Link from "next/link";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const background = useTransform(
    scrollYProgress,
    [0, 1],
    ["#ffffff", "#f0f4ff"]
  );

  useMotionValueEvent(background, "change", (val) => {
    document.body.style.background = val;
  });

  return (
    <main className="flex flex-col px-8 pt-24 pb-12 space-y-10 min-h-screen relative">
      <motion.div className="w-full max-w-3xl mx-auto">
        <motion.div
          className="flex justify-between items-center flex-wrap gap-y-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">Mason Miller</h1>
          <div className="flex flex-wrap justify-end gap-4 text-lg text-gray-700">
            <Link
              href="mailto:masonmil@umich.edu"
              className="hover:text-blue-600 hover:underline"
            >
              Email
            </Link>
            <Link
              href="https://github.com/masonmill"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 hover:underline"
            >
              GitHub
            </Link>
            <Link
              href="https://linkedin.com/in/masonmil"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 hover:underline"
            >
              LinkedIn
            </Link>
            <Link
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 hover:underline"
            >
              Resume
            </Link>
          </div>
        </motion.div>
      </motion.div>

      <motion.section
        className="w-full max-w-3xl text-left mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ staggerChildren: 0.2 }}
      >
        <FadeIn>
          <div className="space-y-6 text-lg">
            <p className="mt-0">Hello!</p>
            <p>
              I&apos;m a student at the University of Michigan studying Computer
              Science. Currently, I work with Professor Brian Noble as an
              Instructional Assistant for EECS 491: Intro to Distributed
              Systems, and as a Research Assistant with the{" "}
              <Link
                href="https://orderlab.io/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ordered Systems Lab
              </Link>{" "}
              led by Professor Ryan Huang.
            </p>
            <p>
              Previously, I worked with Professor Peter Chen as an Instructional
              Assistant for EECS 482: Intro to Operating Systems. I also have
              Software Engineering experience at{" "}
              <Link
                href="https://qumulo.com/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Qumulo
              </Link>
              , a startup in Seattle, and{" "}
              <Link
                href="https://www.apple.com/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apple
              </Link>{" "}
              with their CoreOS organization in Cupertino. Next summer, I will
              move to New York City to intern with{" "}
              <Link
                href="https://www.citadel.com/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Citadel
              </Link>
              .
            </p>
          </div>
        </FadeIn>
      </motion.section>
    </main>
  );
}

function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  );
}
