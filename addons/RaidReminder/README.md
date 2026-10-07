# RaidReminder AddOn

## Installation

1. Download `RaidReminder.zip`.
2. Extract the archive.
3. Place the `RaidReminder` folder in:

```text
World of Warcraft\_retail_\Interface\AddOns\RaidReminder
```

4. Confirm that `RaidReminder.toc` is inside the `RaidReminder` folder.
5. Restart the game or run `/reload`.

## Commands

In game, run `/rr` or `/raidreminder`, press `Ctrl+C` in the export field, then paste the `RR2?...` string into RaidReminder.pro.
The add-on falls back to the legacy `RR1?...` format when the current region or realm cannot be encoded.

The same window checks raid readiness:

- boss lockouts for players who also have RaidReminder installed;
- enchants and empty gem sockets through the WoW inspect API, even when the inspected player does not have the add-on;
- quick filters for problem rows and players with the add-on;
- a whisper button that asks a player to fix missing enchants or empty gem sockets.

Players who cannot be inspected because of range, phase, connection, or API limits are shown as not checked instead of being counted as failed.

Run `/rraid` to open a small raid lockout table for the current character. Raid, difficulty, and boss names come from the game client locale.

## Автопоиск рейдов Зомбака (Retail)

Включение: **ESC → Параметры → Модификации → Raid Reminder → Автопоиск рейдов Зомбака**.
Команда `/rr settings` открывает эту категорию. Настройка `RaidReminderDB.autoSearchZombakRaids`
сохраняется на аккаунт, по умолчанию выключена. При выключении окно и временное состояние
поиска немедленно очищаются; повторное включение работает без `/reload`.

Когда персонаж из `RaidReminder.ZombakCharacters` создаёт публичный рейдовый сбор, получатель
видит окно с персонажем, активностью и сложностью. Первый клик **«Найти рейд»** вызывает
`C_LFGList.Search` с `activityIDsFilter`. Второй клик **«Подать заявку»** вызывает
`C_LFGList.ApplyToGroup(resultID, isTank, isHealer, isDPS)` с ролями из `GetLFGRoles()`.
Это обычная заявка в список кандидатов Blizzard. Дальнейшее приглашение и ответ на него
проходят в стандартных окнах игры.

Окно закрывается через 90 секунд после уведомления или последнего клика. Найденный resultID
действует в аддоне не более 60 секунд и проверяется ещё раз перед заявкой, включая лидера,
активности, `isDelisted` и `partyGUID`, если он доступен. Активная или ожидающая изменения
заявка блокирует повторную подачу. В бою кнопка отключена; выход из боя только включает её.

### Модули

- `Constants.lua`: персонажи, версия сообщения, имя канала и таймауты.
- `Realm.lua`: единый `RaidReminder.IsZombakCharacter(fullName)`; кириллический регистр,
  `рф`, `РФ`, `Ревущийфьорд`, `Ревущий Фьорд`, `HowlingFjord`. Имя без realm относится
  только к реальному локальному серверу игрока.
- `Options/Settings.lua`: нативный Settings API с прямой привязкой к SavedVariables.
- `Comm.lua`: существующий префикс `RaidReminder`, существующий разделитель и диспетчер;
  добавлены `RegisterHandler`, `BroadcastZombakRaid` и управление каналом.
  Дубли функций связи из `Group.lua` удалены.
- `ZombakRaidWatcher.lua`: создание/приём объявления, проверка отправителя, дедупликация,
  состояния поиска и заявки. Временные данные находятся в `RR.State.ZombakRaid`, а не в SavedVariables.
- `UI/ZombakRaidPopup.lua`: одно окно на общих `ApplyPanelBackdrop`/`CreateStyledButton`,
  закрытие по кнопке, Escape и таймеру. `Events.lua` остаётся единым диспетчером событий.

### Транспорт и ограничения

Используется временный пользовательский канал **`RaidReminderZombak`**:
`JoinTemporaryChannel` → `C_ChatInfo.SendAddonMessage("RaidReminder", payload, "CHANNEL", channelID)`
→ `CHAT_MSG_ADDON`. Клиент Зомбака вступает в канал и отправляет событие независимо от
собственной настройки получения. Остальные клиенты вступают при включении настройки.
Обычные сообщения чата не отправляются; членство в группе Зомбака не требуется.

В сообщении передаются тип события, версия, персонаж, список `activityIDs`, серверное время
и nonce. Категория, название и сложность берутся из локального `GetActivityInfoTable`.
Получатель сверяет реального `sender` из события Blizzard с белым списком и полем leader.
Сообщения старше 180 секунд, неверного формата, от другого персонажа/сервера/канала и повторы
отбрасываются. Чужой персонаж Зомбака не подставляется вместо конкретного лидера объявления.

Ограничения:

- Это доставка в пределах доступного обоим клиентам канала одной фракции и сервера/connected-realm.
  Подключение через кросс-серверную группу или общий shard само по себе общего канала не создаёт.
  Региональная доставка на произвольные серверы и между фракциями не реализована.
- Оба клиента должны быть онлайн, иметь эту версию аддона и уже состоять в доступном канале.
  Нет сервера ретрансляции, подтверждения доставки или истории для вошедших позже игроков.
- Лимит пользовательских каналов, пароль, бан/кик, ограничения аккаунта, throttling и
  chat-messaging lockdown Blizzard могут помешать вступлению или доставке. API ограничения
  проверяются; обходов через обычный чат, рассылку whisper или защищённые действия нет.
  Вступление имеет не более пяти попыток за цикл; очередь отправки живёт до 30 секунд.
  Новый цикл доступен при входе в мир или повторном включении настройки.
- Отправляются только новые публичные сборы категории «Рейды», созданные самим лидером.
  Уже существующий при загрузке аддона сбор, private listing и сбор помощника не анонсируются.
- Blizzard может скрыть сбор из поиска из-за требований, фракции, доступности активности
  или лимита результатов. В этом случае окно предлагает повторный поиск вручную.
- Результаты поиска являются общим кешем Blizzard: параллельный поиск может его заменить.
  Аддон не меняет сохранённые фильтры, не редактирует поля стандартных frames и не восстанавливает
  старые результаты автоматическим поиском. Если в стандартном поиске уже введён текст,
  его нужно очистить вручную. Во время текущего поиска Blizzard нужно дождаться завершения.

### Отладка и проверки

- В **0.2.1** исправлена преждевременная блокировка отправки: флаг политики сервера
  `AreOutgoingAddonChatMessagesRestricted()` больше не считается самостоятельным признаком
  текущего запрета. Проверяется текущий `InChatMessagingLockdown()`, затем результат штатного
  `SendAddonMessage`. Если API возвращает `AddOnMessageLockdown`, отправка прекращается.
- `/rr zombakstatus` — локальный отчёт: версия, персонаж, фракция, настройка получения,
  членство в канале, регистрация префикса, ограничения, результат последней отправки,
  последнее полученное уведомление и причина принятия/отклонения. Команда ничего не отправляет.
  При отсутствии уведомления выполните её на обоих клиентах после создания нового сбора.
- `/rr testzombak` — локальный тест окна при включённой настройке. Клики показывают тестовые
  состояния «найден» и «заявка отправлена»; LFG-поиск и заявка не выполняются, resultID не создаётся.
- `/rr debug` — включить/выключить журналы этой функции до `/reload`. В обычном режиме журнал выключен.
- `python scripts/test_raidreminder_addon.py` из корня репозитория — Lua 5.1 через пакет `lupa`.
  Проверяет синтаксис всех 30 модулей, `.toc`, SavedVariables и сценарии с имитацией API.
  Нужен Python с `lupa` либо временная установка пакета на `PYTHONPATH`; зависимости сайта не меняются.

Сигнатуры сверены с исходниками Blizzard UI (зеркало Gethe):
[LFG API](https://github.com/Gethe/wow-ui-source/blob/live/Interface/AddOns/Blizzard_APIDocumentationGenerated/LFGListInfoDocumentation.lua),
[штатный вызов ApplyToGroup](https://github.com/Gethe/wow-ui-source/blob/live/Interface/AddOns/Blizzard_GroupFinder/Mainline/LFGList.lua),
[Settings API](https://github.com/Gethe/wow-ui-source/blob/live/Interface/AddOns/Blizzard_Settings_Shared/Blizzard_ImplementationReadme.lua),
[chat API](https://github.com/Gethe/wow-ui-source/blob/live/Interface/AddOns/Blizzard_APIDocumentationGenerated/ChatInfoDocumentation.lua).
Используются `activityIDs`, `GetActivityInfoTable`, `GetSearchResultInfo`, семиаргументный `Search`
и современная привязка `RegisterAddOnSetting`. `InterfaceOptions_AddCategory`, `GetActivityInfo`
и `GetSearchResultMemberInfo` не используются. `Search` и `ApplyToGroup` имеют по одному месту
вызова непосредственно в обработчике кнопки. Blizzard-функции не заменяются и не hook-аются.

**Обязательная проверка в игре перед релизом (здесь не выполнена):**

1. На двух клиентах одной доступной сети каналов установить обновлённый аддон, включить
   показ Lua-ошибок и `/rr debug`. На Латтэ включить настройку, на Зомбаке оставить выключенной.
2. Зомбаком создать публичный рейд через Premade Group Finder; убедиться, что Латтэ получает
   одно окно, находясь вне группы Зомбака.
3. На Латтэ выбрать LFG-роли, нажать «Найти рейд», проверить персонажа/активность, затем
   «Подать заявку». Убедиться **на клиенте Зомбака**, что Латтэ появился в стандартном списке
   кандидатов Blizzard; принять/отклонить его стандартными кнопками.
4. Проверить отмену/закрытие сбора, уже поданную заявку, бой, выключение настройки во время
   поиска, повторное включение и отсутствие taint/blocked-action ошибок. Проверить, что
   обычные поиск и заявки Blizzard продолжают работать.

Автотесты имитируют границу Blizzard и не подтверждают реальную сетевую доставку,
появление кандидата на сервере, рендер WoW или отсутствие taint в живом клиенте.

The add-on list icon is `Media/RaidReminderIcon.tga`, generated from the web mark at `public/home/raid-reminder-mark.png`.

## CurseForge

Correct CurseForge archive structure:

```text
RaidReminder.zip
└─ RaidReminder/
   ├─ RaidReminder.toc
   ├─ RealmCodes.lua
   ├─ RaidReminder.lua
   ├─ Media/
   │  └─ RaidReminderIcon.tga
   └─ README.md
```
