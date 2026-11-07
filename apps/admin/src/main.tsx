import Account from './Account';
import IdentityTags from './IdentityTags';
import SiteControls from './SiteControls';
import SettingsGroup from './SettingsGroup';
import { normalizeSite } from '../../../packages/contracts/site-config';
import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { setCreateRoot } from '@arco-design/web-react/es/_util/react-dom';
// Arco's static Message/Modal APIs need React 19's client renderer.
setCreateRoot(createRoot as any);
import {
  Layout,
  Menu,
  Button,
  Input,
  Form,
  Message,
  Card,
  Table,
  Tag,
  Space,
  Modal,
  Drawer,
  Select,
  Switch,
  InputNumber,
  Spin,
  Empty,
  Typography,
  Popconfirm,
  Statistic,
  Avatar,
  Notification,
} from '@arco-design/web-react';
import {
  IconDashboard,
  IconFile,
  IconSettings,
  IconImage,
  IconUser,
  IconApps,
  IconLink,
  IconBook,
  IconSearch,
  IconPlus,
  IconLaunch,
  IconExport,
  IconCheckCircle,
  IconNotification,
  IconArrowRight,
  IconUpload,
  IconRefresh,
  IconEdit,
  IconDelete,
  IconHistory,
  IconEye,
} from '@arco-design/web-react/icon';
import '@arco-design/web-react/dist/css/arco.css';
import './style.css';
import { request, setCsrf, privateImage } from './api';
import Editor from './Editor';
import type { Site, Category } from '../../../packages/contracts/types';
const { Sider, Header, Content } = Layout;
const TextArea = Input.TextArea;
const groups = [
  { key: 'dashboard', title: '工作台', icon: <IconDashboard /> },
  { key: 'articles', title: '探索记录', icon: <IconFile /> },
  { key: 'categories', title: '内容分类', icon: <IconApps /> },
  { key: 'media', title: '媒体库', icon: <IconImage /> },
  { key: 'navigation', title: '顶部导航', icon: <IconLink /> },
  { key: 'modules', title: '模块设置', icon: <IconApps /> },
  { key: 'collections', title: '文章模块', icon: <IconBook /> },
  { key: 'profile', title: '个人资料', icon: <IconUser /> },
  { key: 'announcement', title: '首页与公告', icon: <IconNotification /> },
  { key: 'course', title: '课程与服务', icon: <IconBook /> },
  { key: 'contact', title: '联系方式', icon: <IconLink /> },
  { key: 'seo', title: '站点设置', icon: <IconSettings /> },
  { key: 'account', title: '账号与会话', icon: <IconUser /> },
];
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });
const toastError = (e: any) => Message.error(e.message || '操作失败');
function MediaPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (src: string) => void;
}) {
  const [files, setFiles] = useState<any[]>([]),
    [search, setSearch] = useState('');
  useEffect(() => {
    if (visible) request('admin/media').then(setFiles).catch(toastError);
  }, [visible]);
  return (
    <Modal
      visible={visible}
      title="选择本地媒体"
      footer={null}
      onCancel={onClose}
      style={{ width: 850, maxWidth: '95vw' }}
    >
      <Input prefix={<IconSearch />} placeholder="搜索文件名" value={search} onChange={setSearch} />
      <div className="picker-grid">
        {files
          .filter((m) => m.filename.includes(search))
          .map((m) => (
            <button
              key={m.id}
              className="picker-item"
              onClick={() => {
                onSelect(`/media/${m.key}`);
                onClose();
              }}
            >
              <img src={privateImage(m.key)} alt={m.alt} />
              <span>{m.filename}</span>
            </button>
          ))}
      </div>
      {!files.length && <Empty description="先到媒体库上传图片" />}
    </Modal>
  );
}
function ImageField({ value, onChange }: { value?: string; onChange?: (s: string) => void }) {
  const [visible, setVisible] = useState(false);
  const preview = value?.startsWith('/media/') ? privateImage(value.slice(7)) : value;
  return (
    <>
      <div className="image-field">
        {value && <img src={preview} alt="已选择图片" />}
        <div>
          <Space>
            <Button icon={<IconImage />} onClick={() => setVisible(true)}>
              {value ? '更换图片' : '选择图片'}
            </Button>
            {value && (
              <Button type="text" status="danger" onClick={() => onChange?.('')}>
                移除
              </Button>
            )}
          </Space>
          <small>从服务器本地媒体库选择，发布后自动公开引用文件</small>
        </div>
      </div>
      <MediaPicker
        visible={visible}
        onClose={() => setVisible(false)}
        onSelect={(src) => onChange?.(src)}
      />
    </>
  );
}
function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="login-page">
      <div className="login-art">
        <span className="login-word">
          DESIGN
          <br />
          BUILD
          <br />
          <i>EXPLORE.</i>
        </span>
        <p>
          让灵感成为作品，
          <br />
          让表达拥有自己的地方。
        </p>
        <small>森语设计所 / CONTENT STUDIO</small>
      </div>
      <div className="login-panel">
        <div className="login-brand">
          <span>✦</span> 森语设计所
        </div>
        <p className="overline">WELCOME BACK</p>
        <h1>继续你的创作</h1>
        <p className="muted">登录内容管理后台，整理下一份灵感。</p>
        <Form
          layout="vertical"
          onSubmit={async (v) => {
            setLoading(true);
            try {
              const user = await request('auth/login', { method: 'POST', body: JSON.stringify(v) });
              setCsrf(user.csrf);
              onLogin(user);
            } catch (e) {
              toastError(e);
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item
            field="username"
            label="账号"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input placeholder="管理员账号" size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item
            field="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" size="large" autoComplete="current-password" />
          </Form.Item>
          <Button htmlType="submit" type="primary" size="large" long loading={loading}>
            登录工作台 <IconArrowRight />
          </Button>
        </Form>
        <div className="login-note">安全登录 · 内容由你掌握</div>
      </div>
    </div>
  );
}
function Dashboard({ navigate }: { navigate: (key: string) => void }) {
  const [data, setData] = useState<any>();
  const refresh = () => request('admin/dashboard').then(setData).catch(toastError);
  useEffect(() => {
    void refresh();
  }, []);
  if (!data) return <Spin />;
  return (
    <>
      <div className="welcome-card">
        <div>
          <p className="overline">YOUR CREATIVE SPACE</p>
          <h2>今天，也记录一点新发现。</h2>
          <p>把探索沉淀成内容，让每一份灵感都被看见。</p>
          <Space>
            <Button type="primary" onClick={() => navigate('articles')} icon={<IconPlus />}>
              管理探索记录
            </Button>
            <Button
              onClick={() =>
                window.open(
                  import.meta.env.VITE_WEB_ORIGIN || location.origin.replace(':5173', ':3000'),
                  '_blank',
                )
              }
            >
              预览网站 <IconLaunch />
            </Button>
          </Space>
        </div>
        <div className="welcome-graphic">
          <span>✦</span>
          <b>
            MAKE
            <br />
            IT REAL.
          </b>
        </div>
      </div>
      <div className="stats-grid">
        {[
          ['探索记录', data.articles, '篇'],
          ['已发布内容', data.published, '篇'],
          ['媒体文件', data.media, '个'],
          ['内容分类', data.categories, '组'],
        ].map(([title, value, suffix]) => (
          <Card key={title as string}>
            <p className="muted">{title}</p>
            <Statistic
              value={value as number}
              suffix={suffix}
              styleValue={{ fontSize: 34, fontWeight: 600 }}
            />
            <span className="stat-caption">你的创作资产</span>
          </Card>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card
          title="发布与同步"
          extra={
            <Button type="text" icon={<IconRefresh />} onClick={refresh}>
              刷新
            </Button>
          }
        >
          <p className="card-intro">发布内容后，系统会同步本地媒体并更新前台。</p>
          <div className="cache-status">
            <Tag color={data.cache?.connected ? 'green' : 'orange'}>
              {data.cache?.connected
                ? 'Redis 已连接'
                : data.cache?.enabled
                  ? 'Redis 回源中'
                  : 'Redis 未配置'}
            </Tag>
            <span>缓存命中 {data.cache?.hits || 0} 次 · MySQL 为数据源</span>
          </div>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            data={data.jobs}
            noDataElement={<Empty description="还没有发布任务" />}
            columns={[
              { title: '时间', dataIndex: 'createdAt', render: (v: string) => date(v) },
              {
                title: '状态',
                render: (_: any, row: any) => (
                  <Tag
                    color={
                      row.status === 'DONE' ? 'green' : row.status === 'FAILED' ? 'red' : 'arcoblue'
                    }
                  >
                    {
                      (
                        {
                          DONE: '已同步',
                          PENDING: '等待同步',
                          RUNNING: '同步中',
                          FAILED: '需重试',
                        } as any
                      )[row.status]
                    }
                  </Tag>
                ),
              },
              {
                title: '操作',
                render: (_: any, row: any) =>
                  row.status === 'FAILED' ? (
                    <Button
                      type="text"
                      onClick={() =>
                        request(`admin/jobs/${row.id}/retry`, { method: 'POST' })
                          .then(refresh)
                          .catch(toastError)
                      }
                    >
                      重试
                    </Button>
                  ) : (
                    <span className="muted">—</span>
                  ),
              },
            ]}
          />
        </Card>
        <Card title="最近操作">
          <div className="activity-list">
            {data.logs.length ? (
              data.logs.map((log: any) => (
                <div key={log.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{log.action}</strong>
                    <p>
                      {log.actor} · {date(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <Empty description="从发布第一份内容开始" />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
function Articles() {
  const [items, setItems] = useState<any[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [editing, setEditing] = useState<any>(null),
    [form] = Form.useForm(),
    [loading, setLoading] = useState(false),
    [body, setBody] = useState<any>(null),
    [type, setType] = useState('EXTERNAL'),
    [versions, setVersions] = useState<any[] | null>(null),
    [versionArticle, setVersionArticle] = useState(''),
    [insert, setInsert] = useState<((src: string) => void) | null>(null);
  const refresh = () =>
    Promise.all([
      request('admin/articles').then(setItems),
      request('admin/categories').then(setCategories),
    ]).catch(toastError);
  useEffect(() => {
    void refresh();
  }, []);
  const edit = (row?: any) => {
    setEditing(row || {});
    const c = row?.draft || {
      title: '',
      summary: '',
      type: 'EXTERNAL',
      url: '',
      badge: 'ARTICLE',
      cover: '',
      body: null,
    };
    setBody(c.body);
    setType(c.type);
    form.setFieldsValue({
      slug: row?.slug || '',
      categoryId: row?.categoryId || categories[0]?.id,
      sort: row?.sort || 0,
      content: c,
    });
  };
  const openedArticle = useRef('');
  useEffect(() => {
    const id = new URLSearchParams(location.hash.split('?')[1] || '').get('edit');
    const row = items.find((a) => a.id === id);
    if (row && openedArticle.current !== id) {
      openedArticle.current = id!;
      edit(row);
    }
  }, [items]);
  const save = async () => {
    const values = await form.validate();
    setLoading(true);
    try {
      const row = await request(`admin/articles${editing.id ? '/' + editing.id : ''}`, {
        method: editing.id ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...values,
          revision: editing.revision,
          content: { ...values.content, body },
        }),
      });
      Message.success('草稿已保存，公开版本保持原样');
      setEditing(row);
      form.setFieldsValue({ revision: row.revision });
      await refresh();
      return row;
    } catch (e) {
      toastError(e);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const act = async (row: any, action: string) => {
    try {
      await request(`admin/articles/${row.id}/${action}`, { method: 'POST' });
      Message.success(action === 'publish' ? '已提交发布，前台正在同步' : '文章已下线');
      await refresh();
    } catch (e) {
      toastError(e);
    }
  };
  return (
    <>
      <Card className="content-card">
        <div className="list-toolbar">
          <div>
            <h2>探索记录</h2>
            <p className="muted">管理文章、外部链接和每一次新的尝试</p>
          </div>
          <Button type="primary" icon={<IconPlus />} onClick={() => edit()}>
            新建文章
          </Button>
        </div>
        <div className="table-filters">
          <Input
            prefix={<IconSearch />}
            placeholder="搜索标题或 slug"
            value={search}
            onChange={setSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={filter}
            onChange={setFilter}
            style={{ width: 180 }}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '已发布', value: 'PUBLISHED' },
              { label: '草稿', value: 'DRAFT' },
            ]}
          />
          <Button icon={<IconRefresh />} onClick={refresh} />
        </div>
        <Table
          rowKey="id"
          data={items.filter(
            (a) =>
              (!search ||
                `${a.draft.title}${a.slug}`.toLowerCase().includes(search.toLowerCase())) &&
              (filter === 'all' || a.status === filter),
          )}
          pagination={{ pageSize: 10, showTotal: true }}
          columns={[
            {
              title: '文章',
              width: 310,
              render: (_: any, row: any) => (
                <div className="article-title-cell">
                  <strong>{row.draft.title}</strong>
                  <small>
                    {row.slug} · {row.draft.type === 'EXTERNAL' ? '外链文章' : '站内正文'}
                  </small>
                </div>
              ),
            },
            {
              title: '分类',
              render: (_: any, row: any) => <Tag color="purple">{row.category.name}</Tag>,
            },
            {
              title: '状态',
              render: (_: any, row: any) => (
                <Tag color={row.status === 'PUBLISHED' ? 'green' : 'gray'}>
                  {row.status === 'PUBLISHED' ? '已发布' : '草稿'}
                </Tag>
              ),
            },
            { title: '更新时间', dataIndex: 'updatedAt', render: (v: string) => date(v) },
            {
              title: '操作',
              width: 250,
              render: (_: any, row: any) => (
                <Space size={0}>
                  <Button type="text" onClick={() => edit(row)}>
                    编辑
                  </Button>
                  <Button
                    type="text"
                    onClick={async () => {
                      const p = await request('admin/preview', {
                        method: 'POST',
                        body: JSON.stringify({ kind: 'article', id: row.id }),
                      });
                      window.open(p.url, '_blank');
                    }}
                  >
                    预览
                  </Button>
                  <Popconfirm
                    title={
                      row.status === 'PUBLISHED'
                        ? '下线后文章将不再公开，确定下线？'
                        : '将当前草稿发布到网站？'
                    }
                    onOk={() => act(row, row.status === 'PUBLISHED' ? 'unpublish' : 'publish')}
                  >
                    <Button type="text" status={row.status === 'PUBLISHED' ? 'warning' : undefined}>
                      {row.status === 'PUBLISHED' ? '下线' : '发布'}
                    </Button>
                  </Popconfirm>
                  <Button
                    type="text"
                    icon={<IconHistory />}
                    aria-label="查看文章历史版本"
                    onClick={async () => {
                      setVersionArticle(row.id);
                      setVersions(await request(`admin/articles/${row.id}/versions`));
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Drawer
        width={820}
        visible={!!editing}
        title={editing?.id ? '编辑探索记录' : '新建探索记录'}
        onCancel={() => setEditing(null)}
        footer={
          <Space>
            <Button onClick={() => setEditing(null)}>关闭</Button>
            <Button loading={loading} onClick={save}>
              保存草稿
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={async () => {
                const row = await save();
                if (row) await act(row, 'publish');
              }}
            >
              保存并发布
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item field="content.title" label="文章标题" rules={[{ required: true }]}>
            <Input maxLength={180} showWordLimit />
          </Form.Item>
          <div className="two-fields">
            <Form.Item
              field="slug"
              label="访问标识 slug"
              rules={[
                { required: true },
                { match: /^[a-z0-9][a-z0-9-]*$/, message: '使用小写字母、数字和短横线' },
              ]}
            >
              <Input placeholder="例如 my-first-exploration" />
            </Form.Item>
            <Form.Item field="categoryId" label="所属分类" rules={[{ required: true }]}>
              <Select options={categories.map((c) => ({ label: c.name, value: c.id }))} />
            </Form.Item>
          </div>
          <div className="two-fields">
            <Form.Item field="content.type" label="文章类型">
              <Select
                onChange={setType}
                options={[
                  { label: '外部链接', value: 'EXTERNAL' },
                  { label: '站内正文', value: 'INTERNAL' },
                ]}
              />
            </Form.Item>
            <Form.Item field="content.badge" label="卡片英文标签">
              <Input placeholder="CODEX / DESIGN / WORKFLOW" />
            </Form.Item>
          </div>
          <Form.Item field="content.summary" label="内容摘要">
            <TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={1000} showWordLimit />
          </Form.Item>
          <Form.Item field="content.cover" label="封面图">
            <ImageField />
          </Form.Item>
          {type === 'EXTERNAL' ? (
            <Form.Item field="content.url" label="原文地址" rules={[{ required: true }]}>
              <Input placeholder="https://" />
            </Form.Item>
          ) : (
            <Form.Item label="文章正文">
              <Editor value={body} onChange={setBody} onImage={(fn) => setInsert(() => fn)} />
            </Form.Item>
          )}
          <Form.Item field="sort" label="显示顺序（数值越小越靠前）">
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Drawer>
      <Modal
        visible={versions !== null}
        title="文章历史版本"
        footer={null}
        onCancel={() => setVersions(null)}
      >
        <Table
          rowKey="id"
          pagination={false}
          data={versions || []}
          columns={[
            { title: '版本', dataIndex: 'revision', render: (v: number) => `V${v}` },
            { title: '保存时间', dataIndex: 'createdAt', render: (v: string) => date(v) },
            {
              title: '操作',
              render: (_: any, v: any) => (
                <Popconfirm
                  title="恢复为草稿？不会直接覆盖公开版本。"
                  onOk={async () => {
                    await request(`admin/articles/${versionArticle}/restore/${v.id}`, {
                      method: 'POST',
                    });
                    setVersions(null);
                    await refresh();
                    Message.success('历史内容已恢复为草稿');
                  }}
                >
                  <Button type="text">恢复草稿</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>
      <MediaPicker
        visible={!!insert}
        onClose={() => setInsert(null)}
        onSelect={(src) => insert?.(src)}
      />
    </>
  );
}
function Categories() {
  const [data, setData] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [form] = Form.useForm();
  const refresh = () => request('admin/categories').then(setData).catch(toastError);
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <Card>
      <div className="list-toolbar">
        <div>
          <h2>内容分类</h2>
          <p className="muted">对应首页的文件夹、列表筛选和星球配色</p>
        </div>
        <Button
          type="primary"
          icon={<IconPlus />}
          onClick={() => {
            form.resetFields();
            form.setFieldsValue({ color: '#8b4bc7', sort: 0 });
            setEditing({});
          }}
        >
          新建分类
        </Button>
      </div>
      <Table
        rowKey="id"
        data={data}
        pagination={false}
        columns={[
          { title: '分类名称', dataIndex: 'name' },
          { title: '标识', dataIndex: 'slug' },
          {
            title: '主题色',
            dataIndex: 'color',
            render: (v: string) => (
              <span className="color-preview">
                <i style={{ background: v }} />
                {v}
              </span>
            ),
          },
          { title: '说明', dataIndex: 'description' },
          { title: '排序', dataIndex: 'sort' },
          {
            title: '操作',
            render: (_: any, c: any) => (
              <Space>
                <Button
                  type="text"
                  onClick={() => {
                    setEditing(c);
                    form.setFieldsValue(c);
                  }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="删除此分类？有文章引用的分类不能删除。"
                  onOk={() =>
                    request(`admin/categories/${c.id}`, { method: 'DELETE' })
                      .then(refresh)
                      .catch(toastError)
                  }
                >
                  <Button type="text" status="danger">
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        visible={!!editing}
        title={editing?.id ? '编辑分类' : '新建分类'}
        onCancel={() => setEditing(null)}
        onOk={async () => {
          try {
            const values = await form.validate();
            await request(`admin/categories${editing.id ? '/' + editing.id : ''}`, {
              method: editing.id ? 'PUT' : 'POST',
              body: JSON.stringify(values),
            });
            setEditing(null);
            refresh();
            Message.success('分类已保存');
          } catch (e) {
            toastError(e);
          }
        }}
      >
        <Form form={form} layout="vertical">
          {[
            ['name', '分类名称'],
            ['slug', '英文标识'],
            ['label', '章节标记，例如 01 / FOUNDATIONS'],
            ['description', '分类说明'],
            ['color', '主题色，例如 #2436ff'],
          ].map(([field, label]) => (
            <Form.Item key={field} field={field} label={label} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          ))}
          <Form.Item field="sort" label="顺序">
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
function MediaLibrary() {
  const [references, setReferences] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]),
    [search, setSearch] = useState(''),
    [uploading, setUploading] = useState(false),
    [editing, setEditing] = useState<any>(),
    input = useRef<HTMLInputElement>(null);
  const refresh = () => request('admin/media').then(setFiles).catch(toastError);
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    setReferences([]);
    if (editing)
      request(`admin/media/${editing.id}/references`).then(setReferences).catch(toastError);
  }, [editing?.id]);
  return (
    <>
      <Card>
        <div className="list-toolbar">
          <div>
            <h2>媒体库</h2>
            <p className="muted">图片保存在服务器本地持久化目录，草稿文件仅登录后可见</p>
          </div>
          <Button
            type="primary"
            loading={uploading}
            icon={<IconUpload />}
            onClick={() => input.current?.click()}
          >
            上传图片
          </Button>
          <input
            ref={input}
            hidden
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            onChange={async (e) => {
              setUploading(true);
              try {
                for (const file of Array.from(e.target.files || [])) {
                  const body = new FormData();
                  body.append('file', file);
                  await request('admin/media', { method: 'POST', body });
                }
                Message.success('图片已上传到本地媒体库');
                await refresh();
              } catch (error) {
                toastError(error);
              } finally {
                setUploading(false);
                e.target.value = '';
              }
            }}
          />
        </div>
        <div className="table-filters">
          <Input
            prefix={<IconSearch />}
            style={{ width: 320 }}
            placeholder="搜索文件名或替代文字"
            value={search}
            onChange={setSearch}
          />
          <Tag color="purple">本地磁盘</Tag>
          <span className="muted">共 {files.length} 个文件</span>
        </div>
        <div className="media-grid">
          {files
            .filter((m) => `${m.filename}${m.alt}`.includes(search))
            .map((m) => (
              <div className="media-card" key={m.id}>
                <button className="media-image" onClick={() => setEditing(m)}>
                  <img src={privateImage(m.key)} alt={m.alt} />
                </button>
                <div className="media-info">
                  <strong title={m.filename}>{m.filename}</strong>
                  <p>
                    {m.width || '—'} × {m.height || '—'} · {(m.size / 1024).toFixed(1)} KB
                  </p>
                  <Space>
                    <Button size="mini" type="text" onClick={() => setEditing(m)}>
                      查看与编辑
                    </Button>
                    <Popconfirm
                      title="移入回收站？被内容或历史版本引用的文件会被保护。"
                      onOk={() =>
                        request(`admin/media/${m.id}`, { method: 'DELETE' })
                          .then(refresh)
                          .catch(toastError)
                      }
                    >
                      <Button size="mini" type="text" status="danger">
                        移除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ))}
        </div>
        {!files.length && <Empty />}
      </Card>
      <Drawer
        visible={!!editing}
        width={500}
        title="媒体信息"
        onCancel={() => setEditing(null)}
        footer={
          <Button
            type="primary"
            onClick={async () => {
              try {
                await request(`admin/media/${editing.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ alt: editing.alt }),
                });
                Message.success('替代文字已保存');
                setEditing(null);
                refresh();
              } catch (e) {
                toastError(e);
              }
            }}
          >
            保存
          </Button>
        }
      >
        {editing && (
          <>
            <img className="media-detail-image" src={privateImage(editing.key)} alt={editing.alt} />
            <Form layout="vertical">
              <Form.Item label="文件名">
                <Input value={editing.filename} readOnly />
              </Form.Item>
              <Form.Item label="图片替代文字">
                <TextArea value={editing.alt} onChange={(alt) => setEditing({ ...editing, alt })} />
              </Form.Item>
              <Form.Item label="内容引用地址">
                <Input value={`/media/${editing.key}`} readOnly />
              </Form.Item>
              <p className="muted">
                文件上传于 {date(editing.createdAt)}，在内容发布时同步到公开目录。
              </p>
              <Typography.Title heading={6}>引用位置</Typography.Title>
              {references.length ? (
                references.map((r, i) => (
                  <p key={i} className="card-intro">
                    <Tag>{r.kind}</Tag> {r.label}
                  </p>
                ))
              ) : (
                <p className="muted">尚未被内容引用</p>
              )}
            </Form>
          </>
        )}
      </Drawer>
    </>
  );
}
const sections: Record<
  string,
  { title: string; description: string; fields: [keyof Site, string, string?][] }
> = {
  navigation: {
    title: '顶部导航',
    description: '编辑右上角蓝色按钮和导航菜单，保存并发布后同步前台',
    fields: [],
  },
  modules: { title: '模块设置', description: '控制每个模块显示和标题文案', fields: [] },
  collections: {
    title: '文章模块',
    description: '配置 AI 入门知识等文件夹中的展示文章，前后台共用文章数据',
    fields: [],
  },
  profile: {
    title: '个人资料',
    description: '介绍你是谁，以及你正在探索的方向',
    fields: [
      ['name', '昵称'],
      ['role', '个人定位'],
      ['heroImage', '首屏人物图', 'image'],
      ['avatar', '头像', 'image'],
      ['aboutTitle', '介绍标题'],
      ['aboutHighlight', '标题强调文字'],
      ['aboutDescription', '个人介绍', 'textarea'],
      ['exploreTitle', '探索宣言'],
      ['exploreHighlight', '宣言强调文字'],
      ['tags', '身份标签', 'tags'],
    ],
  },
  announcement: {
    title: '首页与公告',
    description: '设置首屏表达和课程上新公告',
    fields: [
      ['heroEyebrow', '首屏英文标记'],
      ['heroSubtitle', '首屏副标题'],
      ['announcement', '公告内容'],
      ['announcementVisible', '显示公告', 'switch'],
      ['splashEnabled', '启用首屏桌面鼠标流体动效', 'switch'],
    ],
  },
  course: {
    title: '课程与服务',
    description: '编辑打字机纸张上的介绍和课程咨询入口',
    fields: [
      ['courseTitle', '课程标题'],
      ['courseHighlight', '课程强调文字'],
      ['courseAudience', '适合人群', 'textarea'],
      ['courseImage', '打字机图片', 'image'],
      ['courseIntro', '课程介绍（每行一段）', 'lines'],
      ['courseMethod', '学习方式', 'textarea'],
      ['courseStats', '课程指标（用｜分隔）'],
      ['courseUrl', '课程咨询地址（可留空）'],
    ],
  },
  contact: {
    title: '联系方式',
    description: '维护创意挂卡、二维码和社交平台入口',
    fields: [
      ['contactTitle', '邀请标题'],
      ['wechatIcon', '微信品牌图标', 'image'],
      ['cardFront', '名片正面', 'image'],
      ['cardBack', '名片背面／微信二维码（等比完整显示）', 'image'],
      ['strap', '吊绳纹理', 'image'],
    ],
  },
  seo: {
    title: '站点设置',
    description: '设置品牌、搜索引擎摘要和分享信息',
    fields: [
      ['brand', '站点名称'],
      ['seoTitle', '网页标题'],
      ['seoDescription', '搜索摘要', 'textarea'],
      ['shareImage', '分享图片', 'image'],
    ],
  },
};
const fieldGroups: Record<string, { title: string; description: string; keys: (keyof Site)[] }[]> =
  {
    profile: [
      {
        title: '身份与形象',
        description: '用于首页人物和导航头像。',
        keys: ['name', 'role', 'heroImage', 'avatar'],
      },
      {
        title: '介绍与表达',
        description: '让访客了解你的经历与探索方向。',
        keys: [
          'aboutTitle',
          'aboutHighlight',
          'aboutDescription',
          'exploreTitle',
          'exploreHighlight',
          'tags',
        ],
      },
    ],
    announcement: [
      {
        title: '首屏文案',
        description: '访客打开网站时看到的第一句话。',
        keys: ['heroEyebrow', 'heroSubtitle'],
      },
      {
        title: '公告与动效',
        description: '管理公告展示和首屏鼠标效果。',
        keys: ['announcement', 'announcementVisible', 'splashEnabled'],
      },
    ],
    course: [
      {
        title: '课程概览',
        description: '课程标题、适合人群和展示图片。',
        keys: ['courseTitle', 'courseHighlight', 'courseAudience', 'courseImage'],
      },
      {
        title: '内容与咨询',
        description: '打字机纸张中的介绍与咨询入口。',
        keys: ['courseIntro', 'courseMethod', 'courseStats', 'courseUrl'],
      },
    ],
    contact: [
      {
        title: '联系邀请',
        description: '联系区域的标题与微信图标。',
        keys: ['contactTitle', 'wechatIcon'],
      },
      {
        title: '创意挂卡',
        description: '正反面素材与吊绳纹理。',
        keys: ['cardFront', 'cardBack', 'strap'],
      },
    ],
    seo: [
      {
        title: '品牌与搜索',
        description: '浏览器标题及搜索引擎中的展示信息。',
        keys: ['brand', 'seoTitle', 'seoDescription'],
      },
      { title: '分享封面', description: '分享网站时使用的图片。', keys: ['shareImage'] },
    ],
  };
function Settings({ section }: { section: string }) {
  const [record, setRecord] = useState<any>(),
    [draft, setDraft] = useState<Site>(),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false),
    [versions, setVersions] = useState<any[] | null>(null);
  const config = sections[section];
  const load = async () => {
    const r = await request('admin/site');
    setRecord(r);
    setDraft(normalizeSite(r.draft));
    setDirty(false);
  };
  useEffect(() => {
    void load().catch(toastError);
  }, []);
  const update = (key: keyof Site, value: any) => {
    setDraft((s) => (s ? { ...s, [key]: value } : s));
    setDirty(true);
  };
  const save = async () => {
    if (!draft) return null;
    setSaving(true);
    try {
      const r = await request('admin/site', {
        method: 'PUT',
        body: JSON.stringify({ content: draft, revision: record.revision }),
      });
      setRecord(r);
      setDraft(normalizeSite(r.draft));
      setDirty(false);
      Message.success('草稿已保存');
      return r;
    } catch (e) {
      toastError(e);
      return null;
    } finally {
      setSaving(false);
    }
  };
  if (!draft) return <Spin />;
  return (
    <div className="settings-layout">
      <Card className="settings-main-card">
        <div className="list-toolbar">
          <div>
            <h2>编辑{config.title}</h2>
            <p className="muted">{config.description}</p>
          </div>
          <Tag color={dirty ? 'orange' : 'green'}>{dirty ? '有未保存修改' : '已保存草稿'}</Tag>
        </div>
        <div className="save-bar">
          <span className="muted">
            V{record.revision} · {date(record.updatedAt)}
          </span>
          <Space>
            <Button loading={saving} onClick={save}>
              保存草稿
            </Button>
            <Button
              icon={<IconEye />}
              onClick={async () => {
                if (dirty && !(await save())) return;
                try {
                  const p = await request('admin/preview', {
                    method: 'POST',
                    body: JSON.stringify({ kind: 'site' }),
                  });
                  window.open(p.url, '_blank');
                } catch (e) {
                  toastError(e);
                }
              }}
            >
              预览
            </Button>
            <Popconfirm
              title="将当前站点配置发布到前台？"
              onOk={async () => {
                if (dirty && !(await save())) return;
                try {
                  await request('admin/site/publish', { method: 'POST' });
                  Message.success('已提交发布，前台正在同步');
                } catch (e) {
                  toastError(e);
                }
              }}
            >
              <Button type="primary" loading={saving}>
                发布更新
              </Button>
            </Popconfirm>
          </Space>
        </div>
        <Form layout="vertical" className="settings-form">
          <SiteControls section={section} draft={draft} update={update} />
          {(fieldGroups[section] || []).map((group, groupIndex) => (
            <SettingsGroup
              key={group.title}
              number={String(groupIndex + 1).padStart(2, '0')}
              title={group.title}
              description={group.description}
            >
              <div className="field-grid">
                {group.keys
                  .map((field) => config.fields.find(([key]) => key === field)!)
                  .map(([key, label, type]) => (
                    <Form.Item
                      key={key}
                      label={label}
                      className={type ? `field-${type}` : undefined}
                    >
                      {type === 'image' ? (
                        <ImageField value={draft[key] as string} onChange={(v) => update(key, v)} />
                      ) : type === 'switch' ? (
                        <Switch checked={draft[key] as boolean} onChange={(v) => update(key, v)} />
                      ) : type === 'tags' ? (
                        <IdentityTags value={draft.tags} onChange={(v) => update(key, v)} />
                      ) : type === 'lines' ? (
                        <TextArea
                          autoSize={{ minRows: 4, maxRows: 12 }}
                          value={(draft[key] as string[]).join('\n')}
                          onChange={(v) => update(key, v.split('\n'))}
                        />
                      ) : type === 'textarea' ? (
                        <TextArea
                          autoSize={{ minRows: 3, maxRows: 8 }}
                          value={draft[key] as string}
                          onChange={(v) => update(key, v)}
                        />
                      ) : (
                        <Input value={draft[key] as string} onChange={(v) => update(key, v)} />
                      )}
                    </Form.Item>
                  ))}
              </div>
            </SettingsGroup>
          ))}
          {section === 'contact' && (
            <SettingsGroup
              number="03"
              title="社交平台"
              description="管理平台名称、主页地址和官方图标。"
            >
              {draft.socials.map((s, i) => (
                <div className="social-edit" key={i}>
                  <Form.Item label="平台名称">
                    <Input
                      value={s.name}
                      placeholder="平台名称"
                      onChange={(v) =>
                        update(
                          'socials',
                          draft.socials.map((s, j) => (i === j ? { ...s, name: v } : s)),
                        )
                      }
                    />
                  </Form.Item>
                  <Form.Item label="主页链接">
                    <Input
                      value={s.url}
                      placeholder="https://"
                      onChange={(v) =>
                        update(
                          'socials',
                          draft.socials.map((s, j) => (i === j ? { ...s, url: v } : s)),
                        )
                      }
                    />
                  </Form.Item>
                  <Form.Item label="平台图标" className="field-image">
                    <ImageField
                      value={s.icon}
                      onChange={(v) =>
                        update(
                          'socials',
                          draft.socials.map((s, j) => (i === j ? { ...s, icon: v } : s)),
                        )
                      }
                    />
                  </Form.Item>
                  <Button
                    status="danger"
                    type="text"
                    onClick={() =>
                      update(
                        'socials',
                        draft.socials.filter((_, j) => i !== j),
                      )
                    }
                  >
                    移除平台
                  </Button>
                </div>
              ))}
              <Button
                icon={<IconPlus />}
                onClick={() =>
                  update('socials', [...draft.socials, { name: '新平台', url: '', icon: '' }])
                }
              >
                添加平台
              </Button>
            </SettingsGroup>
          )}
        </Form>
      </Card>
      <div className="settings-aside">
        <Card title="编辑与发布">
          <div className="publish-steps">
            <span>
              01 <strong>编辑内容</strong>
              <p>修改文案、图片或链接。</p>
            </span>
            <span>
              02 <strong>保存并预览</strong>
              <p>草稿仅在授权预览中可见。</p>
            </span>
            <span>
              03 <strong>发布更新</strong>
              <p>同步媒体后更新公开页面。</p>
            </span>
          </div>
          <Button
            long
            icon={<IconHistory />}
            onClick={async () => setVersions(await request('admin/site/versions'))}
          >
            查看历史版本
          </Button>
        </Card>
        <Card title="相关设置">
          <div className="related-settings">
            {['navigation', 'modules', 'collections', 'profile', 'contact', 'seo']
              .filter((key) => key !== section)
              .map((key) => (
                <a href={`#${key}`} key={key}>
                  {sections[key].title}
                  <IconArrowRight />
                </a>
              ))}
          </div>
        </Card>
      </div>
      <Modal
        title="站点历史版本"
        visible={versions !== null}
        footer={null}
        onCancel={() => setVersions(null)}
      >
        <Table
          rowKey="id"
          data={versions || []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '版本', dataIndex: 'revision' },
            { title: '时间', dataIndex: 'createdAt', render: (v: string) => date(v) },
            {
              title: '操作',
              render: (_: any, v: any) => (
                <Popconfirm
                  title="恢复此版本为草稿？"
                  onOk={async () => {
                    await request(`admin/site/restore/${v.id}`, { method: 'POST' });
                    setVersions(null);
                    await load();
                    Message.success('已恢复为草稿，请预览后发布');
                  }}
                >
                  <Button type="text">恢复</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
function App() {
  const [user, setUser] = useState<any>(),
    [ready, setReady] = useState(false),
    [section, setSection] = useState(location.hash.slice(1).split('?')[0] || 'dashboard');
  useEffect(() => {
    request('auth/me')
      .then((u) => {
        setCsrf(u.csrf);
        setUser(u);
      })
      .catch(() => {})
      .finally(() => setReady(true));
    const expired = () => {
      setUser(null);
      setCsrf('');
      Message.warning('登录已过期，请重新登录');
    };
    const changed = () => setSection(location.hash.slice(1).split('?')[0] || 'dashboard');
    addEventListener('session-expired', expired);
    addEventListener('hashchange', changed);
    return () => {
      removeEventListener('session-expired', expired);
      removeEventListener('hashchange', changed);
    };
  }, []);
  const navigate = (key: string) => {
    location.hash = key;
    setSection(key);
  };
  if (!ready)
    return (
      <div className="initial-loading">
        <Spin tip="正在准备工作台" />
      </div>
    );
  if (!user) return <Login onLogin={setUser} />;
  const title = groups.find((g) => g.key === section)?.title || '工作台';
  return (
    <Layout className="admin-layout">
      <Sider width={224} className="admin-sider">
        <a className="admin-logo" href="#dashboard" onClick={() => navigate('dashboard')}>
          <span>✦</span>
          <div>
            森语设计所<small>CONTENT STUDIO</small>
          </div>
        </a>
        <div className="menu-caption">工作空间</div>
        <Menu selectedKeys={[section]} onClickMenuItem={navigate}>
          {groups.slice(0, 4).map((g) => (
            <Menu.Item key={g.key}>
              {g.icon}
              {g.title}
            </Menu.Item>
          ))}
          <div className="menu-caption">网站内容</div>
          {groups.slice(4, 12).map((g) => (
            <Menu.Item key={g.key}>
              {g.icon}
              {g.title}
            </Menu.Item>
          ))}
          <div className="menu-caption">系统管理</div>
          <Menu.Item key="account">
            <IconUser />
            账号与会话
          </Menu.Item>
        </Menu>
        <div className="sider-bottom">
          <span className="status-dot" /> 内容服务已连接 <small>LOCAL MEDIA · MYSQL 8</small>
        </div>
      </Sider>
      <Layout className="admin-main">
        <Header className="admin-header">
          <div className="breadcrumb">
            工作空间 <span>/</span> <strong>{title}</strong>
          </div>
          <Space size={20}>
            <Button
              type="text"
              icon={<IconLaunch />}
              onClick={() =>
                window.open(
                  import.meta.env.VITE_WEB_ORIGIN || location.origin.replace(':5173', ':3000'),
                  '_blank',
                )
              }
            >
              查看网站
            </Button>
            <span className="header-divider" />
            <Avatar size={30} style={{ backgroundColor: '#eee9ff', color: '#7550a6' }}>
              A
            </Avatar>
            <span>{user.username}</span>
            <Button
              type="text"
              aria-label="退出登录"
              icon={<IconExport />}
              onClick={() =>
                request('auth/logout', { method: 'POST' })
                  .then(() => {
                    setUser(null);
                    setCsrf('');
                  })
                  .catch(toastError)
              }
            />
          </Space>
        </Header>
        <Content className="admin-content">
          <div className="page-heading">
            <div>
              <p className="overline">SENYU / CONTENT STUDIO</p>
              <h1>{title}</h1>
            </div>
            <span className="today">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </span>
          </div>
          {section === 'dashboard' ? (
            <Dashboard navigate={navigate} />
          ) : section === 'articles' ? (
            <Articles />
          ) : section === 'categories' ? (
            <Categories />
          ) : section === 'media' ? (
            <MediaLibrary />
          ) : section === 'account' ? (
            <Account
              onSignedOut={() => {
                setUser(null);
                setCsrf('');
              }}
            />
          ) : sections[section] ? (
            <Settings key="site-settings" section={section} />
          ) : (
            <Dashboard navigate={navigate} />
          )}
          <div className="admin-footer">森语设计所 · 每一个想法，都值得被认真记录。</div>
        </Content>
      </Layout>
    </Layout>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
