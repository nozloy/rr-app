export const APP_LOCALE_COOKIE = 'rr_locale'

export const APP_LOCALES = ['ru', 'en'] as const
export type AppLocale = (typeof APP_LOCALES)[number]

export const FALLBACK_LOCALE: AppLocale = 'ru'

type TranslationParams = Record<string, string | number>

type DictionaryNode = {
	[key: string]: string | DictionaryNode
}

const dictionaries: Record<AppLocale, DictionaryNode> = {
	en: {
		common: {
			cancel: 'Cancel',
			close: 'Close',
			dashboard: 'Dashboard',
			enabled: 'Enabled',
			home: 'Home',
			no: 'No',
			notSelected: 'Not selected',
			now: 'Now',
			premium: 'Premium',
			realm: 'Realm',
			required: 'Required',
			save: 'Save',
			yes: 'Yes',
			downloadPng: 'Download PNG',
			saveTemplate: 'Save as template',
		},
		errors: {
			missingData: 'Required data is missing.',
			notFound: 'Not found.',
			unauthorized: 'Unauthorized.',
			unknown: 'Something went wrong.',
		},
		header: {
			accountMenuLabel: 'Account menu',
			battleNetLabel: 'Battle.net',
			createRaid: 'Create raid',
			home: 'Home',
			logout: 'Log out',
			navigation: 'Navigation',
			openNavigation: 'Open navigation',
			playerFallback: 'Player',
			raidCheck: 'Raid check',
			signInWithBattleNet: 'Sign in with Battle.net',
			switchToEnglish: 'Switch language to English',
			switchToRussian: 'Switch language to Russian',
		},
		home: {
			heroTitleLine1: 'Plan your raids',
			heroTitleLine2: 'without the chaos',
			heroCopy:
				'Create raids, dungeons, and world activities. Set roles, start time, and paid slots when needed.',
			raidsTitle: 'Current raids',
			raidsViewAll: 'View all raids',
			activitiesTitle: 'Popular activities',
			activitiesViewAll: 'View all',
			featuresAria: 'Benefits',
			raidLeader: 'Leader',
			raidDifficulties: 'Available difficulties',
			raidOpenAria: 'Open raid {name}',
			footerCopyLine1: 'Plan ideal raids, keys, and farm runs.',
			footerCopyLine2: 'We handle the chaos for you.',
			footerNavAria: 'Additional navigation',
			footerSocialAria: 'Social channels',
			footerRights: 'All rights reserved',
			activityKeys: 'Keys',
			activityMounts: 'Mount farm',
			activityResources: 'Resource farm',
			activityAchievements: 'Achievements',
			activityTransmog: 'Transmog',
			activityRaiderIo: 'Raider.IO',
			featurePlanningTitle: 'Event planning',
			featurePlanningText:
				'Set time, roles and requirements so everyone sees the plan in advance.',
			featureGoldTitle: 'Paid slots',
			featureGoldText:
				'Set slot prices and build groups faster with transparent terms.',
			featureRolesTitle: 'Flexible roster',
			featureRolesText: 'Tune roles and participant ranges for each activity.',
			footerAbout: 'About',
			footerRules: 'Rules',
			footerSupport: 'Support',
			footerFaq: 'FAQ',
			footerContacts: 'Contacts',
		},
		events: {
			heroTitle: 'Create new event',
			heroCopy:
				'Create a raid, dungeon, or world activity and gather the right roster.',
			sectionLeader: 'Event leader',
			sectionDateTime: 'Date and time',
			sectionAddon: 'Expansion',
			sectionInstances: 'Instances',
			sectionRoles: 'Group setup',
			sectionUnroll: 'Unroll',
			sectionPaidSlots: 'Paid slots',
			sectionPreview: 'Event preview',
			myCharacter: 'My character',
			myCharacterHintSingle: 'Choose one of your characters.',
			myCharacterHintMulti: 'Click the card to pick another character.',
			chooseCharacter: 'Choose character',
			manualLeader: 'Manual input',
			manualLeaderHint: 'Enter raid leader details manually',
			leaderName: 'Raid leader name',
			leaderRealm: 'Realm',
			characterSyncHint: 'Sync your character in the dashboard',
			previousMonth: 'Previous month',
			nextMonth: 'Next month',
			hours: 'Hours',
			minutes: 'Minutes',
			in15Minutes: 'In 15 minutes',
			in15MinutesShort: '+15 min',
			in30MinutesShort: '+30 min',
			todayEvening: 'Tonight',
			activityTypeAria: 'Activity type',
			typeRaid: 'Raid',
			typeDungeon: 'Dungeon',
			typeSeason: 'Season',
			typeWorld: 'World',
			instancesHint: 'Select one or more instances of this type.',
			selectedInstancesAria: 'Selected instances',
			roleHint:
				'Set min and max players per role using a range or a single number.',
			countForRole: 'Count for {role}',
			decreaseRoleCount: 'Decrease {role} count',
			increaseRoleCount: 'Increase {role} count',
			paidSlotsToggle: 'Enable paid slots',
			unrollToggle: 'Enable unroll',
			unrollItemIds: 'Item IDs',
			wowheadItem: 'Wowhead item ID {id}',
			itemId: 'Item ID {id}',
			or: 'or',
			unrollTemplate: 'Template',
			unrollTemplateNone: 'No template',
			unrollTemplateSelect: 'Select unroll template',
			unrollTemplateEdit: 'Edit unroll templates',
			unrollTemplateSoon: 'Edit templates (soon)',
			previewLeader: 'Leader',
			previewDateTime: 'Date and time',
			previewInstances: 'Instances',
			previewComposition: 'Group setup',
			previewPaidSlots: 'Paid slots',
			previewUnroll: 'Unroll',
			previewNotSet: 'Not set',
			previewSelectedCount: '{count} selected',
			previewInstancesCount: '{count} inst.',
			previewUnrollIds: '{count} IDs',
			previewNo: 'No',
			roleTanks: 'Tanks',
			roleHealers: 'Healers',
			roleDamage: 'Damage',
			rolePlaceholderTank: '2-3',
			rolePlaceholderHealer: '4-5',
			rolePlaceholderDamage: '10-12',
			publishEvent: 'Publish event',
			saveAsTemplate: 'Save as template',
			templatesFootnote:
				'Templates will be available after server-side storage is enabled.',
			publishChannelsAria: 'Publish channels',
			publishChannelsSettings: 'Configure publish channels',
			editUnrollTemplates: 'Edit unroll templates',
			statusPublishReady:
				'Event is prepared for local publish. Server persistence will be added in a future update.',
			statusTemplateReady:
				'Template assembled locally. This version does not save it to the database.',
			roleErrorEmpty: 'Fill in the count.',
			roleErrorFormat: 'Use format 2 or 10-12.',
			roleErrorNumbers: 'Use valid numeric values.',
			roleErrorMinMax: 'Minimum cannot be greater than maximum.',
		},
		raidcheck: {
			title: 'Raid lockout check',
			heroEyebrow: 'Raid lockout intelligence',
			heroCopy:
				'Paste addon export, select difficulty, and validate the whole roster before pull.',
			source: 'Source',
			addonString: 'Addon string',
			useFreshExport:
				'Use a fresh /rr export. Full-raid check requires updated addon with roster.',
			waitingExport: 'Waiting for export string',
			type: 'Type',
			raid: 'Raid',
			notRaid: 'Not raid',
			ready: 'Ready',
			checkSource: 'Check source',
			instance: 'Instance',
			notDetected: 'Not detected',
			raidCatalog: 'Raid catalog',
			roster: 'Roster',
			authorOnly: 'Author only',
			rosterFound: 'Roster found',
			needNewAddon: 'Need updated addon',
			raidToCheck: 'Raid to check',
			chooseCurrentRaid: 'Choose current raid',
			allSeasonRaids: 'All season raids',
			difficulty: 'Difficulty',
			pasteFirst: 'Paste export first',
			submit: 'Check lockout',
			result: 'Result',
			resultTable: 'Lockout table',
			resultEmpty:
				'After check, this panel will show raid participants and lockout status.',
			total: 'Total',
			clean: 'Clean',
			locked: 'Locked',
			issues: 'Issues',
			playerRealm: 'Player / realm',
			lockout: 'Lockout',
			othersClean: 'Others without lockout',
			collapseClean: 'Collapse clean players',
			showClean: 'Show remaining clean ({count})',
			readyToCheck: 'Ready to check',
			readyToCheckCopy:
				'Paste addon export, choose difficulty, and run check. Blizzard requests are handled server-side.',
			statusClean: 'Clean',
			statusLocked: 'Has kills',
			statusError: 'Check error',
			statusNotFound: 'Not found',
			previewParseError: 'Failed to parse export string.',
			summaryPremium: 'Premium',
		},
		dashboard: {
			welcome: 'Welcome, {name}',
			battleNetConnected: 'Battle.net connected',
			syncedAgo: 'Data synced 2 min ago',
			sync: 'Sync',
			syncNow: 'Sync now',
			syncing: 'Syncing...',
			reconnectBattleNet: 'Reconnect Battle.net',
			dataUpdated: 'Data updated',
			dataCurrent: 'Data is current',
			topIlvl: 'Top ilvl',
			unknown: 'n/a',
			logout: 'Log out',
			regionEurope: 'Region: Europe',
			realm: 'Realm: {realm}',
			activeCharacters: 'Active characters: {count}',
			characters: 'Characters',
			futureActivities: 'Upcoming activities',
			finishedWeek: 'Finished this week',
			raidProgress: 'Raid progress',
			createBanner: 'Create banner',
			findGroup: 'Find group',
			raidCheck: 'Check raid lockout',
			addonImport: 'Addon import',
			myCharacters: 'My characters',
			allCharacters: 'All characters',
			noCharacters: 'Characters are not synced yet',
			runSyncHint: 'Run synchronization in sidebar.',
			specUnknown: 'Spec unknown',
			online: 'Online',
			offline: 'Offline',
			accountActivity: 'Account activity',
			fullHistory: 'Full history',
			upcoming: 'Upcoming activities',
			past: 'Past activities',
			all: 'All',
			achievements: 'Recent achievements',
			allAchievements: 'All achievements',
			raidProgressTitle: 'Raid progress',
			detailedStats: 'Detailed stats',
			overallProgress: 'Overall progress',
			rewards: 'Rewards',
			weekCalendar: 'Week calendar',
			viewCalendar: 'View calendar',
			raids: 'Raids',
			keys: 'Keys',
			farm: 'Farm',
			misc: 'Misc',
			mythicOverview: 'Mythic+ overview',
			completedKeys: 'Completed keys',
			seasonMidnight: 'Season 2 · Midnight',
			score: 'Score (Raider.IO)',
			activityDone: 'Completed',
			guild: 'Guild',
		},
		banners: {
			createBannerEyebrow: 'Banner builder',
			noCharacterTitle: 'You need at least one character first',
			noCharacterCopy:
				'Sync your account in dashboard and builder will use the strongest active character.',
			backToDashboard: 'Back to dashboard',
			bannerModeRaid: 'Raid',
			bannerModeMythic: 'Mythic+',
			parameters: 'Parameters',
			preview: 'Preview',
			finalPng: 'Final PNG',
			createBanner: 'Create banner',
			generatingBanner: 'Generating banner...',
			clickToCreate: 'Click “Create banner”',
			clickToCreateCopy:
				'After generation, final image and copy/download actions will appear here.',
			copyPng: 'Copy PNG',
			copySuccess: 'Image copied.',
			copyError: 'Browser denied PNG clipboard write. Use download.',
			importTitle: 'Banner from RaidReminder export',
			importEyebrow: 'Addon import',
			importButton: 'Import',
			clearButton: 'Clear',
			scanQr: 'Scan QR',
			stopScanner: 'Stop scanner',
			draft: 'Draft',
			checkData: 'Check data',
			resultPng: 'Final PNG',
			source: 'Source',
			addonData: 'Data from addon',
			exportString: 'RaidReminder export string',
			groupTypeSolo: 'Solo',
			groupTypeParty: 'Party',
			groupTypeRaid: 'Raid',
			roleTank: 'Tank',
			roleHealer: 'Healer',
			roleDamage: 'DPS',
			roleNone: 'No role',
			legacyGoal: 'Collection-run goal',
			legacy: 'Legacy',
			collectionRun: 'Collection run',
			raidLfg: 'Raid LFG',
			mythicLfg: 'Mythic+ LFG',
			needsInGroup: 'Group needs',
			needsInRaid: 'Raid needs',
			composition: 'Composition',
			current: 'Current',
			armor: 'Armor',
			requiredBuffs: 'Required buffs',
			allBuffsCovered: 'All covered',
		},
		addonExport: {
			legacyRaidName: 'Legacy raid',
			legacyRaidGoal: 'Hunting achievements, mounts, and transmog',
			missingField: 'Export string is missing field {field}.',
			tooLong: 'Export string is too long.',
			invalidPrefix: 'Paste a string that starts with RR1? or RRQ1?.',
			parseError: 'Failed to parse export string.',
		},
		party: {
			tank: 'Tank',
			healer: 'Healer',
			damage: 'DPS',
			missingRoles: 'No slots marked',
		},
	},
	ru: {
		common: {
			cancel: 'Отмена',
			close: 'Закрыть',
			dashboard: 'Кабинет',
			enabled: 'Включено',
			home: 'На главную',
			no: 'Нет',
			notSelected: 'Не указан',
			now: 'Сейчас',
			premium: 'Premium',
			realm: 'Сервер',
			required: 'Обязательно',
			save: 'Сохранить',
			yes: 'Да',
			downloadPng: 'Скачать PNG',
			saveTemplate: 'Сохранить как шаблон',
		},
		errors: {
			missingData: 'Не хватает обязательных данных.',
			notFound: 'Не найдено.',
			unauthorized: 'Нужна авторизация.',
			unknown: 'Что-то пошло не так.',
		},
		header: {
			accountMenuLabel: 'Меню аккаунта',
			battleNetLabel: 'Battle.net',
			createRaid: 'Создать рейд',
			home: 'Главная',
			logout: 'Выйти',
			navigation: 'Навигация',
			openNavigation: 'Открыть навигацию',
			playerFallback: 'Игрок',
			raidCheck: 'Проверить кд',
			signInWithBattleNet: 'Войти через Battle.net',
			switchToEnglish: 'Переключить язык на английский',
			switchToRussian: 'Переключить язык на русский',
		},
		home: {
			heroTitleLine1: 'Планируй рейды',
			heroTitleLine2: 'и сборы без хаоса',
			heroCopy:
				'Создавай сборы на рейды, ключи и активности в мире. Назначай роли, время старта и стоимость слота при необходимости.',
			raidsTitle: 'Актуальные рейды',
			raidsViewAll: 'Смотреть все рейды',
			activitiesTitle: 'Популярные активности',
			activitiesViewAll: 'Смотреть все',
			featuresAria: 'Преимущества',
			raidLeader: 'Лидер',
			raidDifficulties: 'Доступные сложности',
			raidOpenAria: 'Открыть рейд {name}',
			footerCopyLine1: 'Планируйте идеальные рейды, ключи и фарм.',
			footerCopyLine2: 'Мы берем хаос на себя.',
			footerNavAria: 'Дополнительная навигация',
			footerSocialAria: 'Социальные каналы',
			footerRights: 'Все права защищены',
			activityKeys: 'Ключи',
			activityMounts: 'Фарм маунтов',
			activityResources: 'Фарм ресурсов',
			activityAchievements: 'Ачивки',
			activityTransmog: 'Трансмог',
			activityRaiderIo: 'Рейдерио',
			featurePlanningTitle: 'Планирование событий',
			featurePlanningText:
				'Укажи время, роли и требования. Участники видят все заранее.',
			featureGoldTitle: 'Слоты за золото',
			featureGoldText:
				'Назначай цену за слот и собирай группу быстро и прозрачно.',
			featureRolesTitle: 'Гибкие роли и состав',
			featureRolesText:
				'Настраивай роли, требования и количество участников для успеха.',
			footerAbout: 'О проекте',
			footerRules: 'Правила',
			footerSupport: 'Поддержка',
			footerFaq: 'FAQ',
			footerContacts: 'Контакты',
		},
		events: {
			heroTitle: 'Создание нового события',
			heroCopy:
				'Создайте рейд, подземелье или активность в мире и соберите группу с нужным составом.',
			sectionLeader: 'Лидер события',
			sectionDateTime: 'Дата и время',
			sectionAddon: 'Дополнение',
			sectionInstances: 'Инстансы',
			sectionRoles: 'Состав группы',
			sectionUnroll: 'Анролл',
			sectionPaidSlots: 'Платные слоты',
			sectionPreview: 'Предпросмотр события',
			myCharacter: 'Мой персонаж',
			myCharacterHintSingle: 'Выберите одного из ваших персонажей',
			myCharacterHintMulti:
				'Нажмите на карточку, чтобы выбрать другого персонажа',
			chooseCharacter: 'Выбрать персонажа',
			manualLeader: 'Указать вручную',
			manualLeaderHint: 'Укажите данные рейд-лидера вручную',
			leaderName: 'Ник рейд-лидера',
			leaderRealm: 'Сервер',
			characterSyncHint: 'Синхронизируйте персонажа в кабинете',
			previousMonth: 'Предыдущий месяц',
			nextMonth: 'Следующий месяц',
			hours: 'Часы',
			minutes: 'Минуты',
			in15Minutes: 'Через 15 минут',
			in15MinutesShort: '+15 мин',
			in30MinutesShort: '+30 мин',
			todayEvening: 'Вечером',
			activityTypeAria: 'Вид сбора',
			typeRaid: 'Рейд',
			typeDungeon: 'Подземелье',
			typeSeason: 'Сезон',
			typeWorld: 'Мир',
			instancesHint:
				'Выберите один или несколько инстансов соответствующего типа.',
			selectedInstancesAria: 'Выбранные инстансы',
			roleHint:
				'Укажите минимальное и максимальное количество игроков по ролям через тире или одним числом.',
			countForRole: 'Количество {role}',
			decreaseRoleCount: 'Уменьшить количество: {role}',
			increaseRoleCount: 'Увеличить количество: {role}',
			paidSlotsToggle: 'Включить платные слоты',
			unrollToggle: 'Включить анролл',
			unrollItemIds: 'ID предметов',
			wowheadItem: 'Предмет Wowhead ID {id}',
			itemId: 'ID предмета {id}',
			or: 'или',
			unrollTemplate: 'Шаблон',
			unrollTemplateNone: 'Без шаблона',
			unrollTemplateSelect: 'Выбрать шаблон анролла',
			unrollTemplateEdit: 'Редактировать шаблоны анролла',
			unrollTemplateSoon: 'Редактировать шаблоны (скоро)',
			previewLeader: 'Лидер',
			previewDateTime: 'Дата и время',
			previewInstances: 'Инстансы',
			previewComposition: 'Состав группы',
			previewPaidSlots: 'Платные слоты',
			previewUnroll: 'Анролл',
			previewNotSet: 'Не указан',
			previewSelectedCount: '{count} выбрано',
			previewInstancesCount: '{count} инст.',
			previewUnrollIds: '{count} ID',
			previewNo: 'Нет',
			roleTanks: 'Танки',
			roleHealers: 'Хиллеры',
			roleDamage: 'Дамагеры',
			rolePlaceholderTank: '2-3',
			rolePlaceholderHealer: '4-5',
			rolePlaceholderDamage: '10-12',
			publishEvent: 'Опубликовать событие',
			saveAsTemplate: 'Сохранить как шаблон',
			templatesFootnote:
				'Шаблоны доступны в разделе активностей после подключения серверного сохранения.',
			publishChannelsAria: 'Каналы публикации',
			publishChannelsSettings: 'Настроить каналы публикации',
			editUnrollTemplates: 'Редактировать шаблоны анролла',
			statusPublishReady:
				'Событие подготовлено к публикации локально. Серверное сохранение появится в следующей версии.',
			statusTemplateReady:
				'Шаблон собран локально. В этой версии он не записывается в базу.',
			roleErrorEmpty: 'Заполните количество.',
			roleErrorFormat: 'Используйте формат 2 или 10-12.',
			roleErrorNumbers: 'Укажите корректные цифры.',
			roleErrorMinMax: 'Минимум не может быть больше максимума.',
		},
		raidcheck: {
			title: 'Проверка кд рейда',
			heroEyebrow: 'Raid lockout intelligence',
			heroCopy:
				'Вставьте строку из аддона, выберите сложность и проверьте весь состав перед стартом.',
			source: 'Источник',
			addonString: 'Строка из аддона',
			useFreshExport:
				'Используйте свежую строку из /rr. Для проверки всего рейда нужен обновленный аддон с полным roster.',
			waitingExport: 'Ожидаю строку экспорта',
			type: 'Тип',
			raid: 'Рейд',
			notRaid: 'Не рейд',
			ready: 'Готово',
			checkSource: 'Проверьте источник',
			instance: 'Инстанс',
			notDetected: 'Не определен',
			raidCatalog: 'Каталог рейдов',
			roster: 'Состав',
			authorOnly: 'Только автор',
			rosterFound: 'Roster найден',
			needNewAddon: 'Нужен новый аддон',
			raidToCheck: 'Рейд для проверки',
			chooseCurrentRaid: 'Выберите актуальный рейд',
			allSeasonRaids: 'Все рейды сезона',
			difficulty: 'Сложность',
			pasteFirst: 'Сначала вставьте строку',
			submit: 'Проверить кд',
			result: 'Результат',
			resultTable: 'Таблица кд',
			resultEmpty:
				'После проверки здесь появится список участников рейда и статус каждого персонажа.',
			total: 'Всего',
			clean: 'Чистые',
			locked: 'С кд',
			issues: 'Ошибки',
			playerRealm: 'Игрок / сервер',
			lockout: 'КД',
			othersClean: 'Остальные без кд',
			collapseClean: 'Свернуть чистых игроков',
			showClean: 'Показать остальных чистых ({count})',
			readyToCheck: 'Готов к проверке',
			readyToCheckCopy:
				'Вставьте строку из аддона, выберите сложность и запустите проверку. Запросы к Blizzard выполняются на сервере.',
			statusClean: 'Чистые',
			statusLocked: 'Есть убийства',
			statusError: 'Ошибка проверки',
			statusNotFound: 'Не найден',
			previewParseError: 'Не удалось прочитать строку экспорта.',
			summaryPremium: 'Premium',
		},
		dashboard: {
			welcome: 'Добро пожаловать, {name}',
			battleNetConnected: 'Battle.net подключен',
			syncedAgo: 'Данные синхронизированы 2 мин. назад',
			sync: 'Синхронизация',
			syncNow: 'Синхронизировать',
			syncing: 'Обновляем...',
			reconnectBattleNet: 'Переподключить Battle.net',
			dataUpdated: 'Данные обновлены',
			dataCurrent: 'Данные актуальны',
			topIlvl: 'Топ ilvl',
			unknown: 'н/д',
			logout: 'Выйти',
			regionEurope: 'Регион: Европа',
			realm: 'Realm: {realm}',
			activeCharacters: 'Активных персонажей: {count}',
			characters: 'Персонажей',
			futureActivities: 'Будущих активностей',
			finishedWeek: 'Завершено за неделю',
			raidProgress: 'Прогресс в рейдах',
			createBanner: 'Создать баннер',
			findGroup: 'Найти группу',
			raidCheck: 'Проверить кд рейда',
			addonImport: 'Импорт из аддона',
			myCharacters: 'Мои персонажи',
			allCharacters: 'Все персонажи',
			noCharacters: 'Персонажи пока не подтянуты',
			runSyncHint: 'Запустите синхронизацию в боковой панели.',
			specUnknown: 'Спек не определён',
			online: 'В игре',
			offline: 'Оффлайн',
			accountActivity: 'Активность аккаунта',
			fullHistory: 'Вся история',
			upcoming: 'Будущие активности',
			past: 'Прошлые активности',
			all: 'Все',
			achievements: 'Последние достижения',
			allAchievements: 'Все достижения',
			raidProgressTitle: 'Прогресс в рейдах',
			detailedStats: 'Подробная статистика',
			overallProgress: 'Общий прогресс',
			rewards: 'Награды',
			weekCalendar: 'Календарь на неделю',
			viewCalendar: 'Смотреть календарь',
			raids: 'Рейды',
			keys: 'Ключи',
			farm: 'Фарм',
			misc: 'Разное',
			mythicOverview: 'Mythic+ обзор',
			completedKeys: 'Пройденные ключи',
			seasonMidnight: 'Сезон 2 · Midnight',
			score: 'Рейтинг (Raider.IO)',
			activityDone: 'Завершено',
			guild: 'Гильдия',
		},
		banners: {
			createBannerEyebrow: 'Создание баннера',
			noCharacterTitle: 'Сначала нужен хотя бы один персонаж',
			noCharacterCopy:
				'Синхронизируйте аккаунт в кабинете, и конструктор предложит самого сильного активного персонажа.',
			backToDashboard: 'Назад в кабинет',
			bannerModeRaid: 'Рейд',
			bannerModeMythic: 'Mythic+',
			parameters: 'Параметры',
			preview: 'Предпросмотр',
			finalPng: 'Итоговый PNG',
			createBanner: 'Создать баннер',
			generatingBanner: 'Генерируем баннер...',
			clickToCreate: 'Нажмите «Создать баннер»',
			clickToCreateCopy:
				'После генерации здесь появится финальная картинка и кнопки копирования/скачивания.',
			copyPng: 'Скопировать PNG',
			copySuccess: 'Изображение скопировано.',
			copyError: 'Браузер не дал записать PNG. Используйте скачивание.',
			importTitle: 'Баннер из строки RaidReminder',
			importEyebrow: 'Addon import',
			importButton: 'Импортировать',
			clearButton: 'Очистить',
			scanQr: 'Сканировать QR',
			stopScanner: 'Остановить сканер',
			draft: 'Черновик',
			checkData: 'Проверьте данные',
			resultPng: 'Итоговый PNG',
			source: 'Источник',
			addonData: 'Данные из аддона',
			exportString: 'Строка RaidReminder',
			groupTypeSolo: 'Соло',
			groupTypeParty: 'Группа',
			groupTypeRaid: 'Рейд',
			roleTank: 'Танк',
			roleHealer: 'Хилл',
			roleDamage: 'ДД',
			roleNone: 'Без роли',
			legacyGoal: 'Цель сбора',
			legacy: 'Legacy',
			collectionRun: 'Collection run',
			raidLfg: 'Raid LFG',
			mythicLfg: 'Mythic+ LFG',
			needsInGroup: 'Нужно в группу',
			needsInRaid: 'Состав рейда',
			composition: 'Состав',
			current: 'Сейчас',
			armor: 'Броня',
			requiredBuffs: 'Нужные бафы',
			allBuffsCovered: 'Все закрыты',
		},
		addonExport: {
			legacyRaidName: 'Legacy raid',
			legacyRaidGoal: 'Идем за ачивами, маунтами и трансмогом',
			missingField: 'В строке экспорта нет поля {field}.',
			tooLong: 'Строка экспорта слишком длинная.',
			invalidPrefix: 'Вставьте строку, которая начинается с RR1? или RRQ1?.',
			parseError: 'Не удалось прочитать строку экспорта.',
		},
		party: {
			tank: 'Танк',
			healer: 'Хилл',
			damage: 'ДД',
			missingRoles: 'Слоты не отмечены',
		},
	},
}

function isSupportedLocale(
	value: string | null | undefined,
): value is AppLocale {
	if (!value) {
		return false
	}

	return APP_LOCALES.includes(value as AppLocale)
}

export function normalizeLocale(value: string | null | undefined): AppLocale {
	if (!value) {
		return FALLBACK_LOCALE
	}

	const normalized = value.toLowerCase().trim()
	const compact = normalized.split('-')[0]

	if (isSupportedLocale(normalized)) {
		return normalized
	}

	if (isSupportedLocale(compact)) {
		return compact
	}

	return FALLBACK_LOCALE
}

export function resolveLocaleFromAcceptLanguage(
	acceptLanguage: string | null | undefined,
): AppLocale {
	if (!acceptLanguage) {
		return FALLBACK_LOCALE
	}

	const parts = acceptLanguage
		.split(',')
		.map(part => part.trim())
		.filter(Boolean)

	for (const part of parts) {
		const [rawLocale] = part.split(';')
		const locale = normalizeLocale(rawLocale)

		if (locale === 'ru' || locale === 'en') {
			return locale
		}
	}

	return FALLBACK_LOCALE
}

export function resolveAppLocale({
	acceptLanguage,
	cookieLocale,
}: {
	acceptLanguage?: string | null
	cookieLocale?: string | null
}): AppLocale {
	if (cookieLocale) {
		return normalizeLocale(cookieLocale)
	}

	return resolveLocaleFromAcceptLanguage(acceptLanguage)
}

function getValueByPath(source: DictionaryNode, path: string): string | null {
	const segments = path.split('.')
	let current: unknown = source

	for (const segment of segments) {
		if (!current || typeof current !== 'object' || !(segment in current)) {
			return null
		}

		current = (current as Record<string, unknown>)[segment]
	}

	return typeof current === 'string' ? current : null
}

function applyParams(template: string, params?: TranslationParams) {
	if (!params) {
		return template
	}

	return template.replace(/\{(\w+)\}/g, (token, key) => {
		const value = params[key]

		if (value === undefined || value === null) {
			return token
		}

		return String(value)
	})
}

export function t(
	locale: AppLocale,
	key: string,
	params?: TranslationParams,
): string {
	const localized =
		getValueByPath(dictionaries[locale], key) ??
		getValueByPath(dictionaries[FALLBACK_LOCALE], key) ??
		key

	return applyParams(localized, params)
}
