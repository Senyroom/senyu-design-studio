# 素材与第三方声明

## 自有代码和演示素材

本项目自有应用代码、文档及原创演示素材使用根目录 MIT 许可证。默认人物、头像、打字机、名片和挂绳由 `scripts/generate-demo-assets.mjs` 中的原创 SVG 绘制，可重新生成。名片背面为占位图，不是个人微信二维码。

公开默认数据为 9 篇原创示例文章、通用身份标签与示例课程介绍，不代表真实履历或已经出售的产品。生产数据库、媒体、面板配置和备份没有包含在公开仓库中。

## 线上演示截图

`docs/screenshots/live-*.jpg` 经站点所有者要求，直接截取自 [森语设计所线上演示](https://www.lsenyu.cn/)（2026-11-07），用于说明实际页面效果。截图中的品牌、人物形象及第三方内容保留各自权利归属；截图展示不代表将其中素材作为 MIT 示例插画重新许可。可自由替换的默认演示素材仍以 `seed-assets/` 和生成脚本为准。

## 设计参考

布局与交互研究参考 [浪味设计所](https://www.vibedesignlab.xyz/) 及 [作者公开流程](https://www.uisdc.com/personal-site-build)。本项目不声称为原作者的官方源码。原站图片、二维码、下载的原始 CSS 和课程资料不随本开源版本分发。第三方品牌、设计与内容不因本仓库公开而改变权利归属；另行使用原站素材时，应取得适用授权。

## React Bits

源码：[DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)，复制基准提交 `4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4`。

`apps/web/components/reactbits/` 内的 Splash Cursor、Falling Text、Folder 和 Lanyard 使用上游 MIT + Commons Clause，完整原文见 [docs/React-Bits-LICENSE.md](docs/React-Bits-LICENSE.md)。这些组件作为完整网站应用的一部分使用和分发，根目录 MIT 不重新许可该目录。请保留上游声明，并遵守其中对组件本身的销售、再许可及分发限制。该部分带附加限制，不能把仓库所有文件统称为无附加条件的 MIT。

本地适配包括标签布局与键盘操作、文件夹业务卡片与磨砂样式、挂卡翻面和背面等比完整显示、首屏流体作用范围。课程打字机业务动画、文章星球与滚动层叠由本项目实现。

## 字体

`apps/web/public/fonts/` 中的 Source Han Sans CN、Smiley Sans、Inter 保留原始字体名称、版权与 SIL Open Font License 1.1。完整许可及字体 name 表记录位于 [docs/licenses/](docs/licenses/)。字体不按根目录 MIT 重新许可。

## 品牌图标

`seed-assets/official-*.svg` 的微信、小红书、抖音轮廓来自 [Simple Icons v16](https://github.com/simple-icons/simple-icons/tree/16.0.0/icons)，使用 CC0-1.0。派生 PNG 和前台品牌图标具有相同来源。品牌名称和商标归各自权利人；使用图标不表示官方合作或认可。

## 软件依赖

Next.js、React、NestJS、Prisma、Arco Design、Tiptap、Three.js、Matter.js、Sharp、Argon2、Zod、ioredis 等保留各自软件包许可证。依赖版本以 `pnpm-lock.yaml` 为准。
