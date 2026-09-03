"use client";

import { useEffect, useRef } from "react";

/*
 * Decorative, non-interactive background: a handful of Nikolaus / Knecht
 * Ruprecht cut-outs drifting slowly and bouncing off the viewport edges,
 * well behind the page content and barely there. Purely visual — hidden from
 * assistive tech and disabled for `prefers-reduced-motion`.
 *
 * The same markup renders on the server and the first client paint (no
 * hydration mismatch). Positioning waits until the fixed layer actually has a
 * size, so it also survives being mounted while hidden (e.g. a dev preview).
 */

type Sprite = { src: string; size: number; opacity: number };

const SPRITES: Sprite[] = [
  { src: "/float-nikolaus.png", size: 208, opacity: 0.09 },
  { src: "/float-ruprecht.png", size: 176, opacity: 0.08 },
  { src: "/float-nikolaus.png", size: 116, opacity: 0.07 },
  { src: "/float-ruprecht.png", size: 96, opacity: 0.06 },
  { src: "/float-nikolaus.png", size: 150, opacity: 0.08 },
  { src: "/float-ruprecht.png", size: 132, opacity: 0.07 },
];

// On phones keep only the first four, smaller, so it never feels busy.
const MOBILE_KEEP = 4;
const MOBILE_SCALE = 0.62;

type Item = {
  el: HTMLImageElement;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
};

export default function FloatingBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const all = Array.from(root.children) as HTMLImageElement[];
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let items: Item[] = [];
    let ready = false;

    const paint = (it: Item, wobble = 0) => {
      it.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${(
        it.y + wobble
      ).toFixed(1)}px, 0)`;
    };

    // Lay the sprites out on a jittered grid once the layer has real size.
    const init = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (w < 2 || h < 2) return false;

      const mobile = w < 640;
      const keep = mobile ? MOBILE_KEEP : all.length;
      const scale = mobile ? MOBILE_SCALE : 1;
      const cols = Math.ceil(Math.sqrt(keep));
      const rows = Math.ceil(keep / cols);

      items = [];
      all.forEach((el, i) => {
        if (i >= keep) {
          el.hidden = true;
          return;
        }
        el.hidden = false;
        const size = Math.round(SPRITES[i].size * scale);
        el.style.width = `${size}px`;

        const cellW = w / cols;
        const cellH = h / rows;
        const cx = (i % cols) * cellW;
        const cy = Math.floor(i / cols) * cellH;
        const clamp = (v: number, max: number) =>
          Math.min(Math.max(0, v), Math.max(0, max));

        const angle = Math.random() * Math.PI * 2;
        const speed = 11 + Math.random() * 13; // px/s — slow drift, calm
        const it: Item = {
          el,
          size,
          x: clamp(cx + Math.random() * Math.max(1, cellW - size), w - size),
          y: clamp(cy + Math.random() * Math.max(1, cellH - size), h - size),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          phase: Math.random() * Math.PI * 2,
        };
        items.push(it);
        paint(it);
      });

      ready = true;
      return true;
    };

    const ro = new ResizeObserver(() => {
      if (!ready) {
        init();
        return;
      }
      const w = root.clientWidth;
      const h = root.clientHeight;
      for (const it of items) {
        it.x = Math.min(Math.max(0, it.x), Math.max(0, w - it.size));
        it.y = Math.min(Math.max(0, it.y), Math.max(0, h - it.size));
        paint(it);
      }
    });
    ro.observe(root);
    init();

    if (reduce) {
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!ready && !init()) return;

      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      const w = root.clientWidth;
      const h = root.clientHeight;
      if (w < 2 || h < 2) return;

      for (const it of items) {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.phase += dt;

        if (it.x <= 0) {
          it.x = 0;
          it.vx = Math.abs(it.vx);
        } else if (it.x + it.size >= w) {
          it.x = w - it.size;
          it.vx = -Math.abs(it.vx);
        }
        if (it.y <= 0) {
          it.y = 0;
          it.vy = Math.abs(it.vy);
        } else if (it.y + it.size >= h) {
          it.y = h - it.size;
          it.vy = -Math.abs(it.vy);
        }

        paint(it, Math.sin(it.phase * 0.7) * 3);
      }
    };

    const onVisible = () => {
      if (!document.hidden) last = 0; // avoid a jump after the tab was hidden
    };
    document.addEventListener("visibilitychange", onVisible);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {SPRITES.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={s.src}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute left-0 top-0 max-w-none select-none will-change-transform"
          style={{ width: s.size, opacity: s.opacity }}
        />
      ))}
    </div>
  );
}
