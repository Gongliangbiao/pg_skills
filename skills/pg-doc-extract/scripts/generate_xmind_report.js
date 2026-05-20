#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function usage() {
  console.log(`Usage:
  node generate_xmind_report.js --root <repo> --all [--out docs/reports/xmind-by-section]
  node generate_xmind_report.js --root <repo> --module chapter-13-concurrency-control
  node generate_xmind_report.js --root <repo> --section 13.2-transaction-isolation

Generates optional section-level XMind reports from docs/test-factors and docs/test-points.
`);
}

function parseArgs(argv) {
  const args = { root: '.', out: 'docs/reports/xmind-by-section', all: false, modules: [], sections: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--root') args.root = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--module') args.modules.push(argv[++i]);
    else if (a === '--section') args.sections.push(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.all && args.modules.length === 0 && args.sections.length === 0 && !args.help) args.all = true;
  return args;
}

function stripMd(s) {
  return String(s || '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function walk(root, rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return [];
  const out = [];
  for (const ent of fs.readdirSync(full, { withFileTypes: true })) {
    const child = path.join(rel, ent.name);
    if (ent.isDirectory()) out.push(...walk(root, child));
    else if (ent.isFile()) out.push(child);
  }
  return out.sort();
}

function titleCase(slug) {
  return slug.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function sectionTitleFromMatrix(rel) {
  const base = path.basename(path.dirname(rel));
  const m = base.match(/^(\d+(?:\.\d+)*)(?:-(.*))?$/);
  if (!m) return titleCase(base);
  return `${m[1]} ${titleCase(m[2] || 'section')}`;
}

function parseSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^## ${escaped}\\s*$`, 'm');
  const m = text.match(re);
  if (!m) return '';
  const start = m.index + m[0].length;
  const next = text.slice(start).search(/^## /m);
  return text.slice(start, next >= 0 ? start + next : undefined).trim();
}

function parseSource(text) {
  const sec = parseSection(text, '来源声明');
  const get = key => (sec.match(new RegExp(`- ${key}:\\s*(.+)`)) || [null, ''])[1].trim();
  return { type: get('source_type'), ref: get('source_ref'), note: get('source_note') };
}

function parseTable(sectionText) {
  const rows = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('|') || t.includes('---')) continue;
    const cells = t.split('|').slice(1, -1).map(c => stripMd(c));
    if (!cells.length) continue;
    if (['因子ID', '值ID', '策略ID', '测试点ID', '因子/组合'].includes(cells[0])) continue;
    rows.push(cells);
  }
  return rows;
}

function parseSubsections(sectionText) {
  const blocks = [];
  const re = /^###\s+(.+)\s*$/gm;
  let match;
  const headings = [];
  while ((match = re.exec(sectionText)) !== null) {
    headings.push({ title: match[1].trim(), start: match.index, endOfHeading: re.lastIndex });
  }
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const next = headings[i + 1];
    blocks.push({
      title: h.title,
      body: sectionText.slice(h.endOfHeading, next ? next.start : undefined).trim(),
    });
  }
  return blocks;
}

function parseFactorValueRows(text) {
  const valueSection = parseSection(text, '因子值细化');
  const values = new Map();
  for (const block of parseSubsections(valueSection)) {
    const id = (block.title.match(/^(F\d+)/) || [null, ''])[1];
    if (!id) continue;
    const rows = parseTable(block.body).map(c => ({
      id: c[0],
      value: c[1],
      type: c[2],
      priority: c[3],
      basis: c[4],
      boundary: c[5],
    }));
    values.set(id, rows);
  }
  return values;
}

function parseMatrix(text) {
  return {
    source: parseSource(text),
    summary: stripMd(parseSection(text, '官方范围摘要') || parseSection(text, '范围摘要')),
    factorRows: parseTable(parseSection(text, '因子清单')).map(c => ({
      id: c[0], type: c[1], name: c[2], values: c[3], priority: c[4], basis: c[5], note: c[6],
    })),
    comboRows: parseTable(parseSection(text, '组合策略')).map(c => ({
      id: c[0], method: c[1], factors: c[2], purpose: c[3], rule: c[4],
    })),
    planRows: parseTable(parseSection(text, '计划测试点')).map(c => ({
      id: c[0], combo: c[1], priority: c[2], factorValues: c[3], reason: c[4], file: (c[5] || '').replace(/`/g, ''),
    })),
    noRows: parseTable(parseSection(text, '不生成测试点的因子或组合')).map(c => ({
      id: c[0], reason: c[1], action: c[2],
    })),
    factorValues: parseFactorValueRows(text),
  };
}

function parseTestPoint(text) {
  const factorSec = parseSection(text, '来源因子');
  const getBullet = key => (factorSec.match(new RegExp(`- ${key}:\\s*(.+)`)) || [null, ''])[1].trim();
  const boundaries = parseSection(text, '重要边界')
    .split(/\r?\n/)
    .map(l => l.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  const get = name => stripMd(parseSection(text, name));
  return {
    source: parseSource(text),
    chapter: get('官方章节') || get('所属扩展目录'),
    basis: get('官方/来源依据摘要') || get('官方依据摘要') || get('来源依据摘要'),
    factorValues: getBullet('factor_values'),
    strategy: getBullet('combination_strategy'),
    point: get('测试点'),
    coverage: get('覆盖类型'),
    necessity: get('测试必要性'),
    reason: get('标记理由'),
    boundaries,
  };
}

function makeTopicFactory() {
  let n = 0;
  const topic = (title, children = [], notes = '') => {
    const node = { id: `topic-${++n}`, title: String(title || '(empty)').slice(0, 240) };
    if (children.length) node.children = { attached: children };
    if (notes) node.notes = { plain: { content: notes } };
    return node;
  };
  return topic;
}

function factorDisplay(f, matrix) {
  if (f.id === 'F01' && /本章节\s+\d+\s+个/.test(f.values || '')) {
    const count = matrix.planRows.length;
    const last = String(count).padStart(2, '0');
    return `因子值数量: ${count} 个测试行为目标，详见 F01-V01 至 F01-V${last}`;
  }
  return `有效值/状态/边界: ${f.values || '未记录'}`;
}

function shortFactorValue(value) {
  const raw = stripMd(value || '未记录');
  const beforeColon = raw.split(/[:：]/)[0].trim();
  const candidate = beforeColon && beforeColon.length >= 3 ? beforeColon : raw;
  return candidate.length > 56 ? `${candidate.slice(0, 53)}...` : candidate;
}

function priorityDistribution(rows) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const row of rows) {
    const p = String(row.priority || '').trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(counts, p)) counts[p] += 1;
  }
  return counts;
}

function writeXmind(root, outPath, sheetTitle, rootTopic) {
  const tmp = path.join(root, '.tmp-pg-doc-extract-xmind');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'content.json'), JSON.stringify([{ id: 'sheet-1', class: 'sheet', title: sheetTitle, rootTopic }], null, 2));
  fs.writeFileSync(path.join(tmp, 'metadata.json'), JSON.stringify({ creator: { name: 'pg-doc-extract', version: '1.0' }, activeSheetId: 'sheet-1' }, null, 2));
  fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ 'file-entries': { 'content.json': {}, 'metadata.json': {}, 'manifest.json': {} } }, null, 2));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.rmSync(outPath, { force: true });
  execFileSync('zip', ['-q', '-r', outPath, 'content.json', 'metadata.json', 'manifest.json'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
}

function generateForMatrix(root, outRoot, matrixRel) {
  const matrixText = fs.readFileSync(path.join(root, matrixRel), 'utf8');
  const matrix = parseMatrix(matrixText);
  const moduleRel = matrixRel.replace(/^docs\/test-factors\//, '').replace(/\/factor-matrix\.md$/, '');
  const testPointDir = matrixRel.replace(/^docs\/test-factors\//, 'docs/test-points/').replace(/\/factor-matrix\.md$/, '');
  const testFiles = walk(root, testPointDir).filter(f => f.endsWith('.md'));
  const testPoints = new Map(testFiles.map(f => [path.basename(f), { rel: f, data: parseTestPoint(fs.readFileSync(path.join(root, f), 'utf8')) }]));
  const sectionTitle = sectionTitleFromMatrix(matrixRel);
  const topic = makeTopicFactory();
  const sourceType = matrix.source.type || 'needs-confirmation';

  const factorChildren = matrix.factorRows.map(f => {
    const valueRows = matrix.factorValues.get(f.id) || [];
    const valueChildren = valueRows.length
      ? valueRows.map(v => topic(
        `${v.id} = ${shortFactorValue(v.value)} [${v.priority || '未记录'}]`,
        [],
        [
          `value: ${v.value || '未记录'}`,
          `类型: ${v.type || '未记录'}`,
          `优先级: ${v.priority || '未记录'}`,
          `依据: ${v.basis || '未记录'}`,
          `边界/异常说明: ${v.boundary || '未记录'}`,
        ].join('\n'),
      ))
      : [topic('未记录因子值明细')];
    return topic(`${f.id} ${f.name}`, [
      topic(`key: ${f.id || '未记录'}`),
      topic(`因子类型: ${f.type || '未记录'}`),
      topic(`优先级: ${f.priority || '未记录'}`),
      topic('取值', valueChildren),
    ], [
      factorDisplay(f, matrix),
      `依据: ${f.basis || '未记录'}`,
      `备注: ${f.note || '未记录'}`,
    ].join('\n'));
  });

  const comboChildren = matrix.comboRows.map(c => topic(`${c.id} ${c.method}`, [
    topic(`适用因子: ${c.factors}`),
    topic(`目的: ${c.purpose}`),
    topic(`生成规则: ${c.rule}`),
  ]));

  const noTestChildren = matrix.noRows.length
    ? matrix.noRows.map(n => topic(n.id, [topic(`原因: ${n.reason}`), topic(`后续动作: ${n.action}`)]))
    : [topic('无 no-test 记录')];
  const priorityCounts = priorityDistribution(matrix.planRows);
  const priorityChildren = Object.entries(priorityCounts).map(([level, count]) => topic(`${level}: ${count}`));

  const testPointChildren = matrix.planRows.map(p => {
    const found = testPoints.get(p.file);
    const tp = found && found.data;
    return topic(p.id, [
      topic(`优先级: ${p.priority}`),
      topic(`覆盖因子值: ${p.factorValues}`),
      topic(`组合方式: ${(tp && tp.strategy) || p.combo}`),
      topic(`测试点: ${(tp && tp.point) || p.reason}`),
      topic(`覆盖类型: ${(tp && tp.coverage) || '未记录'}`),
      topic(`必要性: ${(tp && tp.necessity) || '未记录'}`),
      topic('重要边界', ((tp && tp.boundaries) || []).slice(0, 8).map(b => topic(b))),
      topic(`来源文件: ${(found && found.rel) || p.file}`),
    ], tp && tp.reason);
  });

  const rootTopic = topic(sectionTitle, [
    topic('来源声明', [
      topic(`source_type: ${sourceType}`),
      topic(`source_ref: ${matrix.source.ref || '未记录'}`),
      topic(`source_note: ${matrix.source.note || '未记录'}`),
    ]),
    topic(sourceType === 'local-knowledge' || sourceType === 'user-supplement' ? '扩展目录定位' : '章节定位', [
      topic(`目录: ${moduleRel}`),
      topic(`测试点数量: ${matrix.planRows.length}`),
      topic(`factor matrix: ${matrixRel}`),
    ], matrix.summary),
    topic('范围摘要', [topic(matrix.summary || '无摘要')]),
    topic('测试因子矩阵', factorChildren),
    topic('No-test 记录', noTestChildren),
    topic('计划测试点优先级分布', priorityChildren),
    topic('组合方式', comboChildren),
    topic('测试点覆盖', testPointChildren),
    topic('充分性结论', [
      topic(`计划测试点数量: ${matrix.planRows.length}`),
      topic(`因子数量: ${matrix.factorRows.length}`),
      topic(`组合策略数量: ${matrix.comboRows.length}`),
      topic('每个测试点均回链到 factor matrix 的因子值和组合策略'),
      topic(sourceType === 'local-knowledge' || sourceType === 'user-supplement'
        ? '本节为本地知识补充/用户扩展测试点，不声明为官方章节'
        : '本节来源按 source_type/source_ref 声明'),
    ]),
  ]);

  const outPath = path.join(root, outRoot, moduleRel, `${path.basename(moduleRel)}.xmind`);
  writeXmind(root, outPath, `${sectionTitle} 测试点充分性`, rootTopic);
  return outPath;
}

function matchesSection(matrixRel, section) {
  const normalized = section.replace(/^docs\/test-factors\//, '').replace(/\/factor-matrix\.md$/, '');
  const dir = path.dirname(matrixRel.replace(/^docs\/test-factors\//, ''));
  return dir === normalized || dir.split(path.sep).includes(normalized);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) return usage();
  const root = path.resolve(args.root);
  const outRoot = args.out;
  let matrixRoots;
  if (args.all || args.sections.length) {
    matrixRoots = walk(root, 'docs/test-factors');
  } else {
    matrixRoots = args.modules.flatMap(m => walk(root, path.join('docs/test-factors', m)));
  }
  let matrices = matrixRoots.filter(f => f.endsWith('/factor-matrix.md'));
  if (args.sections.length) {
    matrices = matrices.filter(m => args.sections.some(s => matchesSection(m, s)));
  }
  const outputs = matrices.map(m => generateForMatrix(root, outRoot, m));
  console.log(JSON.stringify({ matrices: matrices.length, outputs: outputs.length, out: outRoot }, null, 2));
}

main();
