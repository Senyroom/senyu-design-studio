'use client';
import { useEffect, useRef, useState } from 'react';
import type { Site } from '../../../packages/contracts/types';

// Keycaps are crops of the same 1536 × 1024 image, so their texture and
// perspective stay aligned with the machine at every responsive scale.
const keycaps = [
  { labels: '1234567890-=↵', x: 272, y: 513, width: 76, height: 66 },
  { labels: 'QWERTYUIOP[]', x: 308, y: 583, width: 77, height: 66 },
  { labels: 'ASDFGHJKL;:', x: 309, y: 654, width: 78, height: 67 },
  { labels: 'ZXCVBNM,./', x: 350, y: 725, width: 79, height: 61 },
  { labels: ' ', x: 299, y: 786, width: 970, height: 76 },
].flatMap((row) =>
  Array.from(row.labels, (label, index) => ({ ...row, label, x: row.x + index * 83 })),
);

export default function CoursePrinter({ site, replay }: { site: Site; replay: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLElement>(null);
  const [state, setState] = useState('waiting');
  useEffect(() => {
    const element = frame.current!;
    const page = paper.current!;
    const chars = Array.from(page.querySelectorAll<HTMLElement>('.print-char'));
    const keys = Array.from(element.querySelectorAll<HTMLElement>('[data-key]'));
    const keyboard = keys[keys.length - 1];
    const image = element.querySelector<HTMLImageElement>('.typewriter')!;
    const striker = element.querySelector<HTMLElement>('.printer-striker')!;
    const animations = new Map<HTMLElement, Animation>();
    const tap = (target: HTMLElement, frames: Keyframe[]) => {
      animations.get(target)?.cancel();
      const animation = target.animate(frames, { duration: 120, easing: 'ease-out' });
      animations.set(target, animation);
    };
    const strike = (index: number) => {
      const char = chars[index]?.textContent?.toUpperCase();
      const key =
        keys.find((key) => key.dataset.key === char) ?? keys[(index * 17 + 7) % (keys.length - 1)];
      tap(key, [
        { transform: 'translateY(0) scaleY(1)', filter: 'brightness(1)' },
        { transform: 'translateY(3px) scaleY(.93)', filter: 'brightness(.8)', offset: 0.35 },
        { transform: 'translateY(0) scaleY(1)', filter: 'brightness(1)' },
      ]);
      tap(striker, [
        { transform: 'rotateX(0deg)' },
        { transform: 'rotateX(-46deg) translateY(-2px)', offset: 0.35 },
        { transform: 'rotateX(0deg)' },
      ]);
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0,
      visible = false,
      done = false,
      elapsed = 0,
      previousTime = 0,
      last = -1;
    const stage = element.closest<HTMLElement>('.course-inner');
    const resize = new ResizeObserver(() => {
      const available = stage ? Math.max(1, stage.clientHeight * 0.92) : 925;
      const scale = Math.min(
        element.clientWidth / 680,
        innerWidth < 768 ? Infinity : available / 925,
      );
      scene.current!.style.transform = `translateX(-50%) scale(${scale})`;
      element.style.height = `${925 * scale}px`;
    });
    resize.observe(element);
    if (stage) resize.observe(stage);
    const reset = () => {
      chars.forEach((c) => (c.style.opacity = '0'));
      page.style.transform = `translateY(${page.offsetHeight - 30}px)`;
    };
    const draw = (time: number) => {
      raf = 0;
      // Hidden tabs must not consume the sequence while no one can see the keys.
      if (previousTime) elapsed += Math.min(time - previousTime, 64);
      previousTime = time;
      const count = reduced ? chars.length : Math.min(chars.length, Math.floor(elapsed / 60));
      if (count !== last) {
        for (let i = Math.max(0, last); i < count; i++) chars[i].style.opacity = '1';
        const current = chars[Math.max(0, count - 1)]?.closest<HTMLElement>('[data-print-line]');
        // The completed line rises above the roller before the next line is typed.
        const printedBottom = current ? current.offsetTop + current.offsetHeight + 22 : 30;
        page.style.transform = `translateY(${Math.max(0, page.offsetHeight - printedBottom)}px)`;
        if (!reduced && count > 0) strike(count - 1);
        last = count;
      }
      if (count < chars.length) raf = requestAnimationFrame(draw);
      else {
        done = true;
        page.style.transform = 'translateY(0px)';
        setState('done');
      }
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      previousTime = 0;
    };
    const start = () => {
      if (done || raf || (!reduced && (!visible || document.hidden || !image.complete))) return;
      setState('printing');
      raf = requestAnimationFrame(draw);
    };
    const onVisibility = () => (document.hidden ? pause() : start());
    setState('waiting');
    reset();
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        if (visible) start();
        else pause();
      },
      { threshold: [0, 0.6] },
    );
    // The space bar is the lowest key: wait until the whole keyboard is in view.
    observer.observe(keyboard);
    image.addEventListener('load', start);
    document.addEventListener('visibilitychange', onVisibility);
    if (reduced) start();
    return () => {
      pause();
      animations.forEach((animation) => animation.cancel());
      image.removeEventListener('load', start);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      resize.disconnect();
    };
  }, [
    site.courseTitle,
    site.courseHighlight,
    site.courseIntro,
    site.courseMethod,
    site.courseStats,
    site.courseImage,
    replay,
  ]);

  const text = (value: string) => (
    <>
      {Array.from(value).map((char, i) => (
        <span className="print-char" key={i}>
          {char}
        </span>
      ))}
    </>
  );
  const content = (animated: boolean) => (
    <>
      <div className="paper-edition" data-print-line>
        {animated ? text('VIBEDESIGN / COURSE NO. 01') : 'VIBEDESIGN / COURSE NO. 01'}
      </div>
      <h3 data-print-line>
        {animated
          ? text(site.courseTitle + site.courseHighlight)
          : site.courseTitle + site.courseHighlight}
      </h3>
      <div className="paper-section">
        <h4 data-print-line>{animated ? text('01 / 这门课讲什么？') : '01 / 这门课讲什么？'}</h4>
        {site.courseIntro.map((t, i) => (
          <p data-print-line key={i}>
            {animated ? text(t) : t}
          </p>
        ))}
      </div>
      <div className="paper-section">
        <h4 data-print-line>{animated ? text('02 / 这门课怎么学？') : '02 / 这门课怎么学？'}</h4>
        {site.courseMethod.split('\n').map((t, i) => (
          <p data-print-line key={i}>
            {animated ? text(t) : t}
          </p>
        ))}
      </div>
      <div className="paper-stats">
        {site.courseStats.split('｜').map((t, i) => (
          <span data-print-line key={i}>
            {animated ? text(t) : t}
          </span>
        ))}
      </div>
    </>
  );
  return (
    <div id="course-printout" className="printer-rig" tabIndex={-1}>
      <article className="course-readable-summary">{content(false)}</article>
      <div className="printer-frame" ref={frame} data-print-state={state}>
        <div className="printer-scene" ref={scene}>
          <div className="paper-window">
            <article className="course-paper" ref={paper} aria-hidden="true">
              {content(true)}
            </article>
          </div>
          <div className="printer-machine">
            <img
              className="typewriter"
              src={site.courseImage}
              alt="奶油白与浅紫色复古打字机，课程介绍从滚轴后逐行升起"
              loading="lazy"
            />
            <span className="printer-striker" aria-hidden="true" />
            <div className="printer-keys" aria-hidden="true">
              {keycaps.map(({ label, x, y, width, height }) => (
                <i
                  key={label}
                  data-key={label}
                  style={{
                    left: `${(x / 1536) * 100}%`,
                    top: `${(y / 1024) * 100}%`,
                    width: `${(width / 1536) * 100}%`,
                    height: `${(height / 1024) * 100}%`,
                    backgroundImage: `url(${JSON.stringify(site.courseImage)})`,
                    backgroundSize: `${(1536 / width) * 100}% ${(1024 / height) * 100}%`,
                    backgroundPosition: `${(x / (1536 - width)) * 100}% ${(y / (1024 - height)) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
