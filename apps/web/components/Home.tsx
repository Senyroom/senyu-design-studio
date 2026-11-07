'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ArticleGlobe from './ArticleGlobe';
import CoursePrinter from './CoursePrinter';
import ScrollSections from './ScrollSections';
import type { Article, SiteData } from '../../../packages/contracts/types';
const FallingText = dynamic(() => import('./reactbits/FallingText/FallingText'), { ssr: false });
const Folder = dynamic(() => import('./reactbits/Folder/Folder'), { ssr: false });
const Lanyard = dynamic(() => import('./reactbits/Lanyard/Lanyard'), { ssr: false });
const SplashCursor = dynamic(() => import('./reactbits/SplashCursor/SplashCursor'), { ssr: false });
import { normalizeSite } from '../../../packages/contracts/site-config';
const articleHref = (a: Article) => (a.type === 'EXTERNAL' ? a.url : `/articles/${a.slug}`);
export default function Home({ data }: { data: SiteData }) {
  const { categories, articles } = data;
  const s = normalizeSite(data.site);
  const m = s.modules;
  const anchors: Record<string, boolean> = {
    about: m.hero,
    'about-me': m.about,
    articles: m.articles,
    courses: m.courses,
    contact: m.contact,
    'course-printout': m.courses,
  };
  const available = (href: string) => !href.startsWith('#') || anchors[href.slice(1)] !== false;
  const firstAnchor = Object.keys(anchors).find((key) => anchors[key]) || 'main-content';
  const [list, setList] = useState(false),
    [category, setCategory] = useState('all'),
    [printReplay, setPrintReplay] = useState(0),
    [flip, setFlip] = useState(0),
    [active, setActive] = useState('about'),
    [showSplash, setShowSplash] = useState(false);
  const [folderSize, setFolderSize] = useState(1.4);
  const [highlightedArticle, setHighlightedArticle] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      const width = Math.min(innerWidth * 0.8, 1280);
      setFolderSize(
        innerWidth < 768 ? 1.28 : Math.max(0.8, Math.min(1.5, (((width - 72) / 3) * 0.825) / 224)),
      );
    };
    update();
    addEventListener('resize', update);
    let frame = 0;
    const trackSection = () => {
      frame = 0;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 70;
      const threshold = header + innerHeight * 0.28;
      const sections = Array.from(document.querySelectorAll<HTMLElement>('section[data-nav]'));
      let current = sections[0]?.id || '';
      for (const section of document.querySelectorAll<HTMLElement>('section[data-nav]')) {
        if (section.getBoundingClientRect().top <= threshold) current = section.id;
      }
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 12)
        current = sections.at(-1)?.id || '';
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(trackSection);
    };
    addEventListener('scroll', onScroll, { passive: true });
    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true');
            reveal.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    if (!reduced)
      document
        .querySelectorAll(
          '.section-stack .eyebrow, .about-copy, .section-heading, .folder-column, .course-copy, .contact-heading',
        )
        .forEach((element, i) => {
          const node = element as HTMLElement;
          node.style.setProperty('--reveal-delay', `${(i % 3) * 65}ms`);
          node.setAttribute(
            'data-revealed',
            String(node.getBoundingClientRect().top < innerHeight),
          );
          reveal.observe(node);
        });
    trackSection();
    setShowSplash(
      matchMedia('(pointer:fine)').matches &&
        !matchMedia('(prefers-reduced-motion:reduce)').matches,
    );
    return () => {
      removeEventListener('resize', update);
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      reveal.disconnect();
    };
  }, []);
  const filtered =
    category === 'all' ? articles : articles.filter((a) => a.categoryId === category);
  return (
    <>
      <a className="skip-link" href={`#${firstAnchor}`}>
        跳到主要内容
      </a>
      <header className="site-header">
        <a className="brand" href={`#${firstAnchor}`}>
          <img src={s.avatar} alt="" />
          {s.brand}
        </a>
        <nav aria-label="主导航">
          {s.navigation
            .filter((n) => n.visible && available(n.href))
            .map((n) => (
              <a
                key={n.id}
                className={n.href === `#${active}` ? 'active' : ''}
                href={n.href}
                target={n.newTab ? '_blank' : undefined}
                rel={n.newTab ? 'noopener noreferrer' : undefined}
              >
                {n.label}
              </a>
            ))}
        </nav>
        {s.headerButton.visible && available(s.headerButton.url) && (
          <a
            className="contact-pill"
            href={s.headerButton.url}
            target={s.headerButton.newTab ? '_blank' : undefined}
            rel={s.headerButton.newTab ? 'noopener noreferrer' : undefined}
          >
            {s.headerButton.label}
          </a>
        )}
      </header>
      <main id="main-content" className={!m.hero ? 'without-hero' : undefined}>
        {m.hero && (
          <section id="about" data-nav className="hero">
            {showSplash && s.splashEnabled && (
              <SplashCursor
                contained
                rainbow
                theme="light"
                quality="high"
                intro={false}
                zIndex={-1}
              />
            )}
            <div className="hero-inner">
              <p className="eyebrow hero-edition">{s.heroEyebrow}</p>
              <p className="hero-subtitle">
                {s.heroSubtitle.split('AI 时代')[0]}
                {s.heroSubtitle.includes('AI 时代') && (
                  <>
                    <span>AI 时代</span>
                    {s.heroSubtitle.split('AI 时代')[1]}
                  </>
                )}
              </p>
              <h1>
                <span className="pink-sticker">我是</span>
                <span className="blue-sticker hero-name">{s.name}</span>
              </h1>
              <span className="ai-sticker">
                <i />
                AI
                <i />
              </span>
              <span className="role-sticker">{s.role}</span>
              <img
                className="hero-person"
                src={s.heroImage}
                alt={`${s.name}的个人形象`}
                fetchPriority="high"
                width={900}
                height={900}
              />
            </div>
          </section>
        )}
        {s.announcementVisible && available(s.labels.announcementUrl) && (
          <a className="announcement" href={s.labels.announcementUrl} aria-label={s.announcement}>
            <div>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i}>New ✦　{s.announcement}　✦　</span>
              ))}
            </div>
          </a>
        )}
        <ScrollSections>
          {m.about && (
            <section id="about-me" data-nav className="about-section section-shell">
              <p className="eyebrow">{s.labels.aboutEyebrow}</p>
              <div className="about-copy">
                <div>
                  <h2>
                    {s.aboutTitle} <span className="blue-sticker">{s.aboutHighlight}</span>
                  </h2>
                  <p className="description">{s.aboutDescription}</p>
                </div>
                <h3>
                  {s.exploreTitle}
                  <br />
                  <span className="outline-sticker">{s.exploreHighlight}</span>
                </h3>
              </div>
              {m.tags && (
                <div className="tag-pool">
                  <p className="eyebrow">{s.labels.poolEyebrow}</p>
                  <FallingText
                    text={s.tags.map((t) => t.replaceAll(' ', '\u00a0')).join(' ')}
                    highlightWords={s.tags.slice(0, 4)}
                    variant="tiles"
                    layout="identity"
                    trigger="scroll"
                    theme="light"
                    fontSize="18px"
                    accentColor="#173ef5"
                    gravity={0.85}
                    bounciness={0.28}
                    scatter={0.08}
                    stagger={0.045}
                    order="sequence"
                    draggable
                    cursorPush={0}
                    restoreDelay={0}
                  />
                </div>
              )}
            </section>
          )}
          {m.articles && (
            <section id="articles" data-nav className="articles-section section-shell">
              <p className="eyebrow">{s.labels.articlesEyebrow}</p>
              <div className="section-heading">
                <h2>
                  {s.labels.articlesTitle}
                  <span className="blue-sticker">{s.labels.articlesHighlight}</span>
                </h2>
                <button
                  className={`view-toggle ${list ? 'selected' : ''}`}
                  onClick={() => setList(!list)}
                  aria-pressed={list}
                >
                  {list ? '查看文件' : '查看列表'} ⇄
                </button>
              </div>
              {!list ? (
                <div className="folder-grid">
                  {categories.map((c, i) => {
                    const collection = s.collections.find((f) => f.categoryId === c.id);
                    const entries = collection
                      ? collection.articleIds
                          .map((id) => articles.find((a) => a.id === id && a.categoryId === c.id))
                          .filter((a): a is Article => !!a)
                      : articles.filter((a) => a.categoryId === c.id).slice(0, 3);
                    return (
                      <div className={`folder-column folder-theme-${i % 3}`} key={c.id}>
                        <div className="folder-display">
                          <Folder
                            label={c.name}
                            color={c.color}
                            paperColor="#fffcf5"
                            variant="solid"
                            coverShape="notched"
                            coverContent={
                              <div
                                className="folder-cover-label"
                                style={{ color: i === 2 ? '#75244f' : 'white' }}
                              >
                                <small>COLLECTION / 0{i + 1}</small>
                                <strong>
                                  {c.name}
                                  <span>↗</span>
                                </strong>
                              </div>
                            }
                            theme="light"
                            size={folderSize}
                            intro={false}
                            openOn="click"
                            layout="spread"
                            draggable={false}
                            zoomOnClick={false}
                            onItemClick={(_, index) => {
                              const a = entries[index];
                              if (a)
                                window.open(
                                  articleHref(a),
                                  a.type === 'EXTERNAL' ? '_blank' : '_self',
                                  'noopener,noreferrer',
                                );
                            }}
                            items={entries.map((a, j) => ({
                              content: (
                                <div className={`folder-article article-${j + 1}`}>
                                  <div>
                                    <span>{String(j + 1).padStart(2, '0')}</span>
                                    <span>{a.badge}</span>
                                  </div>
                                  <strong>{a.title}</strong>
                                  <p>{a.summary}</p>
                                  <small>
                                    阅读原文 <span aria-hidden="true">↗</span>
                                  </small>
                                </div>
                              ),
                            }))}
                          />
                        </div>
                        <div className="folder-caption">
                          <p className="eyebrow">{c.label}</p>
                          <p>{c.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="archive">
                  <div className="archive-list">
                    <div className="category-filters" aria-label="文章分类">
                      <button
                        className={category === 'all' ? 'selected' : ''}
                        onClick={() => setCategory('all')}
                      >
                        全部 <span>{articles.length}</span>
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          className={category === c.id ? 'selected' : ''}
                          onClick={() => setCategory(c.id)}
                        >
                          {c.name}{' '}
                          <span>{articles.filter((a) => a.categoryId === c.id).length}</span>
                        </button>
                      ))}
                    </div>
                    <div className="archive-rows" tabIndex={0} aria-label="文章列表">
                      {filtered.length ? (
                        filtered.map((a, i) => (
                          <a
                            key={a.id}
                            href={articleHref(a)}
                            className={highlightedArticle === a.id ? 'is-highlighted' : undefined}
                            onPointerEnter={() => setHighlightedArticle(a.id)}
                            onPointerLeave={() => setHighlightedArticle(null)}
                            onFocus={() => setHighlightedArticle(a.id)}
                            onBlur={() => setHighlightedArticle(null)}
                            target={a.type === 'EXTERNAL' ? '_blank' : undefined}
                            rel="noopener noreferrer"
                          >
                            <span className="row-number">{String(i + 1).padStart(2, '0')}</span>
                            <span>
                              <strong>{a.title}</strong>
                              <small>{categories.find((c) => c.id === a.categoryId)?.name}</small>
                            </span>
                            <span>↗</span>
                          </a>
                        ))
                      ) : (
                        <p className="empty-copy">这份探索，正在酝酿中。</p>
                      )}
                    </div>
                    <div className="archive-footer">
                      <span>
                        显示 {String(filtered.length).padStart(2, '0')} / {articles.length} 篇文章
                      </span>
                      <span>LEARN · MAKE · SHARE</span>
                    </div>
                  </div>
                  <ArticleGlobe
                    articles={filtered}
                    categories={categories}
                    highlighted={highlightedArticle}
                    onHighlight={setHighlightedArticle}
                  />
                </div>
              )}
            </section>
          )}
          {m.courses && (
            <section id="courses" data-nav className="course-section">
              <div className="course-inner section-shell">
                <p className="eyebrow">{s.labels.coursesEyebrow}</p>
                <span className="workflow-word">WORKFLOW</span>
                <div className="course-copy">
                  <h2>
                    {s.courseTitle}
                    <br />
                    <span className="blue-sticker">{s.courseHighlight}</span>
                  </h2>
                  <p className="description">{s.courseAudience}</p>
                  <a
                    className="primary-button"
                    href="#course-printout"
                    onClick={() => setPrintReplay((v) => v + 1)}
                  >
                    {s.labels.courseButtonLabel} <span>⟶</span>
                  </a>
                  {s.courseUrl && (
                    <a
                      className="course-consult"
                      href={s.courseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      了解详情 / 课程咨询 ↗
                    </a>
                  )}
                </div>
                <CoursePrinter site={s} replay={printReplay} />
              </div>
            </section>
          )}
        </ScrollSections>
        {m.contact && (
          <section id="contact" data-nav className="contact-section">
            <div className="contact-heading">
              <p className="eyebrow">{s.labels.contactEyebrow}</p>
              <h2>{s.contactTitle}</h2>
            </div>
            <div className="contact-glow" />
            <div className="lanyard-scene">
              <Lanyard
                frontImage={s.cardFront}
                backImage={s.cardBack}
                backImageFit="contain"
                strapImage={s.strap}
                strapColor="#e4dafa"
                size={0.46}
                strapLength={0.35}
                breeze={0.08}
                finish="matte"
                intro={false}
                flipSignal={flip}
              />
              <div className={`lanyard-fallback ${flip % 2 ? 'flipped' : ''}`}>
                <span />
                <img src={flip % 2 ? s.cardBack : s.cardFront} alt="创意挂卡，可翻转查看二维码" />
              </div>
            </div>
            <div className="contact-wordmark">{s.labels.contactWordmark}</div>
            <div className="socials">
              <button onClick={() => setFlip((v) => v + 1)} aria-label="微信，翻转名片查看二维码">
                <span className="social-circle wechat">
                  <img src={s.wechatIcon || '/icons/wechat.svg'} alt="" />
                </span>
                <span>微信</span>
              </button>
              {s.socials.map((social) => (
                <a href={social.url} key={social.name} target="_blank" rel="noopener noreferrer">
                  <span className="social-circle">
                    <img src={social.icon} alt="" />
                  </span>
                  <span>{social.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
