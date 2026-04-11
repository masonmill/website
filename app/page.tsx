"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { FileText, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const [climbHovered, setClimbHovered] = useState(false);

  return (
    <main className="flex items-center justify-center min-h-screen px-4 py-8 pb-24 sm:py-6 sm:pb-32">
      <motion.div
        className="flex flex-col sm:flex-row gap-5 items-center sm:items-start max-w-2xl w-full"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Photo */}
        <div className="shrink-0">
          <Image
            src="/headshot.jpg"
            alt="Mason Miller"
            width={112}
            height={112}
            className="rounded-full object-cover"
            priority
          />
        </div>

        {/* Name + icons + bio */}
        <div className="flex flex-col gap-4 pt-1 items-center sm:items-start text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Mason Miller</h1>
            <div className="icon-links flex items-center gap-4 text-gray-500">
              <Link href="mailto:masonmil@umich.edu" aria-label="Email" className="hover:text-blue-600">
                <Mail size={22} />
              </Link>
              <Link href="https://github.com/masonmill" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="opacity-60 hover:opacity-100">
                <Image src="/github.svg" alt="GitHub" width={22} height={22} className="svg-icon" />
              </Link>
              <Link href="https://linkedin.com/in/masonmil" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="opacity-60 hover:opacity-100">
                <Image src="/linkedin.svg" alt="LinkedIn" width={22} height={22} className="svg-icon" />
              </Link>
              <Link href="/resume.pdf" target="_blank" rel="noopener noreferrer" aria-label="Resume" className="hover:text-blue-600">
                <FileText size={22} />
              </Link>
            </div>
          </div>
          <motion.div
            className="text-lg sm:text-xl leading-relaxed flex flex-col gap-3"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.2 }}
          >
            <FadeIn>
              <p>I&apos;m a CS student at the University of Michigan, focused on software systems.</p>
            </FadeIn>
            <FadeIn>
              <p>I&apos;m interested in storage systems, high-performance I/O, and distributed systems — primarily in C and C++.</p>
            </FadeIn>
            <FadeIn>
              <p>
                This summer, I&apos;m joining{" "}
                <Link
                  href="https://www.citadel.com/"
                  className="brand-link text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Citadel
                </Link>
                {" "}in New York.
              </p>
            </FadeIn>
          </motion.div>
        </div>
      </motion.div>

      <Link href="/climbing" aria-label="Climbing log" className="fixed bottom-6 right-6">
        <motion.span
          className="text-3xl cursor-pointer select-none block"
          initial={{ opacity: 0.15 }}
          animate={{
            opacity: climbHovered ? 1 : 0.15,
            y: climbHovered ? [0, -8, 0] : 0,
          }}
          transition={
            climbHovered
              ? { opacity: { duration: 0.15 }, y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } }
              : { opacity: { duration: 0.3 }, y: { duration: 0.2 } }
          }
          onHoverStart={() => setClimbHovered(true)}
          onHoverEnd={() => setClimbHovered(false)}
        >
          🧗
        </motion.span>
      </Link>
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
