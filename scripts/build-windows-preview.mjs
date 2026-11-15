import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw new Error('Windows preview builds require Windows and the MSVC Rust toolchain.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'src-tauri', 'target');
const cli = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root, env: { ...process.env, CARGO_TARGET_DIR: target },
    stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}: ${result.stderr || ''}`);
  return result.stdout?.trim();
}

const commit = run('git', ['rev-parse', 'HEAD'], true);
const branch = run('git', ['branch', '--show-current'], true);
const dirty = Boolean(run('git', ['status', '--porcelain', '--untracked-files=no'], true));
const revision = `${commit.slice(0, 7)}${dirty ? '-dirty' : ''}`;
const config = JSON.parse(readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'));
config.productName = 'LensBorder-Pro-Preview';
config.identifier = 'com.redwood.lensborder.preview';
config.mainBinaryName = 'lensborder-preview';
config.app.windows = config.app.windows.map(window => ({
  ...window, title: `LensBorder Pro - Preview (${revision})`,
}));
config.bundle.targets = ['nsis'];
config.bundle.windows.nsis.installMode = 'currentUser';
const configPath = path.join(root, 'src-tauri', 'tauri.preview.conf.json');
writeFileSync(configPath, JSON.stringify(config, null, 2));
run(process.execPath, [cli, 'build', '--ci', '--bundles', 'nsis', '--config', configPath, '--', '--locked']);

const output = path.join(root, 'output', 'windows-preview', revision);
mkdirSync(output, { recursive: true });
const binaryName = `${config.mainBinaryName}.exe`;
copyFileSync(path.join(target, 'release', binaryName), path.join(output, binaryName));
const installerName = `${config.productName}_${config.version}_x64-setup.exe`;
copyFileSync(path.join(target, 'release', 'bundle', 'nsis', installerName), path.join(output, installerName));
copyFileSync(path.join(root, 'docs', 'hdr-export.md'), path.join(output, 'HDR-EXPORT.md'));
writeFileSync(path.join(output, 'build-info.json'), JSON.stringify({
  version: config.version, branch, commit, dirty, platform: 'windows-x64',
  builtAt: new Date().toISOString(), identifier: config.identifier,
}, null, 2));
writeFileSync(path.join(output, 'README.txt'), `LensBorder Pro Windows 测试版 (${revision})

免安装：直接运行 ${binaryName}。
安装版：运行 ${installerName}，可创建桌面快捷方式。
测试版使用独立名称和应用标识，可与正式版并存。
需要 Microsoft Edge WebView2 Runtime；安装器会在缺失时安装。
本地测试包未做代码签名。

本次包含：统一的新桌面/窗口图标、Display P3 HDR 高光修复、HDR 预览。
HDR 显示需要系统、屏幕和查看器支持；不支持时预览明确标为 SDR。
SHA256SUMS.txt 可用于检查文件完整性。构建来源见 build-info.json。
分支：${branch}
提交：${commit}${dirty ? '（含未提交修改）' : ''}
`);
const checksums = readdirSync(output).filter(name => name.endsWith('.exe')).sort().map(name =>
  `${createHash('sha256').update(readFileSync(path.join(output, name))).digest('hex')}  ${name}`);
writeFileSync(path.join(output, 'SHA256SUMS.txt'), `${checksums.join('\n')}\n`);
console.log(`Windows preview ready: ${output}`);
