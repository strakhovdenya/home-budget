# HB-021 / часть A — фактическая проверка harness

## Коррекция HB21-A-R01 — 2026-11-13

Владелец передал независимое ревью предыдущего пакета: CHANGES REQUESTED,
Critical0 / High0 / Medium1 / Low0. Причина подтверждена: hb_migrator и
hb_runtime ранее использовали один пароль, поэтому runtime credential позволял
попытаться подключиться с привилегированной ролью. Старый anonymous smoke
проверял grants только hb_runtime и не обнаруживал эту возможность.

Исправление ограничено scripts/e2e/run.ts, tests/e2e/smoke.spec.ts и этим отчётом.
Два отдельных randomBytes(24) генерируют независимые 192-битные пароли; совпадение
приводит к fail-closed отказу. Типизированный dbEnv выбирает пароль конкретной
роли. Миграционный пароль получают только PG provisioning и transient migration/
journal processes. Он не записывается в volume/env-файл и не передаётся Next,
Playwright или его test processes. Runtime environment содержит только URL и
пароль hb_runtime; network namespace не означает наследование env/PID namespace
PostgreSQL-контейнера. Docker daemon/host launcher остаются прежней trusted boundary.

Новый отдельный тест `HB21-A-R01 runtime password cannot authenticate as
hb_migrator on real PostgreSQL` использует только runtime TEST_DATABASE_URL.
Сначала он подтверждает успешный реальный TCP login/current_user=hb_runtime,
затем меняет только username на hb_migrator, сохраняя runtime password, и требует
именно SQLSTATE 28P01. Connection refused/timeout не считаются доказательством
auth denial. Успешная проверка записывает безопасную annotation без credentials.
Исходный Chromium smoke и 38 harness cases не изменяют своего смысла.

Изолированная Docker namespace, pinned images/dependencies, schema/migrations,
auth policy, domain, release scripts, CI и Finance Gate не изменены. Сравнение
с предыдущим review package подтвердило побайтную сохранность девяти остальных
файлов пакета, включая approved plan/OPEN_QUESTIONS и package/lockfile.
Повторное независимое ревью исправления остаётся отдельным этапом; Owner
Acceptance или Done не заявляются. Части B–J/Q-HB21-AUTH не реализуются.

### Повторная проверка R01 — фактические результаты

Branch/base прежние: feat/hb-021-e2e-harness /
f8bfca7f836271cff87858c04be2cbf3643ce4e9; commit/push/PR/deploy не выполнялись.
Рабочий каталог host: D:/projects_js/home-budget. Финальная команда
`node --import tsx scripts/e2e/run.ts` — **exit0**, run
`0aa945d8c217d1892d1e6e7e1073fca7`. Все 228 snapshot-файлов после run сверены
с текущими source bytes, drift отсутствует. Snapshot SHA-256:
`94a21add8f34b6413985252d6e3a2d777242b17bcee9100fec18a39aaaf5d94d`.

Raw evidence: tmp/hb021-reports/0aa945d8c217d1892d1e6e7e1073fca7/
{report.json,source-inventory.json,playwright.json}; копии входят в новый ZIP.
Runtime version strings повторно получены: Node v26.13.1, pnpm12.16.1,
Playwright1.65.0, Next16.4.3. Оба image digest совпадают с R0; images/dependencies
не обновлялись, отдельный executable version-check в R01 не повторялся.

| Точная проверка / команда | Повторный результат R01 |
|---|---|
| Host `node node_modules/vitest/vitest.mjs run tests/e2e-harness.test.ts` вне известного Windows sandbox limitation | exit0;38 PASS,0 FAIL,1 file,915ms |
| Host `node node_modules/eslint/bin/eslint.js . --ignore-pattern 'tmp/**' --max-warnings=0` | exit0; прежнее исключение temp archives, конфигурация не менялась |
| В isolated /work: `node --conditions=react-server --import tsx scripts/db-migrate.ts`, дважды | exit0/exit0;6 entries журнала, id/hash/created_at после повтора идентичны |
| Local role provisioning / real DB identity / foreign-container guard / no-default-route | Каждый шаг exit0 |
| В isolated /work: `node node_modules/vitest/vitest.mjs run tests/e2e-harness.test.ts` | exit0;38 PASS,0 FAIL |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` в snapshot | exit0 |
| `node node_modules/next/dist/bin/next typegen` | exit0 |
| `node node_modules/typescript/bin/tsc --noEmit` | exit0; scope app+harness в snapshot, как в R0 |
| `node node_modules/next/dist/bin/next build` | exit0 |
| `node node_modules/@playwright/test/cli.js test` | exit0;2 PASS,0 skipped/failed/flaky; total13251.533ms |

В двух Playwright results отдельно подтверждены:

- **HB21-A-R01 PostgreSQL regression:** настоящий TCP login hb_runtime успешен;
  тот же password с username=hb_migrator получает **28P01**. Result=passed;
  annotation `postgres-role-isolation` сохраняет этот исход без password/URL.
- **Исходный Chromium smoke:** result=passed; настоящий /login→/history→/login
  и reload;20 application tables пусты до/после, INSERT/DDL runtime запрещены,
  нет pageerror/external request. Это не provider-login или финансовый E2E.

Failure-cleanup повторён командой
`node --import tsx scripts/e2e/run.ts --fail-after-database` — **exit1 ожидаем**,
run `febf84eebf8118038bda8d56740e4f2d`. Причина именно
E2E_INJECTED_STARTUP_FAILURE, removed2/2, cleanupFailures=[]. Snapshot digest
совпадает с финальным positive run.

Неудачная попытка R01 также сохранена: та же positive-команда, run
`60631f2bd1dcca40b4edae57afd3625b`, **exit1** на
isolated-dependency-install после ограниченного600s ожидания. Raw diagnostic
содержит npm slow-download warnings; миграции/build/browser не запускались.
Cleanup4/4, cleanupFailures=[]. После этого неизменённый код повторно запущен
с успехом; эта попытка не названа PASS и не вырезана из review evidence.

Всего R01 создал **11 ресурсов**: в финальном positive run network+PG+volume+
installer+runner (5), failure-cleanup network+PG (2), неудачный install run
network+PG+volume+installer (4). Все11 removed=true, каждый cleanupFailures=[].
Temporary snapshots/Docker configs удалены; после финального run команды
`docker ps -a`, `docker volume ls`, `docker network ls` с фильтром
label=home-budget.hb021.run вернули пустой результат (exit0). Image cache и
предыдущие ZIP/reports сохранены. Чужие ресурсы не изменялись.

Полный finance gate/suites, OAuth, production/Neon, financial domain/schema,
auth policy и части B–J не затрагивались. Криптографическое разделение секретов
проверено source review и настоящим PostgreSQL auth denial; raw credentials
не экспортируются. Новый ZIP содержит текущие source files, отдельный R01 diff,
общий part-A diff и sanitized raw evidence; прежний ZIP не перезаписывается.

### Исходный отчёт R0 — историческое evidence до коррекции

Все нижеследующие результаты R0 сохранены как история предыдущего пакета;
они не заменяют повторные результаты HB21-A-R01.

Дата: 2026-11-13, Europe/Warsaw. Только часть A утверждённого владельцем
[плана](hb-021-browser-e2e-a11y-responsive.md). Самопроверка Codex; независимое
ревью ChatGPT и Owner Acceptance ещё не выполнены. HB-021 не помечен Done.

## Исходное состояние и сохранность

Base/main: `f8bfca7f836271cff87858c04be2cbf3643ce4e9`; remote main проверен
`git fetch origin main`. Feature-ветка: `feat/hb-021-e2e-harness`, HEAD остался
на base: новые commit/push/PR/merge/deploy не выполнялись.

Предсуществующие локальные `docs/OPEN_QUESTIONS.md` и
`docs/planning/hb-021-browser-e2e-a11y-responsive.md` сохранены побайтно относительно
начала реализации. Они включаются в review ZIP как предсуществующий approved
planning context, не как изменения части A. Index пуст. `.env.local`,
`.env.production`, `.vercel` и пользовательские секреты не читались/не копировались.

Изменены package.json и pnpm-lock.yaml. Добавлены playwright.config.ts,
scripts/e2e/{run,safety,server}.ts, tests/e2e-harness.test.ts,
tests/e2e/{smoke.spec.ts,README.md} и этот отчёт. Исходные src/domain/auth,
drizzle, release scripts и CI не изменены (`git diff --exit-code HEAD -- src
drizzle .github scripts/production-init`: exit0). Finance Gate не менялся и не
запускался. Его старый PASS не является evidence этого diff.

## Устройство и изоляция

Host Node launcher создаёт source-only snapshot по явному allowlist, Docker config
с пустым config.json и отдельный volume. Ни root .next/node_modules, ни env/config
пользователя, ни production initializer в snapshot не входят. Symlink/private
paths/special files отказывают. Git SHA дополняется SHA-256 фактических dirty
source bytes. Все 228 snapshot-файлов после финального run сверены с текущими
байтами; drift отсутствует.

Новые PostgreSQL и runner имеют random runId, exact ID/image/label receipts.
Сеть `--internal`; только PG endpoint, runner разделяет его network namespace.
PostgreSQL слушает **127.0.0.1:5432 внутри namespace**, Next — 127.0.0.1:3000,
Chromium обращается к нему там же. **Host ports не публикуются.** Это уточнение
исполнения §4: первоначальная попытка host publication на internal network была
отклонена harness; вместо открытия внешнего маршрута публикация полностью убрана.
Host dev listener не используется и не останавливается. Для ручного browser на
host этот harness не предоставляет URL.

Все три входящих DB override запрещены до provisioning. Новые три URL проверяются
существующим local-target guard и exact DB/user/password/port/no-query contract.
Перед DB/test действиями повторно проверяются PG container, network ID/Internal/
labels/membership и отсутствие host publication. На настоящем подключении
проверены current_database/current_user/server_version_num/inet_server_port.
Отдельная роль hb_runtime имеет только SELECT, не владеет schema/tables.

Дочерние host-процессы получают allowlist environment; отсутствуют AUTH/NEON/PG/
proxy/NODE_OPTIONS/user-home credentials. Docker CLI использует только temporary
empty config. Acquisition-контейнер с внешней сетью получает **только три package
manifest-файла** и новый volume: `npm install --global pnpm@12.16.1`, затем
`pnpm install --frozen-lockfile --ignore-scripts`. У него нет app source, DB
namespace, secrets или пользовательских mounts. Он удалён до копирования app
source и исполнения приложения. В application namespace нет default route,
DNS upstream задан loopback; browser дополнительно отказывает внешним requests.
Это acquisition официальных tooling packages, не разрешение external OAuth test.

Playwright `reuseExistingServer:false`, один worker, retries0. Server launcher
проверяет свободный loopback port и запускает настоящий `next start`, не mock.
Нет session injection, test-login route, изменения auth policy или нового provider.
Google button отключён из-за отсутствия OAuth config, login не выполнялся.

## Версии

| Компонент | Фактически проверено |
|---|---|
| Host Node | v22.23.0 |
| Runtime Node в pinned browser image | v26.13.1 (допускается package engines >=26) |
| pnpm | 12.16.1 |
| Playwright / @playwright/test | 1.65.0, exact devDependency и lock integrity |
| Chromium image executable | Google Chrome for Testing 158.0.8127.18 |
| Next.js / TypeScript / Vitest | 16.4.3 / 6.0.3 / 5.0.5 |
| PostgreSQL | 18.6 (Debian 18.6-1.pgdg13+2) |
| Docker Engine | 29.8.0 |

Postgres pin:
`postgres@sha256:3a4264520e121176619f54ff867d12774bc81e95e7b84db58d63bccdb6144b81`.
Browser pin:
`mcr.microsoft.com/playwright@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe`.
Версии executable проверены отдельными `docker run --rm --network none` контейнерами
с HB-021 label; оба удалены автоматически, соединений к БД у них не было.

## Финальные выполненные проверки

Рабочий каталог host: `D:/projects_js/home-budget`. Команда финального запуска:
`node --import tsx scripts/e2e/run.ts`, **exit0**.
Run ID: `d9f583ae920549c20e40b0a3d560fd0e`.
Snapshot digest:
`c84b9de28967fb18f2c9e89b50e444d6eae223c8adf19b254520d750cf7232fa`.
Raw evidence: `tmp/hb021-reports/d9f583ae920549c20e40b0a3d560fd0e/`
(`report.json`, `source-inventory.json`, `playwright.json`). Копии — в review ZIP.

Ниже точные child commands после Docker admission, cwd=/work; generated local
environment не включён в текст, чтобы не экспортировать runtime password.

| Проверка / команда | Actual result |
|---|---|
| `node --conditions=react-server --import tsx scripts/db-migrate.ts` (дважды, без dotenv flag) | Оба exit0; все 6 migrations; id/hash/created_at журнала идентичны после повтора |
| Новый hb_runtime через локальный psql, `ON_ERROR_STOP=1` | exit0; CONNECT/USAGE/SELECT, без DML/DDL grants |
| Real pg query identity + strict target guard | exit0; exact synthetic DB/user, PostgreSQL18, TCP5432 |
| Foreign container admission / live own state | exit0: runner предъявлен как PG, отказан; оба собственных контейнера продолжали работать |
| `/proc/net/route` no-default-route assertion | exit0 |
| `node node_modules/vitest/vitest.mjs run tests/e2e-harness.test.ts` | exit0, **38 PASS / 0 FAIL**, 1 file |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` в чистом snapshot | exit0 |
| `node node_modules/next/dist/bin/next typegen` | exit0 |
| `node node_modules/typescript/bin/tsc --noEmit` | exit0; весь app + harness в snapshot; это не typecheck всех прежних test archives |
| `node node_modules/next/dist/bin/next build` | exit0, собственный production build, без deploy |
| `node node_modules/@playwright/test/cli.js test` | exit0, **1 passed / 0 failed / 0 skipped / 0 flaky**, 4591.429ms total |
| Host `node node_modules/eslint/bin/eslint.js . --ignore-pattern 'tmp/**' --max-warnings=0` | exit0; repo source без предсуществующих ignored temp archives |
| `git diff --check` | exit0 |

Smoke: реальный Chromium открывает /login (200), видит h1/disabled Google,
идёт в protected /history и возвращается на /login, выполняет reload. Нет
pageerror или external request. Независимый SELECT census всех 20 application
tables: каждый count0 до/после; INSERT users и CREATE TABLE от hb_runtime
отказаны. Traces/video/screenshots/auth state не сохранялись. Это anonymous
harness smoke, а не финансовый flow или доказательство B01/B03/B04.

38 негативных/admission checks покрывают все три URL по отдельности: remote,
host/hostaddr/service/options/hash, wrong port/database/user, missing URL;
чистое env; exact container/image/label/network; port-publication refusal;
unsafe cleanup paths; настоящий чужой live listener (остаётся работать);
nonzero server startup без admission; настоящий CLI remote-override refusal до
provisioning; private env-path refusal и cleanup только собственного child.

Финальная проверка failure cleanup:
`node --import tsx scripts/e2e/run.ts --fail-after-database`, **exit1 ожидаем**,
run `ee4b858984183fd00f6da59057ee38cb`. `failure=E2E_INJECTED_STARTUP_FAILURE`,
оба созданных ресурса removed=true, cleanupFailures=[]. Snapshot digest тот же,
что у положительного run. Не ожидалось ни запуска app, ни browser PASS.

## Неудачные/промежуточные попытки сохранены честно

| Попытка | Результат / исправление |
|---|---|
| `pnpm.cmd add --save-dev --save-exact @playwright/test@1.65.0` | exit1, прежний shared virtual-store mismatch; заменено lockfile-only add (exit0) |
| `pnpm.cmd test:e2e --fail-after-database`, run d10e4ee78fa9cde3b8e2e46fea7208a9 | exit1, E2E_LOOPBACK_PORT_REQUIRED до readiness: Docker internal network не публикует host ports; cleanup2/2. Исправлен namespace-only дизайн |
| Host safety suite в Windows sandbox | 36/37, child tsx упёрся в uv_os_get_passwd; вне sandbox37/37, позднее Linux38/38. Sandbox error не назван harness PASS |
| Scoped lint при разработке | Один preserve-caught-error отказ; добавлен Error cause, повтор exit0 |
| Полный run082a1da837b7dfac6caad569f5f4d1c7 | exit1 на typecheck ProcessEnv/NODE_ENV, до build/browser; исправлены типы, cleanup5/5; финальный run выше полностью повторён |
| Host `eslint . --max-warnings=0` без tmp exclusion | exit1,5421 errors: предсуществующие tmp checkout создают множественные tsconfigRootDir. Их не удаляли, конфигурацию lint не ослабляли; чистый snapshot и source-only host command выше прошли |
| Ранние injected runs585d2e594d48afb3177d53172a9c15db и32f1b1a9185b03daccfbbb1d9104f3fc | Intentional failure, cleanup2/2 каждый; последний запуск был в составной audit-команде с общим exit0, поэтому отдельный точный exit1 зафиксирован заново в финальном ee4b858984183fd00f6da59057ee38cb |

Важная локальная особенность: pnpm12 автоматически синхронизировал host зависимости
перед script run (+373/-4 package links,3 downloads). Это изменило managed
node_modules после первоначального намерения его не переустанавливать; исходники,
локальные документы, env и dev server не менялись. Последующие harness commands
вызваны напрямую через node, без повторного pnpm auto-install. Shared dependency
directory не удалялся/не восстанавливался разрушительной командой. README описывает
прямой Node invocation; на чистой машине `pnpm test:e2e` остаётся основным script.

## Созданные и удалённые ресурсы

Финальный positive run создал и удалил: network
`hb21_d9f583ae920549c20e40b0a3d560fd0e_net`, PostgreSQL container `_pg`, acquisition
container `_install`, app/browser container `_runner`, volume `_work` с тем же
префиксом. Все exact IDs и removed=true — в report.json; PG ID
`fe752b522e69cd59316d5947a6a1036d4ccb163fc06b2945a5c47b725a019ee3`.
Postgres data — tmpfs, не persistent user volume. Synthetic DB, hb_migrator и
hb_runtime исчезли вместе с контейнером. Temporary snapshot/Docker config удалены.

Всего шесть reported runs создали **18 Docker resources**, все18 removed=true,
каждый cleanupFailures=[]. Плюс два version-check контейнера с `--rm`.
После финального run read-only `docker ps -a`, `docker volume ls` и
`docker network ls` с фильтром `label=home-budget.hb021.run` не показали остатков.
Нет global prune/остановки/изменения чужих контейнеров, баз, listener или томов.
Скачанный browser image оставлен в общем Docker cache; прежний PostgreSQL image
сохранён. Локальные reports и review ZIP/staging остаются для владельца.

## Ограничения и граница следующей части

Нужен trusted local Docker Engine, Linux containers и предварительно скачанные
образы; acquisition требует доступа к публичным package registries. Runtime image
Node26 отличается от прежнего CI Node24; этот отчёт не заявляет дополнительный
Node24 run. Никакой новой CI-матрицы не добавлено.

SIGINT/SIGTERM запрашивают finally-cleanup после ограниченного по timeout шага.
SIGKILL/падение daemon/host/потеря acknowledgement docker create могут оставить
ресурс; отсутствие чужого cleanup гарантируется проверкой receipt, но нельзя
обещать автоматическую очистку при смерти самого управляющего процесса.

Full finance unit/integration suites, Finance Gate, HBH/HBUX/HB20 acceptance,
Google login/relogin, session-authenticated flows, RU/DE/EN matrix, mobile,
native200%, accessibility/physical AT — **NOT EXECUTED этой частью**. Production,
Neon/Vercel, реальные данные/OAuth/секреты не использовались. Q-HB21-AUTH остаётся
открытым. Часть B не начинается без отдельного разрешения владельца.

Самопроверка не заменяет независимое ревью. ZIP содержит точные source changes,
предсуществующий approved planning context и sanitized raw reports всех попыток;
нет env, credentials, node_modules, Docker config/volumes или production exports.
