# 森语设计所 · Senyu Design Studio

**一个可自部署的设计师个人网站与内容管理系统。** 用它展示个人介绍、项目与学习笔记、课程服务和联系方式，在独立后台管理内容并发布到前台。

[![Verify](https://github.com/Senyroom/senyu-design-studio/actions/workflows/verify.yml/badge.svg)](https://github.com/Senyroom/senyu-design-studio/actions/workflows/verify.yml)
![Node.js 24](https://img.shields.io/badge/Node.js-24-43853d)
![MySQL 8](https://img.shields.io/badge/MySQL-8-4479a1)
![Redis 7.4](https://img.shields.io/badge/Redis-7.4-DC382D)

[在线演示](https://www.lsenyu.cn/) · [安装教程](docs/安装教程.md) · [后台使用](docs/后台使用教程.md) · [Docker / 宝塔部署](docs/部署教程.md) · [架构与接口](docs/架构与接口.md) · [素材与许可](THIRD_PARTY_NOTICES.md)

## 在线演示

**演示站：[www.lsenyu.cn](https://www.lsenyu.cn/)**，即森语设计所当前的线上站点。可直接体验首页、文章文件夹、课程打字机和翻面名片。

[个人介绍](https://www.lsenyu.cn/#about) · [文章与玻璃文件夹](https://www.lsenyu.cn/#articles) · [课程与打字机](https://www.lsenyu.cn/#courses) · [联系与互动名片](https://www.lsenyu.cn/#contact)

下方前台截图直接采自该线上站点（2026-11-07），展示实际页面效果。仓库的前台布局、样式和交互实现与该项目一致；首次安装使用独立示例文案和插画，站点名称、个人形象、文章、课程及联系方式可在后台替换为自己的内容。线上后台用于实际内容管理，不提供公开共享账号。

![线上演示：首页](docs/screenshots/live-home.jpg)

## 这个项目能做什么

适合设计师、独立开发者、自由职业者和希望长期记录作品的创作者。

- **个人展示**：介绍、头像、主视觉、公告、自定义身份标签、社交入口、翻面名片。
- **内容创作**：站内富文本文章和外链文章、分类、封面、摘要、排序与 SEO。
- **可管理首页**：后台编辑顶部导航和按钮、显示隐藏模块、维护三个文章文件夹、配置课程内容与跳转。
- **完整发布流程**：保存草稿 → 签名预览 → 发布 → 媒体同步；支持版本恢复、冲突检查与失败重试。
- **本地图片媒体库**：图片保存在自己的服务器，生成缩略图，区分私有原件和已发布副本。
- **一致的公开数据**：MySQL 8 是权威数据源，Redis 缓存公开 JSON；发布时切换缓存版本，草稿不进入公共缓存。

它是一个前台、后台、API 和数据库齐全的单站长网站应用。当前没有支付、会员、多人审批或视频托管功能。

## 界面与交互

- 首屏彩色鼠标流体、玻璃导航，鼠标流体限定在顶部区域。
- 可拖动、可键盘操作的掉落身份标签。
- 三个磨砂玻璃文件夹，卡片开合、列表与文章星球联动。
- 进入视口自动打印的课程打字机，独立键帽下压并回弹。
- 可拖动的 3D 挂卡，点击微信翻面；背面图片等比完整显示。
- 手机与平板断点、键盘聚焦与减少动态效果偏好支持；后台以桌面管理为主。

![线上演示：文章文件夹](docs/screenshots/live-articles.jpg)

![线上演示：课程打字机](docs/screenshots/live-course.jpg)

以下为独立安装环境的后台截图：

![Arco 内容后台](docs/screenshots/admin.png)

![自定义身份标签](docs/screenshots/profile.png)

> 线上截图用于展示正式站效果；后台截图来自本仓库的独立示例环境。默认安装内容为 9 篇原创演示文章、通用身份标签与原创示例插画，名片背面为占位图。可查看[默认安装首页](docs/screenshots/home.png)、[示例文章模块](docs/screenshots/articles.png)和[示例课程模块](docs/screenshots/course.png)。仓库不包含生产数据库、凭据或个人微信二维码。

## 技术栈

| 层次 | 技术与职责 |
| --- | --- |
| 访客前台 | Next.js 16、React 19、TypeScript |
| 管理后台 | React、Vite、Arco Design、Tiptap 富文本编辑器 |
| 服务端 | NestJS、Prisma、Zod、Argon2id、Cookie 会话与 CSRF 校验 |
| 数据库 | MySQL 8，草稿、发布快照、修订和发布任务 |
| 缓存 | Redis / ioredis，版本化公开数据缓存与故障回源 |
| 动效 | Three.js、Matter.js、Web Animations、React Bits 组件 |
| 媒体 | 本地磁盘、Sharp、私有原件与公开引用副本 |
| 部署 | Docker Compose、Nginx，或宝塔 Node 项目 |
| 检查 | TypeScript、真实 MySQL / Redis 集成测试、GitHub Actions |

## 快速安装：本地开发

要求 **Node.js 24、pnpm 11.25.0、Docker Engine / Docker Desktop（Linux 容器）**。数据库和 Redis 由开发 Compose 启动；应用在本机运行。Windows PowerShell、macOS 与 Linux 可使用同一组命令。

```bash
git clone https://github.com/Senyroom/senyu-design-studio.git
cd senyu-design-studio
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm setup:dev
docker compose -f compose.dev.yaml up -d --wait
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

| 入口 | 默认地址 |
| --- | --- |
| 前台 | http://localhost:3000/ |
| 内容后台 | http://localhost:5173/admin/ |
| API 健康 | http://127.0.0.1:4000/api/v1/health |
| 开发 API 文档 | http://127.0.0.1:4000/api/docs |

初始管理员账号和随机密码保存在 **`.local/登录信息.md`**。不存在共享的默认密码。`setup:dev` 不覆盖已有 `.env`；修改后台密码后，旧登录文件不会自动更新。

开发 MySQL 默认仅映射 `127.0.0.1:13306`，Redis 为 `127.0.0.1:16379`。本地媒体保存在 `.local/media`。已有 MySQL 8 / Redis 用户也可复制 `.env.example`，自行创建独立数据库、用户并配置连接地址；详见 [安装教程](docs/安装教程.md)。

## Docker 完整运行

在已经克隆并安装依赖的项目目录执行：

```bash
pnpm setup:production
# 首次体验保留 http://localhost:8080；正式部署时编辑 .local/production.env
# 配置实际域名与 HTTPS 后才启用 COOKIE_SECURE=true

docker compose --env-file .local/production.env build
docker compose --env-file .local/production.env up -d --wait mysql redis
docker compose --env-file .local/production.env run --rm init
docker compose --env-file .local/production.env up -d api web gateway
```

访问 `http://localhost:8080/` 和 `http://localhost:8080/admin/`。初始账号及随机密码在 `.local/production.env` 的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 中，仅在本机安全查看。

网关仅映射 `127.0.0.1:8080`；服务器对外使用 Nginx / Caddy 终止 HTTPS。MySQL、Redis、API 不公开宿主机端口。完整步骤及宝塔 **Node 项目**部署见 [部署教程](docs/部署教程.md)。GitHub 用于托管源码；本项目需要 Node、数据库和媒体服务，不能直接当作纯静态 GitHub Pages 站点运行。

## 后台编辑与发布

1. 在 **媒体库** 上传自己的头像、主图、项目图片及二维码。
2. 在 **个人资料** 填写介绍和任意身份标签；标签支持添加、删除、排序。
3. 在 **顶部导航 / 模块设置 / 文章模块** 维护标题、按钮、链接与展示文章。
4. 在 **探索记录** 编辑站内文章或外链；在 **课程与服务 / 联系方式** 维护相关内容。
5. **保存草稿 → 预览 → 发布**，在工作台确认任务显示「已同步」。

分类修改为即时发布操作；站点资料和文章需单独发布。名片背面无论横图、竖图还是方图均保留原比例，不裁剪成铺满卡面。详见 [后台使用教程](docs/后台使用教程.md)。

## 缓存与数据

Redis 只保存公开首页及已发布文章 JSON，TTL 为 300 秒。MySQL 中的公共内容版本与发布 / 下线 / 分类变更在同一事务中更新，缓存 key 携带版本，因此发布不需要等待旧缓存过期。Redis 连接失败时回源 MySQL，恢复后不会读回旧版本。后台工作台显示缓存连接状态与命中次数。

数据库 SQL 与整个媒体目录必须一起备份；Redis 可重建。生产更新保留 `.env`、数据库和媒体，不要导入示例数据覆盖真实内容。

## 常用命令

```bash
pnpm typecheck       # 前台、后台与 API 的类型检查
pnpm build           # 生产构建，不依赖在线数据库查询
pnpm test            # 真实 MySQL / Redis / API / 前台集成检查
pnpm assets:demo     # 重新生成原创示例图片；不会自动覆盖已入库媒体
```

测试会暂时创建 / 发布 QA 内容，只在独立开发或 CI 数据库运行，不能对生产库执行。GitHub Actions 自动启动独立 MySQL 和 Redis 后检查安装、迁移、构建和集成测试。

## 项目结构

```text
apps/web/             Next.js 前台、预览、文章与交互
apps/admin/           Arco 内容后台、媒体库与编辑器
apps/api/             NestJS API、认证、发布与缓存
packages/contracts/   共享类型和默认模块配置
prisma/               MySQL 模型及版本化迁移
seed-assets/          原创演示图片、占位名片与品牌图标
scripts/              环境生成、初始化、图片生成、备份与恢复
deploy/               Nginx、HTTPS 和环境配置示例
docs/                 安装、使用、部署、架构、截图与许可证
tests/                数据一致性、媒体、认证与 Redis 测试
```

## 许可与致谢

自有应用代码和原创示例素材采用 [MIT](LICENSE)。React Bits 组件保留 **MIT + Commons Clause**，字体保留 **SIL OFL 1.1**，品牌图标来源为 Simple Icons **CC0**；根目录 MIT 不替代这些独立许可，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。

布局与交互研究参考 [浪味设计所](https://www.vibedesignlab.xyz/) 及其作者公开的 [个人网站从设计构思到部署上线流程](https://www.uisdc.com/personal-site-build)。这里公开的是本项目的独立应用实现，原站的图片、原始 CSS、文章资料及二维码没有随仓库分发。

欢迎提交 [Issue](https://github.com/Senyroom/senyu-design-studio/issues) 或 Pull Request。请先阅读 [贡献指南](CONTRIBUTING.md)，反馈问题时不要上传密码、Cookie、环境文件或真实用户数据。
