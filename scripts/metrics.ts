// Generates docs/metrics/ from git history (never from the working tree):
//   README.md     file inventory with responsibilities, lines per zone, cyclomatic complexity delta
//   metrics.json  the same numbers, machine-readable
// Usage: npx tsx scripts/metrics.ts [base=final] [head=HEAD]
//
// Zones: kernel = packages/kernel/src; assembly = src (host: composition root, installer, loader);
// plugins = plugins/*/{index.ts,src}. At a ref without packages/kernel (Phase 1), src/main.ts is the
// assembly and the rest of src is the kernel. Tests, scripts, the VSCode extension, dependencies and
// build output are listed separately or excluded, as required by phase_cli_2 §7.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

type Zone = 'kernel' | 'assembly' | 'plugins' | 'tests' | 'vscode';
type FunctionMetric = { name: string; complexity: number };
type FileMetric = {
  path: string; zone: Zone; lines: number; code: number; complexity: number; functions: number;
  maxFunction?: FunctionMetric; responsibility: string;
};
type Snapshot = { ref: string; commit: string; files: FileMetric[] };

class GitSource {
  constructor(private readonly ref: string) {}
  commit(): string { return this.git('rev-parse', '--short', `${this.ref}^{commit}`).trim(); }
  files(): string[] { return this.git('ls-tree', '-r', '--name-only', this.ref).split('\n').filter(Boolean); }
  read(path: string): string { return this.git('show', `${this.ref}:${path}`); }
  private git(...args: string[]): string { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 }); }
}

class SourceMetrics {
  /** McCabe: 1 per function + 1 per branch point; nested functions are measured separately. */
  static functions(source: ts.SourceFile): FunctionMetric[] {
    const result: FunctionMetric[] = [];
    const isFunction = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
      ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)
      || ts.isGetAccessor(node) || ts.isSetAccessor(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node);
    const branches = (node: ts.Node): number => {
      let count = 0;
      const visit = (child: ts.Node): void => {
        if (isFunction(child)) return;
        if (ts.isIfStatement(child) || ts.isConditionalExpression(child) || ts.isForStatement(child)
          || ts.isForInStatement(child) || ts.isForOfStatement(child) || ts.isWhileStatement(child)
          || ts.isDoStatement(child) || ts.isCaseClause(child) || ts.isCatchClause(child)) count++;
        if (ts.isBinaryExpression(child) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.BarBarEqualsToken,
          ts.SyntaxKind.QuestionQuestionEqualsToken].includes(child.operatorToken.kind)) count++;
        ts.forEachChild(child, visit);
      };
      ts.forEachChild(node, visit);
      return count;
    };
    const walk = (node: ts.Node, owner: string): void => {
      if (isFunction(node)) {
        const name = node.name && ts.isIdentifier(node.name) ? node.name.text : ts.isConstructorDeclaration(node) ? 'constructor' : '(anonymous)';
        const qualified = owner ? `${owner}.${name}` : name;
        result.push({ name: qualified, complexity: 1 + branches(node) });
        ts.forEachChild(node, child => walk(child, qualified));
        return;
      }
      const scope = ts.isClassDeclaration(node) && node.name ? node.name.text : owner;
      ts.forEachChild(node, child => walk(child, scope));
    };
    walk(source, '');
    const moduleBranches = branches(source); // top-level statements, e.g. the composition root
    if (moduleBranches) result.unshift({ name: '(module)', complexity: 1 + moduleBranches });
    return result;
  }

  /** Lines that hold at least one token (blank and comment-only lines excluded). */
  static codeLines(source: ts.SourceFile): number {
    const lines = new Set<number>();
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, source.text);
    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
      const start = source.getLineAndCharacterOfPosition(scanner.getTokenStart()).line;
      const end = source.getLineAndCharacterOfPosition(scanner.getTokenEnd()).line;
      for (let line = start; line <= end; line++) lines.add(line);
    }
    return lines.size;
  }

  /** First doc comment (or leading line comment) of the file's main declaration. */
  static responsibility(source: ts.SourceFile): string {
    const declaration = source.statements.find(statement => ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)
      || ts.isTypeAliasDeclaration(statement)) ?? source.statements[0];
    if (!declaration) return '';
    const comments = ts.getLeadingCommentRanges(source.text, declaration.getFullStart()) ?? [];
    const text = comments.map(range => source.text.slice(range.pos, range.end)).join('\n');
    const cleaned = text.replace(/^\/\*\*?|\*\/$/gm, '').split('\n').map(line => line.replace(/^\s*(\*|\/\/)\s?/, '').trim())
      .filter(Boolean).join(' ');
    return (cleaned.split(/(?<=\.)\s/)[0] ?? '').replace(/\|/g, '\\|');
  }
}

class MetricsReport {
  snapshot(ref: string): Snapshot {
    const git = new GitSource(ref);
    const paths = git.files().filter(path => path.endsWith('.ts') && !path.endsWith('.d.ts') && !path.includes('node_modules/'));
    const modular = paths.some(path => path.startsWith('packages/kernel/src/'));
    const files = paths.flatMap(path => {
      const zone = this.zone(path, modular);
      if (!zone) return [];
      const text = git.read(path);
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      const functions = SourceMetrics.functions(source);
      const maxFunction = functions.reduce<FunctionMetric | undefined>((max, item) => !max || item.complexity > max.complexity ? item : max, undefined);
      return [{
        path, zone, lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0), code: SourceMetrics.codeLines(source),
        complexity: functions.reduce((sum, item) => sum + item.complexity, 0), functions: functions.length, maxFunction,
        responsibility: SourceMetrics.responsibility(source),
      } satisfies FileMetric];
    });
    return { ref, commit: git.commit(), files };
  }

  render(base: Snapshot, head: Snapshot): string {
    const zones: Zone[] = ['kernel', 'assembly', 'plugins'];
    const names: Record<Zone, string> = { kernel: '内核', assembly: '装配处', plugins: '插件', tests: '测试', vscode: 'VSCode 扩展' };
    const sum = (snapshot: Snapshot, zone: Zone, key: 'files' | 'code' | 'complexity' | 'lines') =>
      snapshot.files.filter(file => file.zone === zone).reduce((total, file) => total + (key === 'files' ? 1 : file[key]), 0);
    const row = (zone: Zone) => {
      const cells = (['files', 'lines', 'code', 'complexity'] as const).flatMap(key => {
        const before = sum(base, zone, key); const after = sum(head, zone, key);
        return key === 'complexity' ? [String(before), String(after), this.signed(after - before)] : [`${before} → ${after}`];
      });
      return `| ${names[zone]} | ${cells.join(' | ')} |`;
    };
    const cliZones = (snapshot: Snapshot, key: 'code' | 'complexity') => zones.reduce((total, zone) => total + sum(snapshot, zone, key), 0);
    const byPath = new Map(base.files.map(file => [file.path, file]));
    const inventory = (zone: Zone) => head.files.filter(file => file.zone === zone).map(file => {
      const before = byPath.get(file.path);
      return `| \`${file.path}\` | ${file.code} | ${file.complexity} | ${before ? this.signed(file.complexity - before.complexity) : 'new'} | ${file.maxFunction ? `${file.maxFunction.name} (${file.maxFunction.complexity})` : '-'} | ${file.responsibility} |`;
    });
    const removed = base.files.filter(file => !head.files.some(other => other.path === file.path) && zones.includes(file.zone));
    return [
      '# 代码指标（脚本生成，请勿手改）', '',
      `由 \`scripts/metrics.ts\` 从 git 历史生成：基线 \`${base.ref}\`（${base.commit}）对比 \`${head.ref}\`（${head.commit}）。`,
      '只统计 TypeScript 源码；依赖包与构建产物不计。代码行 = 含至少一个 token 的行（空行、纯注释行不计）。',
      '圈复杂度按 McCabe：每个函数/方法/箭头函数计 1，每个 if、?:、循环、case、catch、&&、||、?? 再加 1；嵌套函数单独计。',
      `分区：内核 = \`packages/kernel/src\`；装配处 = \`src\`（组合根、安装器、加载器）；插件 = \`plugins/*\`。基线 \`${base.ref}\` 尚无插件化目录，其 \`src/main.ts\` 记为装配处、其余 \`src\` 记为内核。`, '',
      '## CLI 行数与圈复杂度（内核 / 装配处 / 插件）', '',
      `| 分区 | 文件数 | 物理行 | 代码行 | 复杂度 ${base.ref} | 复杂度 ${head.ref} | 增量 |`, '|---|---|---|---|---|---|---|',
      ...zones.map(row),
      `| **CLI 合计** | | | ${cliZones(base, 'code')} → ${cliZones(head, 'code')} | ${cliZones(base, 'complexity')} | ${cliZones(head, 'complexity')} | ${this.signed(cliZones(head, 'complexity') - cliZones(base, 'complexity'))} |`, '',
      '## 单独列出（不计入 CLI 重构增量）', '',
      '| 分区 | 文件数 | 代码行 |', '|---|---|---|',
      ...(['tests', 'vscode'] as const).map(zone => `| ${names[zone]} | ${sum(base, zone, 'files')} → ${sum(head, zone, 'files')} | ${sum(base, zone, 'code')} → ${sum(head, zone, 'code')} |`), '',
      ...zones.flatMap(zone => [`## 文件清单与职责：${names[zone]}`, '',
        '| 文件 | 代码行 | 复杂度 | 较基线 | 最复杂函数 | 职责（取自源码首个文档注释） |', '|---|---|---|---|---|---|', ...inventory(zone), '']),
      ...(removed.length ? ['## 基线中已移除或改名的文件', '', ...removed.map(file => `- \`${file.path}\`（复杂度 ${file.complexity}）`), ''] : []),
    ].join('\n');
  }

  private zone(path: string, modular: boolean): Zone | undefined {
    if (path.startsWith('vscode-extension/')) return path.includes('/test/') ? 'tests' : 'vscode';
    if (/^(test|packages\/[^/]+\/test|plugins\/[^/]+\/test)\//.test(path)) return 'tests';
    if (path.startsWith('packages/kernel/src/')) return 'kernel';
    if (/^plugins\/[^/]+\/(index\.ts|src\/)/.test(path)) return 'plugins';
    if (path.startsWith('src/')) return modular || path === 'src/main.ts' ? 'assembly' : 'kernel';
    return undefined;
  }

  private signed(value: number): string { return value > 0 ? `+${value}` : String(value); }
}

const [base = 'final', head = 'HEAD'] = process.argv.slice(2);
const report = new MetricsReport();
const before = report.snapshot(base);
const after = report.snapshot(head);
mkdirSync('docs/metrics', { recursive: true });
writeFileSync('docs/metrics/README.md', `${report.render(before, after)}\n`);
writeFileSync('docs/metrics/metrics.json', `${JSON.stringify({ base: before, head: after }, null, 2)}\n`);
console.log(`docs/metrics written: ${base} (${before.commit}) -> ${head} (${after.commit})`);
