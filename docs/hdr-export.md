# HDR 成品 JPEG 导出

“预览与导出 → 动态范围”提供三个选项，应用启动时默认为 **自动（跟随每张原图）**。

| 选项 | 行为 |
| --- | --- |
| 自动 | 每张图片独立检测：支持的 HDR JPEG 保留 HDR，明确的 SDR 图片导出普通 JPEG。 |
| SDR JPEG | 明确导出 SDR。HDR JPEG 使用其 SDR 基底，而不是把高光硬裁掉。 |
| HDR JPEG | 保留原有 HDR 信息。原图没有支持的 HDR 数据时拒绝导出，不给 SDR 图片虚构高光。 |

单张和批量导出使用同一管线。批量任务捕获点击时的样式与质量，每张独立判断动态范围。
不加入 16-bit TIFF、EXR 或中间图导出；成品均为 `.jpg`。内部浮点处理只是为防止合成时裁掉高光。

## 支持范围（本次 PR）

支持 JPEG/R / Ultra HDR 的 **SDR 基底 + Adobe XMP 1.0 增益图**：
MPF 指向独立 JPEG 增益图，支持单通道或 RGB 增益图参数、sRGB 和标准 Display P3 ICC、全部八种 EXIF 方向。
没有 ICC 的 JPEG 按 sRGB 处理。输出包含 MPF、主图/增益图 XMP、全分辨率 RGB 增益图以及浏览器写入的 SDR 基底 ICC。
普通 JPEG 查看器仍可显示 SDR 基底；HDR 展示需要查看器、系统和屏幕共同支持。

以下情况不会在自动模式下悄悄降级：HEIC/AVIF、PQ/HLG PNG、仅 ISO 21496-1 二进制元数据的 JPEG、Apple 专有增益图、HDR 基底型增益图、未知 ICC、损坏/缺失增益图。
这些图片显示“不确定/不支持”的原因，要求明确选择 SDR，或先转换为支持的 HDR JPEG。
16-bit PNG 不会仅因为位深较高就被判定为 HDR。

**预览按显示环境切换**：浏览器报告 `(dynamic-range: high)` 时，生成包含增益图的成品 JPEG，通过原生图片元素显示，让浏览器执行 HDR 映射；不依赖普通 Canvas 的屏幕输出。生成期间、环境未启用 HDR 或处理失败时明确标注 SDR。显示器能力检测不代表每个浏览器都能正确显示 HDR，仍需实际设备验收。
预览最长边限制为 1400 像素，样式修改防抖、串行处理并取消过期任务；切换照片或屏幕不会保留旧 HDR 预览。明确选择 SDR 导出时，预览也切换为 SDR。导出仍保留完整分辨率。
导出本身不要求 HDR 屏幕。运行环境需要支持浮点 Canvas、Float16Array 和浮点 ImageData；不支持时明确报错，不输出伪 HDR。
不保证所有历史 WebView/Safari 版本支持。桌面打包与真实 HDR 屏幕显示仍需跨平台验收。

## 管线

1. 在 HEIC 转换或普通 Canvas 绘制前检查原始文件，保留原始 File。
2. SDR 基底用于缩略图及预览回退；HDR 预览和导出显式从基底、增益图及参数恢复高光，不依赖当前屏幕的 HDR 亮度。
3. 在线性光下将 Display P3 转换为扩展 sRGB 后，使用浮点 Canvas 复用现有模板渲染；保留负值和超过 1 的分量，避免 Chromium 在浮点 Display P3 Canvas 绘制时截断高光。右侧文字布局的旋转暂存图也保留浮点数据。计算增益前转换回原色彩空间，输出保留 P3 ICC。
4. 分别合成 HDR 与 SDR 成品，重新计算增益图。文字、白边、阴影与透明贴图不会简单套用照片原增益图。
5. 先压缩最终 SDR JPEG，再以实际压缩基底计算增益；将新增益图和 XMP/MPF 写入同一个 JPEG，同时保留原始 HDRCapacityMin / HDRCapacityMax 显示映射阈值。
6. 按行分块处理并让出事件循环，批量顺序执行并释放临时 Canvas。原图检测上限 128 MiB；HDR 图像上限 4800 万像素且单边不超过 16384。

导出选择独立于照片样式，不随“同步样式”传播。目录导出避免覆盖已有同名文件；浏览器回退下载需要允许多文件下载。

## 测试与限制

- `node --test tests/hdr.test.mjs`：JPEG marker/MPF 边界、损坏输入、参数校验、自动策略、EXIF、分配上限，以及与现有模板旋转列表的一致性。
- `python tests/browser-hdr.py`：真实 Chromium 的 JPEG → HDR 恢复 → 加框 → 成品 JPEG → HDR 恢复，检查高光、白边、半透明遮罩、RGB 增益、P3 高光与饱和色实际像素、八种方向和运行环境降级。设置 `HDR_APP_URL` 后还验证实际应用导出、原生增益图预览及照片/显示环境切换；HDR 媒体查询通过模拟触发，不等于实体屏幕验收。
- Python 测试需要 `playwright` 和 Chromium；可通过 `CHROMIUM_PATH` 指定现有浏览器。测试图片均即时合成，无外部照片或网络请求。
- GitHub Actions 执行单元测试、实现代码 lint、生产构建和浏览器像素测试；没有新增应用运行时依赖。
- 浏览器像素回归不等于实体 HDR 屏幕验收；尚未验证每个相机/手机厂商的文件，也没有声称支持所有 HDR 容器。

格式参考：https://developer.android.com/media/platform/hdr-image-format
Canvas 浮点工作图：https://html.spec.whatwg.org/multipage/canvas.html
扩展 sRGB 传递函数和 D65 色彩转换：https://www.w3.org/TR/css-color-4/#color-conversion-code
