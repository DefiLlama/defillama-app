import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { CustomView } from '~/containers/ProDashboard/types'
import { useIsClient } from '~/hooks/useIsClient'
import { slug } from '~/utils'
import { getThemeCookie, setThemeCookie } from '~/utils/cookies'
import { getStorageItem, notifyKeyChange, setStorageItem, subscribeToStorageKey } from './localStorageStore'

const DEFILLAMA = 'DEFILLAMA' as const
const PINNED_METRICS_KEY = 'pinned-metrics' as const
export const THEME_SYNC_KEY = 'defillama-theme' as const
const valuesOf = <T extends Record<string, string>>(obj: T) => Object.values(obj) as Array<T[keyof T]>

export const DARK_MODE = 'DARK_MODE' as const
export const UNRELEASED = 'unreleased' as const
export const DEFAULT_PORTFOLIO_NAME = 'main' as const
export const BRIDGES_SHOWING_TXS = 'BRIDGES_SHOWING_TXS' as const
export const BRIDGES_SHOWING_ADDRESSES = 'BRIDGES_SHOWING_ADDRESSES' as const
export const PRO_DASHBOARD_ITEMS = 'PRO_DASHBOARD_ITEMS' as const
export const LLAMA_AI_WELCOME_SHOWN = 'LLAMA_AI_WELCOME_SHOWN' as const

const YIELDS_SAVED_FILTERS = 'YIELDS_SAVED_FILTERS' as const
const CUSTOM_COLUMNS = 'CUSTOM_COLUMNS' as const

export const WATCHLIST_KEYS = {
	DEFI_WATCHLIST: 'DEFI_WATCHLIST',
	YIELDS_WATCHLIST: 'YIELDS_WATCHLIST',
	CHAINS_WATCHLIST: 'CHAINS_WATCHLIST',
	DEFI_SELECTED_PORTFOLIO: 'DEFI_SELECTED_PORTFOLIO',
	YIELDS_SELECTED_PORTFOLIO: 'YIELDS_SELECTED_PORTFOLIO',
	CHAINS_SELECTED_PORTFOLIO: 'CHAINS_SELECTED_PORTFOLIO'
} as const

const {
	DEFI_WATCHLIST,
	YIELDS_WATCHLIST,
	CHAINS_WATCHLIST,
	DEFI_SELECTED_PORTFOLIO,
	YIELDS_SELECTED_PORTFOLIO,
	CHAINS_SELECTED_PORTFOLIO
} = WATCHLIST_KEYS

// DEFI
export const TVL_SETTINGS = {
	POOL2: 'pool2',
	STAKING: 'staking',
	BORROWED: 'borrowed',
	DOUBLE_COUNT: 'doublecounted',
	LIQUID_STAKING: 'liquidstaking',
	VESTING: 'vesting',
	GOV_TOKENS: 'govtokens'
} as const

// FEES
export const FEES_SETTINGS = {
	BRIBES: 'bribes',
	TOKENTAX: 'tokentax'
} as const

// YIELDS
export const YIELDS_SETTINGS = {
	AUDITED: 'AUDITED',
	MILLION_DOLLAR: 'MILLION_DOLLAR',
	NO_IL: 'NO_IL',
	SINGLE_EXPOSURE: 'SINGLE_EXPOSURE',
	MULTI_EXPOSURE: 'MULTI_EXPOSURE',
	STABLECOINS: 'STABLECOINS',
	NO_OUTLIER: 'NO_OUTLIER',
	STABLE_OUTLOOK: 'STABLE_OUTLOOK',
	HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
	NO_BAD_DEBT: 'NO_BAD_DEBT',
	NO_LOCKUP_COLLATERAL: 'NO_LOCKUP_COLLATERAL',
	AIRDROP: 'AIRDROP',
	APY_ZERO: 'APY_ZERO',
	LSD_ONLY: 'LSD_ONLY'
} as const

// NFT
export const NFT_SETTINGS = {
	DISPLAY_USD: 'DISPLAY_USD',
	HIDE_LAST_DAY: 'HIDE_LAST_DAY'
} as const

export const CHAINS_CATEGORY_GROUP_SETTINGS = [
	{
		name: 'L2',
		key: 'L2'
	},
	{
		name: 'Emulators',
		key: 'emulator'
	},
	{
		name: 'Same token',
		key: 'gas'
	},
	{
		name: 'Parachains',
		key: 'parachain'
	},
	{
		name: 'Avalanche L1s',
		key: 'subnet'
	}
] as const

// LIQUIDATIONS
export const LIQS_SETTINGS = {
	LIQS_USING_USD: 'LIQS_USING_USD',
	LIQS_SHOWING_INSPECTOR: 'LIQS_SHOWING_INSPECTOR',
	LIQS_CUMULATIVE: 'LIQS_CUMULATIVE'
} as const

// BRIDGES
export const BRIDGES_SETTINGS = { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES } as const

export type TvlSettingsKey = (typeof TVL_SETTINGS)[keyof typeof TVL_SETTINGS]
export type FeesSettingKey = (typeof FEES_SETTINGS)[keyof typeof FEES_SETTINGS]
export type YieldsSettingKey = (typeof YIELDS_SETTINGS)[keyof typeof YIELDS_SETTINGS]
export type NftSettingKey = (typeof NFT_SETTINGS)[keyof typeof NFT_SETTINGS]
export type LiquidationsSettingKey = (typeof LIQS_SETTINGS)[keyof typeof LIQS_SETTINGS]
export type BridgesSettingKey = (typeof BRIDGES_SETTINGS)[keyof typeof BRIDGES_SETTINGS]
export type ChainsCategoryGroupKey = (typeof CHAINS_CATEGORY_GROUP_SETTINGS)[number]['key']

export type SettingKey =
	| TvlSettingsKey
	| FeesSettingKey
	| NftSettingKey
	| LiquidationsSettingKey
	| BridgesSettingKey
	| ChainsCategoryGroupKey

export type KeysFor<T extends TSETTINGTYPE> = T extends 'tvl'
	? TvlSettingsKey
	: T extends 'fees'
		? FeesSettingKey
		: T extends 'tvl_fees'
			? TvlSettingsKey | FeesSettingKey
			: T extends 'tvl_chains'
				? ChainsCategoryGroupKey
				: T extends 'nfts'
					? NftSettingKey
					: T extends 'liquidations'
						? LiquidationsSettingKey
						: T extends 'bridges'
							? BridgesSettingKey
							: string

type YieldFilterValue = string | number | boolean
type YieldSavedFilter = Record<string, YieldFilterValue>
type YieldSavedFilters = Record<string, YieldSavedFilter>
export type WatchlistStore = Record<string, Record<string, string>>
export type SettingsStore = Partial<Record<SettingKey, boolean>>

export type CustomColumnDef = {
	name: string
	formula: string
	formatType: 'auto' | 'number' | 'usd' | 'percent' | 'string' | 'boolean'
	determinedFormat?: 'number' | 'usd' | 'percent' | 'string' | 'boolean'
}

export type AppStorage = SettingsStore & {
	[YIELDS_SAVED_FILTERS]?: YieldSavedFilters
	[CUSTOM_COLUMNS]?: CustomColumnDef[]
	[LLAMA_AI_WELCOME_SHOWN]?: boolean
	[PRO_DASHBOARD_ITEMS]?: unknown
	[DEFI_WATCHLIST]?: WatchlistStore
	[YIELDS_WATCHLIST]?: WatchlistStore
	[CHAINS_WATCHLIST]?: WatchlistStore
	[DEFI_SELECTED_PORTFOLIO]?: string
	[YIELDS_SELECTED_PORTFOLIO]?: string
	[CHAINS_SELECTED_PORTFOLIO]?: string
	tableViews?: CustomView[]
}

const CHAINS_CATEGORY_GROUP_KEYS = CHAINS_CATEGORY_GROUP_SETTINGS.map((g) => g.key) as ChainsCategoryGroupKey[]
const CHAINS_CATEGORY_GROUP_KEYS_SET = new Set<string>(CHAINS_CATEGORY_GROUP_KEYS)
export const TVL_SETTINGS_KEYS = valuesOf(TVL_SETTINGS)
export const TVL_SETTINGS_KEYS_SET = new Set<string>(TVL_SETTINGS_KEYS)
export const FEES_SETTINGS_KEYS = valuesOf(FEES_SETTINGS)
export const FEES_SETTINGS_KEYS_SET = new Set<string>(FEES_SETTINGS_KEYS)
export const NFT_SETTINGS_KEYS = valuesOf(NFT_SETTINGS)
export const LIQS_SETTINGS_KEYS = valuesOf(LIQS_SETTINGS)
export const BRIDGES_SETTINGS_KEYS = valuesOf(BRIDGES_SETTINGS)

export const isTvlSettingsKey = (value: string): value is TvlSettingsKey => TVL_SETTINGS_KEYS_SET.has(value)
export const isFeesSettingKey = (value: string): value is FeesSettingKey => FEES_SETTINGS_KEYS_SET.has(value)
export const isChainsCategoryGroupKey = (value: string): value is ChainsCategoryGroupKey =>
	CHAINS_CATEGORY_GROUP_KEYS_SET.has(value)

export function subscribeToLocalStorage(callback: () => void) {
	return subscribeToStorageKey(DEFILLAMA, callback)
}

export function subscribeToPinnedMetrics(callback: () => void) {
	return subscribeToStorageKey(PINNED_METRICS_KEY, callback)
}

const toggleDarkMode = () => {
	const isDarkMode = getThemeCookie() === 'dark'
	setThemeCookie(!isDarkMode)
	notifyKeyChange(THEME_SYNC_KEY)
}

export function useDarkModeManager() {
	const store = useSyncExternalStore(
		(callback) => subscribeToStorageKey(THEME_SYNC_KEY, callback),
		() => getThemeCookie() ?? 'dark',
		() => 'dark'
	)

	const isDarkMode = store === 'dark'

	useEffect(() => {
		if (!isDarkMode) {
			document.documentElement.classList.remove('dark')
			document.documentElement.classList.add('light')
		} else {
			document.documentElement.classList.remove('light')
			document.documentElement.classList.add('dark')
		}
	}, [isDarkMode])

	return [isDarkMode, toggleDarkMode] as [boolean, () => void]
}

export const readAppStorageRaw = () => getStorageItem(DEFILLAMA)
const isAppStorage = (value: unknown): value is AppStorage =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

export const readAppStorage = (): AppStorage => {
	const raw = readAppStorageRaw()
	if (!raw) return {}

	try {
		const parsed: unknown = JSON.parse(raw)
		return isAppStorage(parsed) ? parsed : {}
	} catch {
		return {}
	}
}
export const writeAppStorage = (next: AppStorage) => {
	setStorageItem(DEFILLAMA, JSON.stringify(next))
}

const updateSetting = (key: string) => {
	const current = readAppStorage()

	const urlParams = new URLSearchParams(window.location.search)
	const storedValue = (current as SettingsStore)[key as SettingKey]

	const newState = !(
		(urlParams.get(key) ? urlParams.get(key) === 'true' : null) ??
		(typeof storedValue === 'boolean' ? storedValue : false)
	)

	const url = new URL(window.location.href)
	url.searchParams.set(key, newState.toString())
	window.history.pushState({}, '', url)

	writeAppStorage({ ...(current as AppStorage), [key]: newState })
}

export const updateAllSettingsInLsAndUrl = (keys: Partial<Record<SettingKey, boolean>>) => {
	const current = readAppStorage()

	const url = new URL(window.location.href)

	for (const key in keys) {
		if (keys[key]) {
			url.searchParams.set(key, 'true')
		} else {
			url.searchParams.delete(key)
		}
	}

	window.history.pushState({}, '', url)

	writeAppStorage({ ...(current as AppStorage), ...keys })
}

export type TSETTINGTYPE =
	| 'tvl'
	| 'fees'
	| 'tvl_fees'
	| 'tvl_chains'
	| 'stablecoins'
	| 'nfts'
	| 'liquidations'
	| 'bridges'
	| 'dimension_chart_interval'
	| 'compare_chains'

function getSettingKeys<T extends TSETTINGTYPE>(type: T): KeysFor<T>[] {
	switch (type) {
		case 'tvl':
			return TVL_SETTINGS_KEYS as KeysFor<T>[]
		case 'fees':
			return FEES_SETTINGS_KEYS as KeysFor<T>[]
		case 'tvl_fees':
			return [...TVL_SETTINGS_KEYS, ...FEES_SETTINGS_KEYS] as KeysFor<T>[]
		case 'tvl_chains':
			return CHAINS_CATEGORY_GROUP_KEYS as KeysFor<T>[]
		case 'nfts':
			return NFT_SETTINGS_KEYS as KeysFor<T>[]
		case 'liquidations':
			return LIQS_SETTINGS_KEYS as KeysFor<T>[]
		case 'bridges':
			return BRIDGES_SETTINGS_KEYS as KeysFor<T>[]
		default:
			return [] as KeysFor<T>[]
	}
}

export function useLocalStorageSettingsManager<T extends TSETTINGTYPE>(
	type: T
): [Record<KeysFor<T>, boolean>, (key: KeysFor<T>) => void] {
	const keys = getSettingKeys(type)
	const isClient = useIsClient()

	const snapshot = useSyncExternalStore(
		subscribeToLocalStorage,
		() => {
			try {
				const urlParams = isClient ? new URLSearchParams(window.location.search) : null

				const ps = readAppStorage()
				const obj = {} as Record<KeysFor<T>, boolean>
				for (const s of keys) {
					const storedValue = (ps as SettingsStore)[s as SettingKey]
					obj[s] =
						(urlParams && urlParams.get(s) ? urlParams.get(s) === 'true' : null) ??
						(typeof storedValue === 'boolean' ? storedValue : false)
				}

				return JSON.stringify(obj)
			} catch {
				return '{}'
			}
		},
		() => '{}'
	)

	const settings = useMemo(() => {
		try {
			return JSON.parse(snapshot) as Record<KeysFor<T>, boolean>
		} catch {
			return {} as Record<KeysFor<T>, boolean>
		}
	}, [snapshot])

	return [settings, (key: KeysFor<T>) => updateSetting(key)]
}

export const updateAllSettings = (keys: Partial<Record<SettingKey, boolean>>) => {
	const current = readAppStorage()
	writeAppStorage({ ...(current as AppStorage), ...keys })
}

export function useManageAppSettings(): [SettingsStore, (keys: Partial<Record<SettingKey, boolean>>) => void] {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => getStorageItem(DEFILLAMA, '{}') ?? '{}',
		() => '{}'
	)
	const toggledSettings = useMemo(() => JSON.parse(store) as SettingsStore, [store])

	return [toggledSettings, updateAllSettings]
}

// YIELDS SAVED FILTERS HOOK
export function useYieldFilters() {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => getStorageItem(DEFILLAMA, '{}') ?? '{}',
		() => '{}'
	)

	const parsedStore = useMemo(() => JSON.parse(store) as AppStorage, [store])
	const savedFilters: YieldSavedFilters = parsedStore?.[YIELDS_SAVED_FILTERS] ?? {}

	return {
		savedFilters,
		saveFilter: (name: string, filters: YieldSavedFilter) => {
			writeAppStorage({
				...readAppStorage(),
				[YIELDS_SAVED_FILTERS]: { ...savedFilters, [name]: filters }
			})
		},
		deleteFilter: (name: string) => {
			const newFilters = { ...savedFilters }
			delete newFilters[name]
			writeAppStorage({
				...readAppStorage(),
				[YIELDS_SAVED_FILTERS]: newFilters
			})
		}
	}
}

export function useWatchlistManager(type: 'defi' | 'yields' | 'chains') {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => getStorageItem(DEFILLAMA, '{}') ?? '{}',
		() => '{}'
	)
	const parsedStore = useMemo(() => JSON.parse(store) as AppStorage, [store])

	return useMemo(() => {
		const watchlistKey = type === 'defi' ? DEFI_WATCHLIST : type === 'yields' ? YIELDS_WATCHLIST : CHAINS_WATCHLIST
		const selectedPortfolioKey =
			type === 'defi'
				? DEFI_SELECTED_PORTFOLIO
				: type === 'yields'
					? YIELDS_SELECTED_PORTFOLIO
					: CHAINS_SELECTED_PORTFOLIO

		const watchlist = (parsedStore[watchlistKey as keyof AppStorage] as WatchlistStore | undefined) ?? {
			[DEFAULT_PORTFOLIO_NAME]: {}
		}
		const portfolios = Object.keys(watchlist)
		const selectedPortfolio =
			(parsedStore[selectedPortfolioKey as keyof AppStorage] as string) ?? DEFAULT_PORTFOLIO_NAME

		return {
			portfolios,
			selectedPortfolio,
			savedProtocols: new Set(Object.values(watchlist[selectedPortfolio] ?? {})) as Set<string>,
			addPortfolio: (name: string) => {
				const currentStore = readAppStorage()
				const watchlist = (currentStore[watchlistKey as keyof AppStorage] as WatchlistStore | undefined) ?? {
					[DEFAULT_PORTFOLIO_NAME]: {}
				}
				const newWatchlist = { ...watchlist, [name]: { ...(watchlist[name] ?? {}) } }
				writeAppStorage({
					...(currentStore as AppStorage),
					[watchlistKey]: newWatchlist,
					[selectedPortfolioKey]: name
				})
			},
			removePortfolio: (name: string) => {
				const currentStore = readAppStorage()
				const watchlist = (currentStore[watchlistKey as keyof AppStorage] as WatchlistStore | undefined) ?? {
					[DEFAULT_PORTFOLIO_NAME]: {}
				}
				const newWatchlist = { ...watchlist }
				delete newWatchlist[name]

				let hasKeys = false
				for (const _ in newWatchlist) {
					hasKeys = true
					break
				}
				if (!hasKeys) {
					newWatchlist[DEFAULT_PORTFOLIO_NAME] = {}
				}

				writeAppStorage({
					...(currentStore as AppStorage),
					[watchlistKey]: newWatchlist,
					[selectedPortfolioKey]: DEFAULT_PORTFOLIO_NAME
				})
			},
			setSelectedPortfolio: (name: string) => {
				const currentStore = readAppStorage()
				writeAppStorage({
					...(currentStore as AppStorage),
					[selectedPortfolioKey]: name
				})
			},
			addProtocol: (name: string) => {
				const currentStore = readAppStorage()
				const watchlist = (currentStore[watchlistKey as keyof AppStorage] as WatchlistStore | undefined) ?? {
					[DEFAULT_PORTFOLIO_NAME]: {}
				}
				const currentSelectedPortfolio =
					(currentStore[selectedPortfolioKey as keyof AppStorage] as string) ?? DEFAULT_PORTFOLIO_NAME

				const newWatchlist = {
					...watchlist,
					[currentSelectedPortfolio]: {
						...watchlist[currentSelectedPortfolio],
						[slug(name)]: name
					}
				}

				writeAppStorage({
					...(currentStore as AppStorage),
					[watchlistKey]: newWatchlist
				})
			},
			removeProtocol: (name: string) => {
				const currentStore = readAppStorage()
				const watchlist = (currentStore[watchlistKey as keyof AppStorage] as WatchlistStore | undefined) ?? {
					[DEFAULT_PORTFOLIO_NAME]: {}
				}
				const currentSelectedPortfolio =
					(currentStore[selectedPortfolioKey as keyof AppStorage] as string) ?? DEFAULT_PORTFOLIO_NAME

				const newWatchlist = {
					...watchlist,
					[currentSelectedPortfolio]: { ...watchlist[currentSelectedPortfolio] }
				}
				delete newWatchlist[currentSelectedPortfolio][slug(name)]

				writeAppStorage({
					...(currentStore as AppStorage),
					[watchlistKey]: newWatchlist
				})
			}
		}
	}, [parsedStore, type])
}

export function useCustomColumns() {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => getStorageItem(DEFILLAMA, '{}') ?? '{}',
		() => '{}'
	)
	const parsedStore = useMemo(() => {
		try {
			return JSON.parse(store) as AppStorage
		} catch {
			return {} as AppStorage
		}
	}, [store])

	const customColumns = useMemo(() => {
		return (parsedStore?.[CUSTOM_COLUMNS] as CustomColumnDef[] | undefined) ?? []
	}, [parsedStore])

	function setCustomColumns(cols: CustomColumnDef[]) {
		writeAppStorage({ ...parsedStore, [CUSTOM_COLUMNS]: cols })
	}

	function addCustomColumn(col: CustomColumnDef) {
		setCustomColumns([...customColumns, col])
	}

	function editCustomColumn(index: number, col: CustomColumnDef) {
		setCustomColumns(customColumns.map((c, i) => (i === index ? col : c)))
	}

	function deleteCustomColumn(index: number) {
		setCustomColumns(customColumns.filter((_, i) => i !== index))
	}

	return {
		customColumns,
		setCustomColumns,
		addCustomColumn,
		editCustomColumn,
		deleteCustomColumn
	}
}

export function useLlamaAIWelcome(): [boolean, () => void] {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => getStorageItem(DEFILLAMA, '{}') ?? '{}',
		() => '{}'
	)

	const parsedStore = useMemo(() => JSON.parse(store) as AppStorage, [store])
	const shown = parsedStore?.[LLAMA_AI_WELCOME_SHOWN] ?? false

	const setShown = () => {
		writeAppStorage({ ...readAppStorage(), [LLAMA_AI_WELCOME_SHOWN]: true })
	}

	return [shown, setShown]
}
