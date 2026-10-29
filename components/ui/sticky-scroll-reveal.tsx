"use client";

// Adapted from Aceternity UI's Sticky Scroll Reveal registry component.
// https://ui.aceternity.com/registry/sticky-scroll-reveal-demo.json
import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";

type StickyScrollItem = {
  id: string;
  title: string;
  summary: string;
  description: string;
  content: ReactNode;
  action: ReactNode;
};

export function StickyScroll({ content }: { content: StickyScrollItem[] }) {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const index = Math.min(content.length - 1, Math.floor(progress * content.length));
    setActiveCard(index);
  });

  if (!content.length) return null;

  return <div className="sticky-reveal" ref={ref}>
    <div className="sticky-reveal-copy">
      {content.map((item, index) => <article
        className="sticky-reveal-step"
        data-active={activeCard === index}
        key={item.id}
        aria-labelledby={`product-${item.id}`}
      >
        <motion.h3
          id={`product-${item.id}`}
          animate={{ color: activeCard === index ? "var(--home-foreground)" : "var(--home-muted)" }}
          transition={{ duration: reduceMotion ? 0 : .3 }}
        >{item.title}</motion.h3>
        <p className="sticky-reveal-summary">{item.summary}</p>
        <p className="sticky-reveal-description">{item.description}</p>
        {item.action}
        <div className="sticky-reveal-mobile">{item.content}</div>
      </article>)}
    </div>
    <div className="sticky-reveal-stage" data-active-feature={content[activeCard].id}>
      <motion.div
        key={content[activeCard].id}
        initial={reduceMotion ? false : { opacity: .45, filter: "blur(3px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: .35, ease: [.16, 1, .3, 1] }}
      >{content[activeCard].content}</motion.div>
    </div>
    <nav className="sticky-reveal-progress" aria-label="Secciones del producto">
      {content.map((item, index) => <button
        key={item.id}
        type="button"
        aria-label={`${index + 1} de ${content.length}: ${item.title}`}
        aria-current={activeCard === index ? "step" : undefined}
        onClick={() => document.getElementById(`product-${item.id}`)?.closest("article")?.scrollIntoView({
          behavior: reduceMotion ? "instant" : "smooth", block: "center",
        })}
      ><span aria-hidden="true" /></button>)}
      <span className="sticky-reveal-count" aria-hidden="true">{activeCard + 1}/{content.length}</span>
    </nav>
  </div>;
}
