"use client";

// Adapted from Aceternity UI's Sticky Scroll Reveal registry component.
// https://ui.aceternity.com/registry/sticky-scroll-reveal-demo.json
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useScroll, useTransform, type MotionValue } from "motion/react";

type StickyScrollItem = {
  id: string;
  title: string;
  summary: string;
  description: string;
  content: ReactNode;
  action: ReactNode;
};

type Reveal = { index: number; opacity: number } | null;

function useStepOpacity(reveal: MotionValue<Reveal>, index: number) {
  return useTransform(reveal, (value) => value === null ? 1 : value.index === index ? value.opacity : 0);
}

function ProductStep({ item, index, active, reveal }: {
  item: StickyScrollItem;
  index: number;
  active: boolean | undefined;
  reveal: MotionValue<Reveal>;
}) {
  const opacity = useStepOpacity(reveal, index);
  return (
    <motion.article
      className="sticky-reveal-step"
      data-active={active}
      inert={active === false}
      aria-labelledby={`product-${item.id}`}
      style={{ opacity }}
    >
      <h3 id={`product-${item.id}`}>{item.title}</h3>
      <p className="sticky-reveal-summary">{item.summary}</p>
      <p className="sticky-reveal-description">{item.description}</p>
      {item.action}
      <div className="sticky-reveal-mobile">{item.content}</div>
    </motion.article>
  );
}

function ProductFrame({ item, index, reveal }: { item: StickyScrollItem; index: number; reveal: MotionValue<Reveal> }) {
  const opacity = useStepOpacity(reveal, index);
  const visibility = useTransform(opacity, (value) => value > 0 ? "visible" : "hidden");
  return <motion.div className="sticky-reveal-frame" style={{ opacity, visibility }}>{item.content}</motion.div>;
}

export function StickyScroll({ content }: { content: StickyScrollItem[] }) {
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const reveal = useMotionValue<Reveal>(null);
  const { scrollY } = useScroll();
  const count = content.length;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !count) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>(".sticky-reveal-step"));
    let centers: number[] = [];
    let viewportMiddle = 0;
    let active = -1;

    function update(scroll: number) {
      const viewportCenter = scroll + viewportMiddle;
      let index = 0;
      while (index < centers.length - 1 && viewportCenter >= (centers[index] + centers[index + 1]) / 2) index++;

      const distance = viewportCenter - centers[index];
      const neighbor = centers[index + (distance < 0 ? -1 : 1)];
      const range = neighbor === undefined ? viewportMiddle * 0.7 : Math.abs(neighbor - centers[index]) / 2;
      const fraction = Math.min(1, Math.max(0, (Math.abs(distance) / Math.max(1, range) - 0.22) / 0.78));
      reveal.set({ index, opacity: 1 - fraction * fraction * (3 - 2 * fraction) });

      if (index !== active) {
        active = index;
        setActiveCard(index);
      }
    }

    function measure() {
      const scroll = window.scrollY;
      viewportMiddle = window.innerHeight / 2;
      const lastReachableCenter = document.documentElement.scrollHeight - viewportMiddle;
      centers = steps.map((step, index) => {
        const { top, height } = step.getBoundingClientRect();
        const center = top + scroll + height / 2;
        return index === steps.length - 1 ? Math.min(center, lastReachableCenter) : center;
      });
      update(scroll);
    }

    measure();
    const unsubscribe = scrollY.on("change", update);
    const resize = new ResizeObserver(measure);
    steps.forEach((step) => resize.observe(step));
    window.addEventListener("resize", measure);
    return () => {
      unsubscribe();
      resize.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [count, reveal, scrollY]);

  if (!count) return null;
  const selected = activeCard ?? 0;
  const item = content[selected];

  function goTo(index: number) {
    const step = ref.current?.querySelectorAll(".sticky-reveal-step")[index];
    step?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "center",
    });
  }

  return (
    <div className="sticky-reveal" ref={ref}>
      <nav className="sticky-reveal-progress" aria-label="Secciones del producto">
        <div className="sticky-reveal-track">
          {content.map((step, index) => (
            <button
              key={step.id}
              type="button"
              aria-label={`${index + 1} de ${count}, ${step.title}`}
              aria-current={selected === index ? "step" : undefined}
              onClick={() => goTo(index)}
            ><span aria-hidden="true" /></button>
          ))}
        </div>
      </nav>
      <div className="sticky-reveal-copy">
        {content.map((step, index) => (
          <ProductStep key={step.id} item={step} index={index} active={activeCard === null ? undefined : selected === index} reveal={reveal} />
        ))}
      </div>
      <div className="sticky-reveal-stage" data-active-feature={item.id}>
        <ProductFrame key={item.id} item={item} index={selected} reveal={reveal} />
      </div>
    </div>
  );
}
