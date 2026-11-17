const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SNAPSHOT_BYTES = 64 * 1024 * 1024;

function git(root, args, acceptedCodes = [0]) {
  const result = spawnSync('git', ['-c', 'core.longpaths=true', ...args], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000,
    maxBuffer: MAX_SNAPSHOT_BYTES
  });

  if (result.error || !acceptedCodes.includes(result.status)) {
    throw new Error('Git scope inspection failed; changed code was not verified.');
  }

  return result.stdout;
}

function sourceFiles(root) {
  const files = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']);

  return [...new Set(files.split('\0'))]
    .filter(file => /\.(ts|tsx)$/.test(file))
    .sort();
}

function readSource(root, file) {
  const absolute = path.resolve(root, file);
  const relative = path.relative(root, absolute);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Source path escapes the repository.');
  }

  if (!fs.existsSync(absolute)) {
    return null;
  }

  const realRelative = path.relative(fs.realpathSync(root), fs.realpathSync(absolute));
  const stat = fs.lstatSync(absolute);

  if (!stat.isFile() || realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Cannot safely inspect source: ${file}`);
  }

  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`Source exceeds the 2 MiB inspection limit: ${file}`);
  }

  return fs.readFileSync(absolute);
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sessionDirectory(root, sessionId) {
  return path.join(root, 'tmp', 'codex-quality', digest(sessionId));
}

function captureBaseline(root, directory) {
  const files = {};
  let totalBytes = 0;
  fs.mkdirSync(path.join(directory, 'originals'), { recursive: true });

  for (const file of sourceFiles(root)) {
    const bytes = readSource(root, file);

    if (bytes === null) {
      continue;
    }

    totalBytes += bytes.length;

    if (totalBytes > MAX_SNAPSHOT_BYTES) {
      throw new Error('Baseline exceeds the 64 MiB inspection limit.');
    }

    const hash = digest(bytes);
    const snapshot = path.join(directory, 'originals', hash);
    fs.writeFileSync(snapshot, bytes);
    files[file] = hash;
  }

  const baseline = { schemaVersion: 1, root: fs.realpathSync(root), files };
  const temporary = path.join(directory, 'baseline.pending.json');
  fs.writeFileSync(temporary, JSON.stringify(baseline));
  fs.renameSync(temporary, path.join(directory, 'baseline.json'));

  return baseline;
}

function loadBaseline(root, directory) {
  const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'baseline.json'), 'utf8'));

  if (baseline.schemaVersion !== 1 || baseline.root !== fs.realpathSync(root)) {
    throw new Error('Baseline does not belong to this repository. Start a fresh session.');
  }

  return baseline;
}

function changedSources(root, directory, baseline) {
  const changes = [];
  const files = new Set([...Object.keys(baseline.files), ...sourceFiles(root)]);

  for (const file of files) {
    const bytes = readSource(root, file);

    if (bytes === null) {
      continue;
    }

    const hash = digest(bytes);
    const previousHash = baseline.files[file];

    if (hash === previousHash) {
      continue;
    }

    const source = bytes.toString('utf8');
    let ranges;

    if (previousHash === undefined) {
      ranges = [[1, source.split('\n').length]];
    } else {
      const original = path.join(directory, 'originals', previousHash);

      if (digest(fs.readFileSync(original)) !== previousHash) {
        throw new Error(`Original snapshot is missing or corrupt: ${file}`);
      }

      const diff = git(root, [
        'diff', '--no-index', '--no-ext-diff', '--no-color', '--text', '--unified=0',
        '--', original, path.resolve(root, file)
      ], [0, 1]);
      ranges = [];
      let hasHunks = false;

      for (const match of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
        hasHunks = true;
        const first = Number(match[1]);
        const count = Number(match[2] ?? 1);

        if (count > 0) {
          ranges.push([first, first + count - 1]);
        }
      }

      if (!hasHunks) {
        throw new Error(`Git did not return text hunks for changed source: ${file}`);
      }
    }

    changes.push({ file, source, hash, ranges });
  }

  return changes;
}

module.exports = {
  captureBaseline,
  changedSources,
  digest,
  git,
  loadBaseline,
  sessionDirectory
};
