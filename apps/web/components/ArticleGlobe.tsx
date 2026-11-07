'use client';
import { useEffect, useRef } from 'react';
import type { Article, Category } from '../../../packages/contracts/types';

const href = (a: Article) => (a.type === 'EXTERNAL' ? a.url : `/articles/${a.slug}`);
export default function ArticleGlobe({
  articles,
  categories,
  highlighted,
  onHighlight,
}: {
  articles: Article[];
  categories: Category[];
  highlighted: string | null;
  onHighlight: (id: string | null) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const items = useRef<(HTMLAnchorElement | null)[]>([]);
  const angle = useRef({ x: -0.18, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const moved = useRef(false),
    hovered = useRef(false);
  useEffect(() => {
    const box = root.current!,
      surface = canvas.current!,
      ctx = surface.getContext('2d');
    if (!ctx) return;
    let raf = 0,
      visible = false,
      last = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    observer.observe(box);
    const points = articles.map((_, i) => {
      const phi = Math.acos(-1 + (2 * (i + 0.5)) / articles.length),
        theta = Math.PI * (3 - Math.sqrt(5)) * i;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      };
    });
    const edges: [number, number][] = [];
    points.forEach((p, i) => {
      points
        .map((q, j) => ({ j, distance: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
        .filter((q) => q.j !== i)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .forEach((q) => {
          if (q.j > i) edges.push([i, q.j]);
        });
    });
    const resize = new ResizeObserver(() => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      surface.width = box.clientWidth * ratio;
      surface.height = box.clientHeight * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    });
    resize.observe(box);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < 30) return;
      const dt = Math.min((now - (last || now)) / 16.67, 3);
      last = now;
      if (!drag.current) {
        angle.current.x += velocity.current.x * dt;
        angle.current.y += (velocity.current.y + (!reduced && !hovered.current ? 0.0015 : 0)) * dt;
        velocity.current.x *= Math.pow(0.94, dt);
        velocity.current.y *= Math.pow(0.94, dt);
      }
      const w = box.clientWidth,
        h = box.clientHeight,
        radius = Math.min(w, h) * 0.45;
      const cy = Math.cos(angle.current.y),
        sy = Math.sin(angle.current.y),
        cx = Math.cos(angle.current.x),
        sx = Math.sin(angle.current.x);
      const project = (p: { x: number; y: number; z: number }) => {
        const x = p.x * cy + p.z * sy,
          z = -p.x * sy + p.z * cy,
          y = p.y * cx - z * sx,
          depth = p.y * sx + z * cx;
        return {
          x: w / 2 + x * radius,
          y: h / 2 + y * radius,
          z: depth,
          scale: 0.78 + (depth + 1) * 0.18,
        };
      };
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 0.8;
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        for (let k = 0; k <= 100; k++) {
          const t = (k * Math.PI * 2) / 100;
          const p = project(
            ring === 0
              ? { x: Math.cos(t), y: Math.sin(t), z: 0 }
              : ring === 1
                ? { x: Math.cos(t), y: 0, z: Math.sin(t) }
                : { x: 0, y: Math.cos(t), z: Math.sin(t) },
          );
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(154,134,191,0.18)';
        ctx.stroke();
      }
      const projected = points.map(project);
      for (const [i, j] of edges) {
        const a = projected[i],
          b = projected[j];
        ctx.strokeStyle = `rgba(154,134,191,${0.06 + (a.z + b.z + 2) * 0.035})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      projected.forEach((p, i) => {
        const el = items.current[i];
        if (!el) return;
        el.style.transform = `translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${p.scale})`;
        el.style.opacity = String(0.57 + (p.z + 1) * 0.21);
        el.style.zIndex = String(Math.round((p.z + 1) * 20));
      });
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
    };
  }, [articles]);
  return (
    <div className="globe-wrap" data-dense={articles.length > 35 || undefined}>
      <div
        ref={root}
        className="article-globe"
        tabIndex={0}
        aria-label="文章星球，拖动旋转，点击阅读，方向键旋转"
        onPointerEnter={() => (hovered.current = true)}
        onPointerLeave={() => {
          hovered.current = false;
          onHighlight(null);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
          moved.current = false;
          velocity.current = { x: 0, y: 0 };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) {
            moved.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          const x = (e.clientX - d.x) * 0.008,
            y = (e.clientY - d.y) * 0.008;
          angle.current.y += x;
          angle.current.x += y;
          velocity.current = { x: y * 0.3, y: x * 0.3 };
          d.x = e.clientX;
          d.y = e.clientY;
        }}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => (drag.current = null)}
        onLostPointerCapture={() => (drag.current = null)}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onKeyDown={(e) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
          e.preventDefault();
          angle.current[e.key === 'ArrowUp' || e.key === 'ArrowDown' ? 'x' : 'y'] +=
            (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) * 0.15;
        }}
      >
        <canvas ref={canvas} aria-hidden="true" />
        {articles.map((a, i) => (
          <a
            key={a.id}
            ref={(el) => {
              items.current[i] = el;
            }}
            href={href(a)}
            className={`planet-node orbit-color-${
              Math.max(
                0,
                categories.findIndex((c) => c.id === a.categoryId),
              ) % 3
            }${highlighted === a.id ? ' is-highlighted' : ''}`}
            title={a.title}
            aria-label={`阅读：${a.title}`}
            draggable={false}
            target={a.type === 'EXTERNAL' ? '_blank' : undefined}
            rel="noopener noreferrer"
            onPointerEnter={() => onHighlight(a.id)}
            onPointerLeave={() => onHighlight(null)}
            onFocus={() => onHighlight(a.id)}
            onBlur={() => onHighlight(null)}
          >
            <span>{a.badge}</span>
            <strong>{a.title}</strong>
          </a>
        ))}
      </div>
      <p className="globe-help">拖动探索星球　·　点击阅读文章</p>
      <div className="orbit-word">IDEAS IN ORBIT</div>
    </div>
  );
}
