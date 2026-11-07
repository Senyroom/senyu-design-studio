import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Message,
  Select,
  Space,
  Switch,
  Tag,
} from '@arco-design/web-react';
import type { Site, Category } from '../../../packages/contracts/types';
import { request } from './api';
import SettingsGroup from './SettingsGroup';

const moduleNames: Record<keyof Site['modules'], string> = {
  hero: '首屏人物',
  about: '个人介绍',
  tags: '身份标签（位于个人介绍内）',
  articles: '文章与文件夹',
  courses: '课程与服务',
  contact: '联系方式与社交平台',
};
const labelNames: Record<keyof Site['labels'], string> = {
  aboutEyebrow: '个人介绍英文标记',
  poolEyebrow: '标签区域英文标记',
  articlesEyebrow: '文章区域英文标记',
  articlesTitle: '文章区域标题',
  articlesHighlight: '文章区域强调文字',
  coursesEyebrow: '课程区域英文标记',
  contactEyebrow: '联系区域英文标记',
  contactWordmark: '联系区域背景大字',
  courseButtonLabel: '课程按钮文字',
  announcementUrl: '公告跳转链接',
};
const moduleFields: Record<keyof Site['modules'], (keyof Site['labels'])[]> = {
  hero: ['announcementUrl'],
  about: ['aboutEyebrow'],
  tags: ['poolEyebrow'],
  articles: ['articlesEyebrow', 'articlesTitle', 'articlesHighlight'],
  courses: ['coursesEyebrow', 'courseButtonLabel'],
  contact: ['contactEyebrow', 'contactWordmark'],
};
const moduleLinks: Record<keyof Site['modules'], string> = {
  hero: 'announcement',
  about: 'profile',
  tags: 'profile',
  articles: 'collections',
  courses: 'course',
  contact: 'contact',
};
type Props = { section: string; draft: Site; update: (key: keyof Site, value: any) => void };

export default function SiteControls({ section, draft, update }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (section !== 'collections') return;
    setReady(false);
    Promise.all([request('admin/categories'), request('admin/articles')])
      .then(([c, a]) => {
        setCategories(c);
        setArticles(a);
        setReady(true);
      })
      .catch((e) => Message.error(e.message));
  }, [section]);
  if (section === 'navigation') {
    const button = draft.headerButton;
    const nav = draft.navigation;
    const change = (index: number, patch: Partial<Site['navigation'][number]>) =>
      update(
        'navigation',
        nav.map((n, i) => (i === index ? { ...n, ...patch } : n)),
      );
    const move = (index: number, offset: number) => {
      const next = [...nav];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      update('navigation', next);
    };
    return (
      <>
        <SettingsGroup number="01" title="右上角按钮" description="设置导航栏的主要入口。">
          <div className="field-grid">
            <Form.Item label="按钮名称">
              <Input
                value={button.label}
                maxLength={40}
                onChange={(label) => update('headerButton', { ...button, label })}
              />
            </Form.Item>
            <Form.Item label="按钮链接">
              <Input
                value={button.url}
                placeholder="https://… 或 #articles"
                onChange={(url) => update('headerButton', { ...button, url })}
              />
            </Form.Item>
          </div>
          <div className="config-options">
            <label>
              <Switch
                aria-label="显示右上角按钮"
                checked={button.visible}
                onChange={(visible) => update('headerButton', { ...button, visible })}
              />
              显示按钮
            </label>
            <label>
              <Switch
                aria-label="右上角按钮新窗口打开"
                checked={button.newTab}
                onChange={(newTab) => update('headerButton', { ...button, newTab })}
              />
              新窗口打开
            </label>
          </div>
        </SettingsGroup>
        <SettingsGroup number="02" title="导航菜单" description="按下方顺序展示，最多 8 项。">
          <p className="settings-note">
            链接支持 #about、#about-me、#articles、#courses、#contact、本站路径和 http(s)
            地址。隐藏模块对应的锚点入口会自动隐藏。
          </p>
          <div className="navigation-grid">
            {nav.map((n, i) => (
              <Card
                key={n.id}
                className="config-card"
                size="small"
                title={
                  <>
                    <span className="item-index">{String(i + 1).padStart(2, '0')}</span>
                    {n.label || '新导航'}
                  </>
                }
              >
                <Form.Item label="名称">
                  <Input
                    value={n.label}
                    maxLength={40}
                    onChange={(label) => change(i, { label })}
                  />
                </Form.Item>
                <Form.Item label="链接">
                  <Input value={n.href} onChange={(href) => change(i, { href })} />
                </Form.Item>
                <div className="config-options">
                  <label>
                    <Switch
                      aria-label={`显示导航 ${i + 1}`}
                      checked={n.visible}
                      onChange={(visible) => change(i, { visible })}
                    />
                    显示
                  </label>
                  <label>
                    <Switch
                      aria-label={`导航 ${i + 1} 新窗口打开`}
                      checked={n.newTab}
                      onChange={(newTab) => change(i, { newTab })}
                    />
                    新窗口
                  </label>
                </div>
                <div className="config-actions">
                  <Button size="small" disabled={!i} onClick={() => move(i, -1)}>
                    上移
                  </Button>
                  <Button size="small" disabled={i === nav.length - 1} onClick={() => move(i, 1)}>
                    下移
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    status="danger"
                    onClick={() =>
                      update(
                        'navigation',
                        nav.filter((_, j) => i !== j),
                      )
                    }
                  >
                    移除
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Button
            disabled={nav.length >= 8}
            onClick={() =>
              update('navigation', [
                ...nav,
                {
                  id: crypto.randomUUID(),
                  label: '新导航',
                  href: '#articles',
                  visible: true,
                  newTab: false,
                },
              ])
            }
          >
            添加导航（最多 8 项）
          </Button>
        </SettingsGroup>
      </>
    );
  }
  if (section === 'modules')
    return (
      <>
        <p className="settings-note">
          按首页顺序管理各模块。右上角开关控制显示，下方编辑标题和入口。
        </p>
        <div className="module-grid">
          {(Object.keys(moduleNames) as (keyof Site['modules'])[]).map((key, i) => (
            <SettingsGroup
              key={key}
              number={String(i + 1).padStart(2, '0')}
              title={moduleNames[key].replace('（位于个人介绍内）', '')}
              action={
                <Switch
                  aria-label={`显示${moduleNames[key]}`}
                  checked={draft.modules[key]}
                  onChange={(v) => update('modules', { ...draft.modules, [key]: v })}
                />
              }
            >
              <div className="module-status">
                {draft.modules[key] ? '在首页显示' : '已隐藏'}
                {key === 'tags' ? ' · 位于个人介绍内' : ''}
              </div>
              {moduleFields[key].map((field) => (
                <Form.Item label={labelNames[field]} key={field}>
                  <Input
                    value={draft.labels[field]}
                    onChange={(v) => update('labels', { ...draft.labels, [field]: v })}
                  />
                </Form.Item>
              ))}
              <a className="section-edit-link" href={`#${moduleLinks[key]}`}>
                编辑{key === 'articles' ? '展示文章' : '内容与素材'}{' '}
                <span aria-hidden="true">↗</span>
              </a>
            </SettingsGroup>
          ))}
        </div>
      </>
    );
  if (section !== 'collections') return null;
  const published = articles.filter((a) => a.status === 'PUBLISHED' && a.published);
  return (
    <>
      <p className="muted">
        每个文件夹最多选择 3
        篇已发布文章，按选择顺序展示。卡片、列表和星球引用同一篇文章；修改标题、摘要、标记和链接后，请在探索记录中发布该文章。分类名称、说明、颜色和顺序在「内容分类」中修改并即时生效。
      </p>
      <Button href="#categories">编辑分类名称、说明、颜色与顺序</Button>
      {!ready && <p>正在加载分类与文章…</p>}
      {categories.map((c) => {
        const options = published
          .filter((a) => (a.published.categoryId || a.categoryId) === c.id)
          .sort((a, b) => (a.published.sort || 0) - (b.published.sort || 0));
        const config = draft.collections.find((f) => f.categoryId === c.id);
        const ids = config?.articleIds ?? options.slice(0, 3).map((a) => a.id);
        const choose = (articleIds: string[]) =>
          update('collections', [
            ...draft.collections.filter((f) => f.categoryId !== c.id),
            { categoryId: c.id, articleIds },
          ]);
        return (
          <Card
            key={c.id}
            className="config-card"
            size="small"
            title={
              <Space>
                <span style={{ color: c.color }}>●</span>
                {c.name}
                <Tag>{config ? '手动选择' : '自动取分类前 3 篇'}</Tag>
              </Space>
            }
          >
            <p>
              {c.label} · {c.description}
            </p>
            <Form.Item label="展示文章（按选择顺序）">
              <Select
                mode="multiple"
                allowClear
                value={ids}
                placeholder="选择已发布文章"
                onChange={(values) => {
                  if (values.length > 3) {
                    Message.warning('每个文件夹最多 3 篇');
                    return;
                  }
                  choose(values);
                }}
                options={[
                  ...options.map((a) => ({ label: a.published.title, value: a.id })),
                  ...ids
                    .filter((id) => !options.some((a) => a.id === id))
                    .map((id) => ({ label: '已下线或分类已变更，请移除', value: id })),
                ]}
              />
            </Form.Item>
            {ids.map((id, i) => {
              const a = articles.find((a) => a.id === id);
              return (
                <div key={id} className="collection-preview">
                  <b>
                    {i + 1}. {a?.published?.title || '文章已删除'}
                  </b>
                  <p>{a?.published?.summary}</p>
                  <p className="muted">
                    {a?.published?.badge} · {a?.status === 'PUBLISHED' ? '已发布' : '未公开'} ·{' '}
                    {a?.published?.type === 'EXTERNAL'
                      ? a.published.url
                      : `/articles/${a?.slug || ''}`}
                  </p>
                  <Space wrap>
                    <Button
                      disabled={!i}
                      onClick={() => {
                        const next = [...ids];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        choose(next);
                      }}
                    >
                      上移
                    </Button>
                    <Button
                      disabled={i === ids.length - 1}
                      onClick={() => {
                        const next = [...ids];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        choose(next);
                      }}
                    >
                      下移
                    </Button>
                    <Button href={`#articles?edit=${id}`} disabled={!a}>
                      编辑这篇文章的内容与链接
                    </Button>
                  </Space>
                </div>
              );
            })}
            <Button
              type="text"
              onClick={() =>
                update(
                  'collections',
                  draft.collections.filter((f) => f.categoryId !== c.id),
                )
              }
            >
              恢复按分类排序自动展示
            </Button>
          </Card>
        );
      })}
    </>
  );
}
