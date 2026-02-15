# LensBorder Pro

一个本地运行的摄影水印边框 Web App，支持上传照片、读取 EXIF 元数据、选择多种模板并导出高清水印边框图。所有处理均在浏览器本地完成，不会上传照片。可以直接点击下方链接下载对应平台的安装包：

## 📥 下载安装 (Latest Version: v0.1.0)

所有安装包均已通过 GitHub Actions 自动构建，点击下方链接即可下载对应系统的原生程序：

| 平台 | 安装包下载 | 体积 |
| :--- | :--- | :--- |
| **Windows** | [🚀 点击下载 .exe 安装程序 (推荐)](https://github.com/GreFir/LensBorder-Pro/releases/latest/download/LensBorder-Pro_0.1.0_x64-setup.exe) | 1.81 MB |
| **Windows** | [📦 点击下载 .msi 安装包](https://github.com/GreFir/LensBorder-Pro/releases/latest/download/LensBorder-Pro_0.1.0_x64_en-US.msi) | 2.71 MB |
| **macOS** | [🍎 点击下载 .dmg (Apple Silicon)](https://github.com/GreFir/LensBorder-Pro/releases/latest/download/LensBorder-Pro_0.1.0_aarch64.dmg) | 2.71 MB |
| **Linux** | [🐧 点击下载 .AppImage (通用)](https://github.com/GreFir/LensBorder-Pro/releases/latest/download/LensBorder-Pro_0.1.0_amd64.AppImage) | 76.8 MB |
| **Linux** | [📦 点击下载 .deb (Ubuntu/Debian)](https://github.com/GreFir/LensBorder-Pro/releases/latest/download/LensBorder-Pro_0.1.0_amd64.deb) | 2.82 MB |
| **Linux** | [📦 点击下载 .rpm (Fedora/RedHat)](https://github.com/GreFir/LensBorder-Pro/releases/latest/download/LensBorder-Pro-0.1.0-1.x86_64.rpm) | 2.82 MB |

> 点击上面的链接没有反应直接转到 [Releases 页面](https://github.com/GreFir/LensBorder-Pro/releases) 查看。

![alt text](image.png)

## 功能特性

- EXIF 自动读取与手动校正（机身、镜头、焦距、光圈、快门、ISO、时间等）
- 多模板引擎（Classic / Postcard / Minimal / Glassframe / Floating / Lagoon / Palette Card 等）
- 右侧参数面板（开关、配色、渐变、阴影、圆角、模板专属参数）
- 预览区支持缩放、拖拽、滚轮缩放
- 高清导出（按原图分辨率渲染）
- 自定义叠加：文字 / 贴图

## 技术栈

- React + Vite
- Tailwind CSS
- Canvas API
- ExifReader

## 本地运行

```bash
npm install
npm run dev
```

构建生产版本：

```bash
npm run build
npm run preview
```

## 项目结构

```
src/
  components/
    TemplatePanel.jsx       # 左侧模板/导入/缩放/导出面板
    SettingsPanel.jsx       # 右侧参数面板（可折叠）
    PreviewArea.jsx         # 预览区域（缩放、拖拽、滚轮）
  constants/
    templates.js            # 模板列表与基本信息
    palettes.js             # 颜色方案
    metadataFields.js       # EXIF 字段与显示开关
  utils/
    canvasUtils.js          # Canvas 核心渲染逻辑（模板绘制）
    exifUtils.js            # EXIF 读取与格式化
    colorUtils.js           # 辅助取色（用于玻璃效果等）
  App.jsx                   # 状态管理与主布局
  index.css                 # 全局样式与字体
```

## 核心配置说明

- `App.jsx`
  - `getDefaultConfig()`：全局默认参数配置（模板、阴影、渐变、圆角等）
  - `config`：所有 UI 和渲染相关的配置都在这里集中管理

- `canvasUtils.js`
  - `renderFrame()`：统一绘制入口
  - `TEMPLATE_STYLES`：各模板的布局比例
  - `TEMPLATE_RENDERERS`：模板绘制函数注册

## 如何新增自定义模板

> 新模板只需完成 “模板注册 + 绘制逻辑 +（可选）UI 预览/参数”。

### 1) 注册模板
在 `src/constants/templates.js` 中添加：

```js
{ id: 'my-template', label: 'My Template', caption: '模板描述', hasBottomBar: true }
```

### 2) 添加模板样式比例
在 `src/utils/canvasUtils.js` 的 `TEMPLATE_STYLES` 增加：

```js
'\'my-template\'': { frameScale: 1.2, bottomScale: 1.0 }
```

### 3) 编写绘制函数
在 `canvasUtils.js` 中新增绘制函数，例如：

```js
const drawMyTemplate = (ctx, layout, config, text) => {
  // 自定义绘制
}
```

并注册到 `TEMPLATE_RENDERERS`：

```js
'\'my-template\'': drawMyTemplate
```

### 4) 添加模板缩略图（可选）
在 `src/components/TemplatePanel.jsx` 的 `TemplatePreview` 里增加一个分支，用简化的图形表示模板。

### 5) 增加模板专属参数（可选）
- 在 `App.jsx -> getDefaultConfig()` 添加默认参数
- 在 `SettingsPanel.jsx` 内根据 `config.template` 条件渲染专属控制项
- 在模板绘制函数中读取这些参数

## 渐变纸面设置

- 打开“纸面渐变开关”后，支持自定义渐变方向与多段颜色（类似 PowerPoint）
- 相关配置位于 `config.paperGradientEnabled` / `config.paperGradientStops` / `config.paperGradientDirection`

## 自定义叠加（文字/贴图）

- 右侧面板可添加“文字叠加”或“贴图叠加”
- 叠加数据存储于 `config.overlays`
- 绘制逻辑在 `canvasUtils.js` 的 `drawOverlays()`

## 注意事项

- EXIF 读取失败时允许手动补充字段
- 导出图像为 JPEG，质量默认 0.95
- 大图渲染较慢时可降低预览缩放

---

如需新增样式或功能，请按照以上结构扩展即可。
