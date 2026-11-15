# Windows 本地测试包

在安装 Node.js、Rust MSVC 工具链、Visual Studio C++ 构建工具的 Windows x64 机器上执行：

```sh
npm ci
npm run build:windows:preview
```

脚本使用仓库中已生成的 Tauri 图标和锁定的 Cargo 依赖，构建 release EXE 与 NSIS 安装器，并将结果放入 `output/windows-preview/<提交短哈希>/`。如果构建时存在已跟踪文件修改，目录和窗口标题会带 `-dirty`。

产物包括免安装 EXE、当前用户安装器、SHA-256 校验值和构建来源。测试版使用 `LensBorder-Pro-Preview` 名称与 `com.redwood.lensborder.preview` 标识，与正式版分开。本地打包不会推送代码、创建发布或合并分支。

原始图标配置用于 EXE、窗口及快捷方式；NSIS 安装器也显式使用同一份 `icons/icon.ico`。修改 `src/assets/app-icon.svg` 后运行 `npm run icons`，并将生成图标与源文件一起提交，再构建测试包。打包过程不会反复重写各平台的图标文件。
