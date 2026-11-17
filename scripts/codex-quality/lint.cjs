const FIX_INSTRUCTIONS = {
  curly: 'Add braces and put the guarded statement in a normal multiline block.',
  'brace-style': 'Use 1TBS braces with a multiline body; keep else/catch/finally beside the closing brace.',
  'max-statements-per-line': 'Put each statement on its own line; do not combine operations.'
};

async function checkChanges(root, changes) {
  const actionable = changes.filter(change => change.ranges.length > 0);

  if (actionable.length === 0) {
    return { status: 'NOT_APPLICABLE', files: 0, findings: [] };
  }

  // Use installed tooling without loading the application's ESLint config or fixing files.
  const { ESLint } = require('eslint');
  const { parser } = require('typescript-eslint');
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    allowInlineConfig: false,
    ignore: false,
    fix: false,
    overrideConfig: {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true }
        }
      },
      rules: {
        curly: ['error', 'all'],
        'brace-style': ['error', '1tbs', { allowSingleLine: false }],
        'max-statements-per-line': ['error', { max: 1 }]
      }
    }
  });
  const findings = [];

  for (const change of actionable) {
    const results = await eslint.lintText(change.source, { filePath: change.file });

    if (results.length !== 1) {
      throw new Error(`ESLint did not return a result for ${change.file}.`);
    }

    for (const message of results[0].messages) {
      const first = message.line ?? 1;
      const last = message.endLine ?? first;
      const touchesChangedCode = change.ranges.some(([from, to]) => first <= to && last >= from);

      if (!message.fatal && !touchesChangedCode) {
        continue;
      }

      findings.push({
        file: change.file,
        line: first,
        column: message.column ?? 1,
        rule: message.ruleId ?? 'parser',
        message: message.message,
        instruction: FIX_INSTRUCTIONS[message.ruleId]
          ?? 'Fix the parse error; changed code cannot be checked until the file parses.'
      });
    }
  }

  return {
    status: findings.length === 0 ? 'PASS' : 'FAIL',
    files: actionable.length,
    findings
  };
}

module.exports = { checkChanges };
