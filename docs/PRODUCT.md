# Product requirements — Home Budget (v1 / later)

## Goal
Личный финансовый планировщик, а не требующий ежедневных операций бухгалтерский журнал. Пользователь раз в несколько дней или недель вводит **реальный баланс одной банковской карты**, отмечает закрытые/новые обязательства и видит свободные деньги и динамический ориентир трат на оставшиеся дни месяца.

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
4. Распределять поступления или незадокументированные изменения между прошедшим, текущим, будущим периодами; поддержать авансовые траты.
5. Автоматически наследовать незакрытые обязательства и накопления; свободные остатки добавлять к следующему периоду.
6. Сохранить неизменяемую историю и закрытые месяцы, корректировать их только через новую версию.
7. По желанию прикрепить банковскую выписку PDF позднее, категоризовать/сверить операции без повторного списания.

## Functional v1
- Dashboard: actual bank balance, last checkpoint date, total full reserves, savings, available/free, uncovered deficit, daily spending forecast, next planned bills, balance trend.
- One guided 'Update budget' flow: new checkpoint amount/date + changes in obligations/savings + period allocations; one atomic save.
- Obligations: create/edit full amount, paid/cancelled, partial payments with remainder reserved, recurrence template proposals upon new financial period/incoming future-period money, no auto-generation without confirmation.
- Savings: create, increase/reduce/release, carry across months, cash withdrawal reflected only via next/fresh card balance checkpoint.
- Budget periods: current and next period alongside current calendar period; allocate income or checkpoint change to multiple periods, including zero allocation; support negative (deficit) and advance spending.
- Months: auto start next calendar month; manual close prior after review; versioned month snapshots and linked later corrections.
- Dynamic daily forecast, synthetic starting import workflow, basic categories optional.
- Authentication/authorization, history/audit log, exports (JSON/CSV planned early).

## Future not in v1
- Bank statement PDF processing, text/OCR extraction, matching and manual approval; document storage stays private.
- Multiple cards, optional cash account, consolidated dashboards; richer stats/charts and calendar.
- NOT in scope: automatic bank sync, notifications, PWA, automatic spending categorization from guessed checkpoint deltas.

## Acceptance
A user can enter a checkpoint, mark a payment paid, immediately get correct free money and daily allowance; the previous month remains accessible and shows original reserves even after they are paid later. See docs/BUSINESS_RULES.md and tests/scenarios/.
