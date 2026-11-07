'use client';
import { Children, isValidElement, useEffect, useRef, type ReactNode } from 'react';

/** Sticky panels match the reference's introduction → archive → course stack. */
export default function ScrollSections({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current!;
    const panels = Array.from(element.querySelectorAll<HTMLElement>('[data-stack-panel]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 70;
      panels.forEach((panel) => {
        const gap = Math.max(0, Math.min(40, panel.getBoundingClientRect().top - header));
        panel.style.setProperty('--stack-corner', `${gap}px`);
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // A sticky panel's current rect no longer represents its original document position.
    // Resolve anchors from the stack's natural panel heights, including backward jumps.
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = link?.getAttribute('href');
      if (!hash || hash === '#' || link?.target === '_blank' || link?.hasAttribute('download'))
        return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 70;
      const panel = target.closest<HTMLElement>('[data-stack-panel]');
      let top = target.getBoundingClientRect().top + scrollY - header - 12;
      if (panel && innerWidth >= 768) {
        top = element.getBoundingClientRect().top + scrollY - header;
        for (const p of panels) {
          if (p === panel) break;
          top += p.offsetHeight;
        }
      }
      history.pushState(null, '', hash);
      window.scrollTo({
        top: Math.max(0, top),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    };
    document.addEventListener('click', navigate);
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', navigate);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
    };
  }, []);
  return (
    <div className="section-stack" ref={root}>
      {Children.toArray(children).map((child, index) => (
        <div
          data-stack-panel
          key={isValidElement(child) ? (child.key ?? index) : index}
          className={`stack-panel stack-panel-${isValidElement<{ id?: string }>(child) ? child.props.id : index}`}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
