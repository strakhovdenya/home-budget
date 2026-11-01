# Product requirements — Home Budget (v1 / later)

## Goal
Личный финансовый планировщик: пользователь вводит **реальный баланс одной карты** и подтверждает распределение **всего остатка** между финансовыми месяцами. Этого достаточно для обычной работы. Покупки, расходы за период, поступления, категории и объяснения разницы не обязательны. Обязательства/накопления можно обновить в том же действии; прогноз строится по подтверждённому месячному бюджету.

## Audience and constraints
- В v1 один пользователь, Google OAuth allowlist; закрытый веб-интерфейс, Vercel.
- Одна банковская карта, валюта EUR. Модель данных допускает несколько независимых счетов и будущий общий обзор.
- Desktop/mobile responsive browser; **без PWA**.
- RU/DE/EN и светлая/тёмная/системная тема MUI.
- В перспективе pet project; хранить реальные данные отдельно от публичного исходного кода.

## Jobs to be done
1. Быстро подтвердить актуальную сумму на карте и заодно сменить статусы оплаченных обязательств; не списывать их второй раз.
2. Увидеть полный перечень долгов/резервов/накоплений, отрицательный остаток (если есть), доступные деньги и лимит на день.
3. Зачислить доход конца месяца в *следующий финансовый период*; не раздувать текущий дневной прогноз.
4. Подтверждать полные месячные остатки с суммой, равной карте; каждая доля неотрицательна;дефицит A-R-S из полных резервов допустим. Изменение распределений не трактовать автоматически как операции.
5. Сохранить незакрытые обязательства и накопления; после автоматического открытия месяца предложить перенос денег и выполнить его только после подтверждения одной кнопкой (вариант A).
6. Сохранить неизменяемую историю и закрытые месяцы, корректировать их только через новую версию.
7. По желанию прикрепить банковскую выписку PDF позднее, категоризовать/сверить операции без повторного списания.

## Functional v1
- Dashboard: actual bank balance, last checkpoint date, total full reserves, savings, available/free, uncovered deficit, daily spending forecast, next planned bills, balance trend.
- One guided 'Update budget' flow: actual checkpoint amount/date + COMPLETE user-confirmed month distribution + optional obligation/savings changes; one atomic save, no required transaction entry or suspense category. Redistribution against unchanged confirmed bank reuses the observation.
- Obligations: create/edit full amount, paid/cancelled, partial payments with remainder reserved, recurrence template proposals upon new financial period/incoming future-period money, no auto-generation without confirmation.
- Savings: create, increase/reduce/release, carry across months, cash withdrawal reflected only via next/fresh card balance checkpoint.
- Budget periods: full bank balance allocated to past/current/future months; nonnegative actual-money shares,including zero;negative free from full earmarks is allowed, exact sum equals card balance. Optional operation financing detail cannot repost cash or silently edit confirmed state.
- Months: auto-open new month, propose carryover on next open, apply only after confirmation. Full reserve/savings survive once; no new obligation or bank transaction. Close manually even without last-day observation: unknown actual end balance, incomplete-data flag, real last known checkpoint/date, historical allocation/earmark state and immutable versions (HB-002).
- D36:safe main daily estimate protects all selected reserves/savings across periods and other-month allocations;budget guideline is secondary. Inclusive Berlin days and actual-cash isolation remain;exact max-based formula is Accepted under completed HB-003.
- Authentication/authorization and history/audit. Scope follows PRD/TASKS: P0 through HB-021 baseline, HB-020 templates membership pending Q-HB1-03; M3 categories/import/export and M4 PDF are later, not implied MVP requirements here.

## Future not in v1
- Bank statement PDF processing, text/OCR extraction, matching and manual approval; document storage stays private.
- Multiple cards, optional cash account, consolidated dashboards; richer stats/charts and calendar.
- NOT in scope: automatic bank sync, notifications, PWA, automatic spending categorization from guessed checkpoint deltas.

## Acceptance
A user can enter a checkpoint, mark a payment paid, immediately get correct free money and daily allowance; the previous month remains accessible and shows original reserves even after they are paid later. See docs/BUSINESS_RULES.md and tests/scenarios/.
