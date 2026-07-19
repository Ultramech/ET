"use client";
import { useEffect, useRef } from "react";

/**
 * DragScroll — wraps a horizontal scroll container and enables
 * mouse drag-to-scroll in addition to native touch scroll.
 * variant="row"    → single-row flex  (.scroll-row)
 * variant="grid2"  → 2-row column grid (.scroll-grid-2)
 */
export function DragScroll({
  children,
  className,
  variant = "row",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "row" | "grid2";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add("drag-scroll-active");
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onMouseLeave = () => { isDown = false; el.classList.remove("drag-scroll-active"); };
    const onMouseUp    = () => { isDown = false; el.classList.remove("drag-scroll-active"); };
    const onMouseMove  = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX) * 1.5;
    };

    el.addEventListener("mousedown",  onMouseDown);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mouseup",    onMouseUp);
    el.addEventListener("mousemove",  onMouseMove);

    return () => {
      el.removeEventListener("mousedown",  onMouseDown);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mouseup",    onMouseUp);
      el.removeEventListener("mousemove",  onMouseMove);
    };
  }, []);

  const base = variant === "grid2" ? "scroll-grid-2" : "scroll-row";

  return (
    <div ref={ref} className={`${base} ${className ?? ""}`}>
      {children}
    </div>
  );
}
