const names = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'TEST_DATABASE_URL'] as const;
type DatabaseVariable = typeof names[number];

// Validate every possible database destination before migration/test code opens a connection.
// Never include the supplied value in an error: it may contain credentials.
export function requireLocalDatabaseTargets(environment: Readonly<Record<string, string | undefined>>) {
  const targets = {} as Record<DatabaseVariable, string>;
  for (const name of names) {
    const value = environment[name];
    let url: URL;
    try {
      if (!value) throw new Error();
      url = new URL(value);
    } catch {
      throw new Error(name + '_LOCAL_OVERRIDE_REQUIRED');
    }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' ||
      !url.port || url.pathname === '/' || !url.pathname ||
      [...url.searchParams.keys()].some(key => ['host', 'hostaddr', 'port', 'dbname', 'database', 'service', 'servicefile'].includes(key.toLowerCase()))) {
      throw new Error(name + '_EXPLICIT_LOCAL_DATABASE_REQUIRED');
    }
    targets[name] = value!;
  }
  return targets;
}
