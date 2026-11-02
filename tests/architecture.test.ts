import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import architecture from '../docs/architecture.json';

const root = resolve('src');
const prefixes = Object.fromEntries(architecture.layers.map((layer) => [layer.name, layer.paths[0].replace('/**', '')]));
const allowedExternal: Record<string, string[]> = {
  app: ['next', 'react', 'next-intl', '@mui/material', '@mui/material-nextjs'],
  features: ['next', 'react', 'next-intl', '@mui/material'],
  'shared-ui': ['next', 'react', 'next-intl', '@mui/material'],
  'shared-i18n': ['next', 'next-intl'],
  domain: [], 'shared-pure': [], infrastructure: ['server-only', 'pg', 'drizzle-orm', 'node:crypto'],
};

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

function layerOf(path: string) {
  const normalized = relative(resolve('.'), path).replaceAll('\\', '/');
  return architecture.layers.find((layer) => normalized.startsWith(`${prefixes[layer.name]}/`));
}

it('HBU-004 enforces declared layers, resolved imports and an explicit external allowlist', () => {
  const failures: string[] = [];
  for (const file of files(root)) {
    const sourceLayer = layerOf(file);
    if (!sourceLayer) { failures.push(`Unclassified source: ${file}`); continue; }
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function check(specifier: string) {
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) {
        if (!allowedExternal[sourceLayer!.name].some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`))) failures.push(`${file}: external ${specifier}`);
        return;
      }
      const target = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : resolve(dirname(file), specifier);
      if (target.endsWith('.css') && sourceLayer!.name === 'app') return;
      if (!['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx'].some((suffix) => existsSync(target + suffix))) failures.push(`${file}: unresolved ${specifier}`);
      const targetLayer = layerOf(target);
      if (!targetLayer || (targetLayer.name !== sourceLayer!.name && !sourceLayer!.may_depend_on.includes(targetLayer.name))) failures.push(`${file}: forbidden layer ${specifier}`);
    }
    function visit(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) check(node.moduleSpecifier.text);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) check(node.argument.literal.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) check(argument.text);
        else failures.push(`${file}: nonliteral import requires explicit review`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(failures).toEqual([]);
});
