export const SETTINGS_TAB_IDS = ['persona', 'app', 'capabilities', 'integrations', 'lab'] as const

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number]

export type SettingsInitialState = { tab?: SettingsTabId; tgloginToken?: string | null }

type RouterQuery = Record<string, string | string[] | undefined>
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const PENDING_TGLOGIN_KEY = 'pending_tglogin'
const PENDING_SETTINGS_TAB_KEY = 'pending_settings_tab'

export function isSettingsTabId(tab: unknown): tab is SettingsTabId {
	return typeof tab === 'string' && SETTINGS_TAB_IDS.includes(tab as SettingsTabId)
}

function firstQueryValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value
}

function withoutQueryKeys(query: RouterQuery, keys: Array<string>): RouterQuery {
	const next: RouterQuery = {}
	for (const key in query) {
		if (!keys.includes(key)) next[key] = query[key]
	}
	return next
}

export function getSettingsIntentFromQuery(query: RouterQuery): {
	initialState: SettingsInitialState
	nextQuery: RouterQuery
} | null {
	const tgloginToken = firstQueryValue(query.tglogin)
	if (tgloginToken) {
		return {
			initialState: { tab: 'integrations', tgloginToken },
			nextQuery: withoutQueryKeys(query, ['tglogin', 'modal', 'tab'])
		}
	}

	if (firstQueryValue(query.modal) !== 'settings') return null
	const tab = firstQueryValue(query.tab)
	return {
		initialState: { tab: isSettingsTabId(tab) ? tab : undefined, tgloginToken: null },
		nextQuery: withoutQueryKeys(query, ['modal', 'tab'])
	}
}

export function stashSettingsIntent(storage: StorageLike, initialState: SettingsInitialState) {
	if (initialState.tgloginToken) {
		storage.setItem(PENDING_TGLOGIN_KEY, initialState.tgloginToken)
		return
	}
	if (initialState.tab) storage.setItem(PENDING_SETTINGS_TAB_KEY, initialState.tab)
}

export function readPendingSettingsIntent(storage: StorageLike): SettingsInitialState | null {
	const tgloginToken = storage.getItem(PENDING_TGLOGIN_KEY)
	if (tgloginToken) {
		storage.removeItem(PENDING_TGLOGIN_KEY)
		return { tab: 'integrations', tgloginToken }
	}

	const tab = storage.getItem(PENDING_SETTINGS_TAB_KEY)
	if (!isSettingsTabId(tab)) return null
	storage.removeItem(PENDING_SETTINGS_TAB_KEY)
	return { tab, tgloginToken: null }
}
