# Внутреннее Устройство Движка Событий

Документ описывает, как работает текущий серверный модуль календаря после упрощения логики повторений.

## Область

Покрываются файлы в `src/calendar` и связанные части схемы Prisma:

1. Модель событий.
2. Материализация повторений.
3. Операции по областям изменения (`SERIES`, `THIS`, `THIS_AND_FUTURE`).
4. Планирование и отправка напоминаний.

## Ключевые Решения

1. Источник истины для серии: `RRULE + timeZone`.
2. Исключение одного инстанса хранится отдельно в `EventException` (аналог `EXDATE`).
3. Переопределение одного инстанса хранится как отдельный одноразовый `Event` (detached).
4. Адресация инстанса в API делается по времени (`occurrenceStart`), а не по индексу.
5. Актуальность задания на напоминание проверяется по времени целевого инстанса.

## Термины

1. Корневое событие: обычная запись события, не detached. Может быть одноразовой или серией.
2. Слот инстанса: теоретический экземпляр серии из `start + rrule + timeZone`.
3. `occurrenceStart`: UTC-время начала конкретного слота.
4. Исключение: маркер, что слот нужно скрыть при материализации.
5. Detached-событие: замена конкретного слота со своими полями.

## Модель Данных

### Event

Основные поля:

1. `start`: UTC-якорь старта.
2. `rrule`: правило повторения (`null` для одноразового события).
3. `timeZone`: локальная IANA-зона события для wall-clock семантики.
4. `duration`: длительность в минутах.
5. `detachedFromEventId` + `detachedFromOccurrenceStart`: заполнены только у detached.

Важные ограничения:

1. `@@unique([detachedFromEventId, detachedFromOccurrenceStart])` гарантирует одну замену на один слот.
2. Detached-связка валидна только если оба поля заданы одновременно.

### EventException

Основные поля:

1. `eventId`: идентификатор исходной серии.
2. `occurrenceStart`: исключаемый слот.

Важные ограничения:

1. `@@unique([eventId, occurrenceStart])` дает идемпотентность исключения.

### EventReminder

Поля планирования:

1. `nextOccurrenceStart`: слот, на который сейчас запланировано напоминание.
2. `scheduledAt`: точный момент отправки напоминания.
3. `sentAt`: время последней успешной отправки.

## Сервис Повторений

Реализация: `src/calendar/application/services/recurrence/recurrence.service.ts`.

Ответственность:

1. Валидация IANA-таймзоны.
2. Конвертация DTO повторений в RRULE и обратно.
3. Проверка принадлежности `occurrenceStart` серии.
4. Итерация инстансов в диапазоне `[from, to)`.
5. Поиск предыдущего и следующего инстанса.
6. Перезапись `UNTIL` при разделении серии.

Поддерживаемый набор:

1. `NONE`
2. `DAILY`
3. `WEEKLY`
4. `DOUBLE_WEEKLY` (`WEEKLY;INTERVAL=2`)
5. `MONTHLY`

## Чтение (`GET /events`)

Реализация: `src/calendar/application/use-cases/get-space-events.use-case.ts`.

Поток:

1. Загружаются все события пространства.
2. Отделяются корневые события от detached.
3. Загружаются исключения для корневых событий.
4. Для корневых серий материализуются инстансы в диапазоне через RRULE.
5. Для каждого слота применяется приоритет:
   1. Detached-замена, если есть.
   2. Иначе пропуск, если есть исключение.
   3. Иначе обычный инстанс корневой серии.
6. Результат сортируется по `start`, затем `eventId`, затем `occurrenceStart`.

Семантика результата:

1. `eventId` всегда указывает на корневую серию.
2. `occurrenceStart` всегда стабильный ключ исходного слота.
3. `start` может отличаться от `occurrenceStart` у detached-замены.

## Создание (`POST /events`)

Реализация: `src/calendar/application/use-cases/create-event.use-case.ts`.

Поток:

1. Проверка условий для напоминаний (если reminders есть, должен быть активный TG target).
2. Валидация повторений (`until >= start`).
3. Валидация time zone и сборка RRULE.
4. Создание корневого события.
5. Создание reminders.
6. Сохранение.
7. Первичное перепланирование reminders.
8. Опциональная отправка уведомления в TG.

## Обновление (`PATCH /events/:eventId`)

Реализация: `src/calendar/application/use-cases/update-event.use-case.ts`.

Проверки до ветвления:

1. Событие существует в текущем пространстве.
2. Условия для reminders выполнены.
3. Time zone валидна.
4. `recurrence.until` валиден.

### Область `SERIES`

1. Полная перезапись корневого события по данным запроса.
2. Удаление detached этой серии.
3. Удаление исключений этой серии.
4. Сохранение корневого события.
5. Снятие планирования удаленных reminders.
6. Перепланирование reminders корневой серии.

### Область `THIS`

1. Обязателен `occurrenceStart`.
2. Проверка, что слот входит в серию.
3. Upsert исключения `(eventId, occurrenceStart)`.
4. Upsert detached:
   1. Если detached уже есть, обновляется он.
   2. Если нет, создается новый detached одноразовый `Event`.
5. Перепланирование reminders у корневой серии и detached.

### Область `THIS_AND_FUTURE`

1. Обязателен `occurrenceStart`.
2. Проверка, что слот входит в серию.
3. Если разделение происходит в старте серии, это эквивалент `SERIES`.
4. Иначе серия разделяется:
   1. Находится предыдущий инстанс.
   2. У старой серии ставится `UNTIL = предыдущий инстанс`.
   3. Создается новая хвостовая серия из данных запроса.
   4. Будущие исключения (`>= split`) переносятся в хвостовую серию.
   5. Будущие detached-связи (`>= split`) перепривязываются к хвостовой серии.
5. Перепланирование reminders у обеих корневых серий и у перемещенных detached.

## Удаление (`DELETE /events/:eventId`)

Реализация: `src/calendar/application/use-cases/delete-event.use-case.ts`.

### Область `SERIES` (по умолчанию)

1. Удаляется корневое событие (связанные reminders/exceptions/detached удаляются каскадно).
2. Снимается планирование reminders у корня и detached.

### Область `THIS`

1. Обязателен `occurrenceStart`.
2. Проверка, что слот входит в серию.
3. Upsert исключения.
4. Удаление detached-замены этого слота (если была).
5. Снятие планирования reminders удаленного detached.
6. Перепланирование reminders корневой серии.

## Пайплайн Напоминаний

### Планирование

Реализация:

1. `src/calendar/application/services/reminder-planning/find-next-reminder-occurrence.ts`
2. `src/calendar/application/services/reminder-planning/reminder-planning.service.ts`

Алгоритм:

1. От `startOccurrenceHint` или `now` ищется следующий инстанс серии.
2. Слоты из исключений пропускаются.
3. Считается `scheduledAt = occurrenceStart - offsetMinutes`.
4. Если `scheduledAt <= now`, поиск продолжается дальше.
5. В БД сохраняются `nextOccurrenceStart` и `scheduledAt`.
6. Старые jobs удаляются, новая job планируется.

### Планирование в Очереди

Реализация: `src/calendar/infrastructure/queue/bull-reminder.scheduler.ts`.

Правила:

1. `job id` содержит timestamp слота: `reminder:{reminderId}:{occurrenceMillis}`.
2. Перед новым планированием удаляются существующие jobs reminder.
3. Просроченные задания не ставятся в очередь.
4. Legacy job id тоже очищаются.

### Обработка Очереди

Реализация: `src/calendar/infrastructure/queue/reminder.processor.ts`.

Правила:

1. Загружается текущее состояние планирования reminder.
2. `plannedOccurrence` из job сравнивается с `nextOccurrenceStart` из БД.
3. Если не совпадает, job устарела и пропускается.
4. Если нет активных TG targets, отправка пропускается и выполняется replan со следующего слота.
5. При успешной отправке заполняется `sentAt` и сразу выполняется replan на следующий слот.

## Сводка API-Контракта

Контроллер и DTO:

1. `src/calendar/interface/http/events.controller.ts`
2. `src/calendar/interface/http/dto/*`

Ключевые отличия от старой модели:

1. `recurrence` заменяет старые frequency-поля.
2. `scope` заменяет старый `updateType`.
3. `occurrenceStart` заменяет индексную адресацию инстанса.
4. `GET /events` возвращает материализованные инстансы с парой `eventId + occurrenceStart`.

## Инварианты и Защиты

1. Корректность detached-связки проверяется в доменной сущности.
2. Upsert исключений и detached-замен идемпотентен через уникальные ключи.
3. Разделение серии сохраняет будущие кастомизации за счет переноса исключений и detached-связей.
4. Устаревшие reminder jobs отсекаются сравнением timestamp целевого инстанса.
5. Перепланирование остается детерминированным за счет последовательности unschedule + schedule.

## С Чего Читать Код

1. `src/calendar/application/use-cases/update-event.use-case.ts`
2. `src/calendar/application/use-cases/get-space-events.use-case.ts`
3. `src/calendar/application/services/recurrence/recurrence.service.ts`
4. `src/calendar/application/services/reminder-planning/reminder-planning.service.ts`
5. `src/calendar/infrastructure/queue/reminder.processor.ts`
