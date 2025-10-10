/* eslint-disable no-unused-vars*/
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useIsClient } from '~/hooks'
import { slug } from '~/utils'
import { getThemeCookie, setThemeCookie } from '~/utils/cookies'

const DEFILLAMA = 'DEFILLAMA'
export const DARK_MODE = 'DARK_MODE'

export const WALLET_LINK_MODAL = 'wallet-link-modal-shown'

// DEFI
const POOL2 = 'pool2'
const STAKING = 'staking'
const BORROWED = 'borrowed'
const DOUBLE_COUNT = 'doublecounted'
const LIQUID_STAKING = 'liquidstaking'
const VESTING = 'vesting'
const GOV_TOKENS = 'govtokens'

// NFT
const DISPLAY_USD = 'DISPLAY_USD'
const HIDE_LAST_DAY = 'HIDE_LAST_DAY'

// YIELDS
const STABLECOINS = 'STABLECOINS'
const SINGLE_EXPOSURE = 'SINGLE_EXPOSURE'
const MULTI_EXPOSURE = 'MULTI_EXPOSURE'
const NO_IL = 'NO_IL'
const MILLION_DOLLAR = 'MILLION_DOLLAR'
const AUDITED = 'AUDITED'
const NO_OUTLIER = 'NO_OUTLIER'
const STABLE_OUTLOOK = 'STABLE_OUTLOOK'
const HIGH_CONFIDENCE = 'HIGH_CONFIDENCE'
const NO_BAD_DEBT = 'NO_BAD_DEBT'
const NO_LOCKUP_COLLATERAL = 'NO_LOCKUP_COLLATERAL'
const AIRDROP = 'AIRDROP'
const APY_ZERO = 'APY_ZERO'
const LSD_ONLY = 'LSD_ONLY'

// STABLECOINS
export const UNRELEASED = 'unreleased'
const PEGGEDUSD = 'PEGGEDUSD'
const PEGGEDEUR = 'PEGGEDEUR'
const PEGGEDSGD = 'PEGGEDSGD'
const PEGGEDJPY = 'PEGGEDJPY'
const PEGGEDCNY = 'PEGGEDCNY'
const PEGGEDUAH = 'PEGGEDUAH'
const PEGGEDARS = 'PEGGEDARS'
const PEGGEDGBP = 'PEGGEDGBP'
const PEGGEDVAR = 'PEGGEDVAR'
const PEGGEDCAD = 'PEGGEDCAD'
const PEGGEDAUD = 'PEGGEDAUD'
const PEGGEDTRY = 'PEGGEDTRY'
const PEGGEDCHF = 'PEGGEDCHF'
const PEGGEDCOP = 'PEGGEDCOP'
const PEGGEDREAL = 'PEGGEDREAL'
const PEGGEDRUB = 'PEGGEDRUB'
const PEGGEDPHP = 'PEGGEDPHP'
const FIATSTABLES = 'FIATSTABLES'
const CRYPTOSTABLES = 'CRYPTOSTABLES'
const ALGOSTABLES = 'ALGOSTABLES'
const DEPEGGED = 'DEPEGGED'

// WATCHLISTS
const DEFI_WATCHLIST = 'DEFI_WATCHLIST'
const YIELDS_WATCHLIST = 'YIELDS_WATCHLIST'
const CHAINS_WATCHLIST = 'CHAINS_WATCHLIST'
const DEFI_SELECTED_PORTFOLIO = 'DEFI_SELECTED_PORTFOLIO'
const YIELDS_SELECTED_PORTFOLIO = 'YIELDS_SELECTED_PORTFOLIO'
const CHAINS_SELECTED_PORTFOLIO = 'CHAINS_SELECTED_PORTFOLIO'
export const DEFAULT_PORTFOLIO_NAME = 'main'

// YIELDS SAVED FILTERS
const YIELDS_SAVED_FILTERS = 'YIELDS_SAVED_FILTERS'

// LIQUIDATIONS
const LIQS_USING_USD = 'LIQS_USING_USD'
const LIQS_SHOWING_INSPECTOR = 'LIQS_SHOWING_INSPECTOR'
const LIQS_CUMULATIVE = 'LIQS_CUMULATIVE'

// BRIDGES
export const BRIDGES_SHOWING_TXS = 'BRIDGES_SHOWING_TXS'
export const BRIDGES_SHOWING_ADDRESSES = 'BRIDGES_SHOWING_ADDRESSES'

//custom columns
const CUSTOM_COLUMNS = 'CUSTOM_COLUMNS'

// Pro Dashboard
export const PRO_DASHBOARD_ITEMS = 'PRO_DASHBOARD_ITEMS'
export const LLAMA_AI_WELCOME_DISMISSED = 'LLAMA_AI_WELCOME_DISMISSED'

export const DEFI_SETTINGS = { POOL2, STAKING, BORROWED, DOUBLE_COUNT, LIQUID_STAKING, VESTING, GOV_TOKENS } as const

const BRIBES = 'bribes'
const TOKENTAX = 'tokentax'

export const FEES_SETTINGS = { BRIBES, TOKENTAX }

export const YIELDS_SETTINGS = {
	AUDITED,
	MILLION_DOLLAR,
	NO_IL,
	SINGLE_EXPOSURE,
	MULTI_EXPOSURE,
	STABLECOINS,
	NO_OUTLIER,
	STABLE_OUTLOOK,
	HIGH_CONFIDENCE,
	NO_BAD_DEBT,
	NO_LOCKUP_COLLATERAL,
	AIRDROP,
	APY_ZERO,
	LSD_ONLY
}

export const STABLECOINS_SETTINGS = {
	PEGGEDUSD,
	PEGGEDEUR,
	PEGGEDSGD,
	PEGGEDJPY,
	PEGGEDCNY,
	PEGGEDUAH,
	PEGGEDARS,
	PEGGEDGBP,
	PEGGEDVAR,
	PEGGEDCAD,
	PEGGEDAUD,
	PEGGEDTRY,
	PEGGEDCHF,
	PEGGEDCOP,
	PEGGEDREAL,
	PEGGEDRUB,
	PEGGEDPHP,
	FIATSTABLES,
	CRYPTOSTABLES,
	ALGOSTABLES,
	DEPEGGED,
	UNRELEASED
}

export const NFT_SETTINGS = { DISPLAY_USD, HIDE_LAST_DAY }

export const DEFI_CHAINS_SETTINGS = [
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
]

export const LIQS_SETTINGS = { LIQS_USING_USD, LIQS_SHOWING_INSPECTOR, LIQS_CUMULATIVE }

export const BRIDGES_SETTINGS = { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES }

const DEFI_CHAINS_KEYS = DEFI_CHAINS_SETTINGS.map((g) => g.key)
export const DEFI_SETTINGS_KEYS = Object.values(DEFI_SETTINGS) as Array<string>
export const FEES_SETTINGS_KEYS = Object.values(FEES_SETTINGS)
export const STABLECOINS_SETTINGS_KEYS = Object.values(STABLECOINS_SETTINGS)
export const NFT_SETTINGS_KEYS = Object.values(NFT_SETTINGS)
export const LIQS_SETTINGS_KEYS = Object.values(LIQS_SETTINGS)
export const BRIDGES_SETTINGS_KEYS = Object.values(BRIDGES_SETTINGS)

export function subscribeToLocalStorage(callback: () => void) {
	// Listen for localStorage changes (for other settings)
	window.addEventListener('storage', callback)

	// Listen for theme changes
	window.addEventListener('themeChange', callback)

	return () => {
		window.removeEventListener('storage', callback)
		window.removeEventListener('themeChange', callback)
	}
}

export function subscribeToPinnedMetrics(callback: () => void) {
	window.addEventListener('pinnedMetricsChange', callback)

	return () => {
		window.removeEventListener('pinnedMetricsChange', callback)
	}
}

const toggleDarkMode = () => {
	const isDarkMode = getThemeCookie() === 'true'
	setThemeCookie(!isDarkMode)
	// Dispatch both storage event (for localStorage) and a custom theme event
	window.dispatchEvent(new Event('storage'))
	window.dispatchEvent(new CustomEvent('themeChange'))
}

export function useDarkModeManager() {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => getThemeCookie() ?? 'true',
		() => 'true'
	)

	const isDarkMode = store === 'true'

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

const updateSetting = (key) => {
	const current = JSON.parse(localStorage.getItem(DEFILLAMA) ?? '{}')

	const urlParams = new URLSearchParams(window.location.search)

	const newState = !((urlParams.get(key) ? urlParams.get(key) === 'true' : null) ?? current[key] ?? false)

	const url = new URL(window.location.href)
	url.searchParams.set(key, newState.toString())
	window.history.pushState({}, '', url)

	localStorage.setItem(DEFILLAMA, JSON.stringify({ ...current, [key]: newState }))

	window.dispatchEvent(new Event('storage'))
}

export const updateAllSettingsInLsAndUrl = (keys: Record<string, boolean>) => {
	const current = JSON.parse(localStorage.getItem(DEFILLAMA) ?? '{}')

	const url = new URL(window.location.href)

	for (const key in keys) {
		if (keys[key]) {
			url.searchParams.set(key, 'true')
		} else {
			url.searchParams.delete(key)
		}
	}

	window.history.pushState({}, '', url)

	localStorage.setItem(DEFILLAMA, JSON.stringify({ ...current, ...keys }))

	window.dispatchEvent(new Event('storage'))
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

function getSettingKeys(type: TSETTINGTYPE) {
	switch (type) {
		case 'tvl':
			return DEFI_SETTINGS_KEYS
		case 'fees':
			return FEES_SETTINGS_KEYS
		case 'tvl_fees':
			return [...DEFI_SETTINGS_KEYS, ...FEES_SETTINGS_KEYS]
		case 'tvl_chains':
			return DEFI_CHAINS_KEYS
		case 'stablecoins':
			return STABLECOINS_SETTINGS_KEYS
		case 'nfts':
			return NFT_SETTINGS_KEYS
		case 'liquidations':
			return LIQS_SETTINGS_KEYS
		case 'bridges':
			return BRIDGES_SETTINGS_KEYS
		default:
			return []
	}
}

export function useLocalStorageSettingsManager(type: TSETTINGTYPE): [Record<string, boolean>, (key) => void] {
	const keys = useMemo(() => getSettingKeys(type), [type])
	const isClient = useIsClient()

	const snapshot = useSyncExternalStore(
		subscribeToLocalStorage,
		() => {
			try {
				const urlParams = isClient ? new URLSearchParams(window.location.search) : null

				const ps = JSON.parse(localStorage.getItem(DEFILLAMA) ?? '{}')
				const obj = Object.fromEntries(
					keys.map((s) => [s, (urlParams && urlParams.get(s) ? urlParams.get(s) === 'true' : null) ?? ps[s] ?? false])
				)

				return JSON.stringify(obj)
			} catch {
				return '{}'
			}
		},
		() => '{}'
	)

	const settings = useMemo<Record<string, boolean>>(() => JSON.parse(snapshot), [snapshot])

	return [settings, updateSetting]
}

export const updateAllSettings = (keys: Record<string, boolean>) => {
	const current = JSON.parse(localStorage.getItem(DEFILLAMA) ?? '{}')
	localStorage.setItem(DEFILLAMA, JSON.stringify({ ...current, ...keys }))
	window.dispatchEvent(new Event('storage'))
}

export function useManageAppSettings(): [Record<string, boolean>, (keys: Record<string, boolean>) => void] {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(DEFILLAMA) ?? '{}',
		() => '{}'
	)
	const toggledSettings = useMemo(() => JSON.parse(store), [store])

	return [toggledSettings, updateAllSettings]
}

// YIELDS SAVED FILTERS HOOK
export function useYieldFilters() {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(DEFILLAMA) ?? '{}',
		() => '{}'
	)

	const savedFilters = useMemo(() => JSON.parse(store)?.[YIELDS_SAVED_FILTERS] ?? {}, [store])

	return {
		savedFilters,
		saveFilter: (name: string, filters: Record<string, string | number | boolean>) => {
			localStorage.setItem(
				DEFILLAMA,
				JSON.stringify({ ...JSON.parse(store), [YIELDS_SAVED_FILTERS]: { ...savedFilters, [name]: filters } })
			)
			window.dispatchEvent(new Event('storage'))
		},
		deleteFilter: (name: string) => {
			const newFilters = { ...savedFilters }
			delete newFilters[name]
			localStorage.setItem(DEFILLAMA, JSON.stringify({ ...JSON.parse(store), [YIELDS_SAVED_FILTERS]: newFilters }))
			window.dispatchEvent(new Event('storage'))
		}
	}
}

export function useWatchlistManager(type: 'defi' | 'yields' | 'chains') {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(DEFILLAMA) ?? '{}',
		() => '{}'
	)

	return useMemo(() => {
		const watchlistKey = type === 'defi' ? DEFI_WATCHLIST : type === 'yields' ? YIELDS_WATCHLIST : CHAINS_WATCHLIST
		const selectedPortfolioKey =
			type === 'defi'
				? DEFI_SELECTED_PORTFOLIO
				: type === 'yields'
					? YIELDS_SELECTED_PORTFOLIO
					: CHAINS_SELECTED_PORTFOLIO
		const watchlist = JSON.parse(store)?.[watchlistKey] ?? { [DEFAULT_PORTFOLIO_NAME]: {} }

		const portfolios = Object.keys(watchlist)

		const selectedPortfolio = JSON.parse(store)?.[selectedPortfolioKey] ?? DEFAULT_PORTFOLIO_NAME

		return {
			portfolios,
			selectedPortfolio,
			savedProtocols: new Set(Object.values(watchlist[selectedPortfolio] ?? {})) as Set<string>,
			addPortfolio: (name: string) => {
				const watchlist = JSON.parse(store)?.[watchlistKey] ?? { [DEFAULT_PORTFOLIO_NAME]: {} }
				const newWatchlist = { ...watchlist, [name]: {} }
				localStorage.setItem(
					DEFILLAMA,
					JSON.stringify({ ...JSON.parse(store), [watchlistKey]: newWatchlist, [selectedPortfolioKey]: name })
				)
				window.dispatchEvent(new Event('storage'))
			},
			removePortfolio: (name: string) => {
				const watchlist = JSON.parse(store)?.[watchlistKey] ?? { [DEFAULT_PORTFOLIO_NAME]: {} }
				const newWatchlist = { ...watchlist }
				delete newWatchlist[name]
				localStorage.setItem(
					DEFILLAMA,
					JSON.stringify({
						...JSON.parse(store),
						[watchlistKey]: newWatchlist,
						[selectedPortfolioKey]: DEFAULT_PORTFOLIO_NAME
					})
				)
				window.dispatchEvent(new Event('storage'))
			},
			setSelectedPortfolio: (name: string) => {
				localStorage.setItem(DEFILLAMA, JSON.stringify({ ...JSON.parse(store), [selectedPortfolioKey]: name }))
				window.dispatchEvent(new Event('storage'))
			},
			addProtocol: (name: string) => {
				const watchlist = JSON.parse(store)?.[watchlistKey] ?? { [DEFAULT_PORTFOLIO_NAME]: {} }
				const newWatchlist = {
					...watchlist,
					[selectedPortfolio]: { ...watchlist[selectedPortfolio], [slug(name)]: name }
				}
				localStorage.setItem(DEFILLAMA, JSON.stringify({ ...JSON.parse(store), [watchlistKey]: newWatchlist }))
				window.dispatchEvent(new Event('storage'))
			},
			removeProtocol: (name: string) => {
				const watchlist = JSON.parse(store)?.[watchlistKey] ?? { [DEFAULT_PORTFOLIO_NAME]: {} }
				const newWatchlist = { ...watchlist, [selectedPortfolio]: { ...watchlist[selectedPortfolio] } }
				delete newWatchlist[selectedPortfolio][slug(name)]
				localStorage.setItem(DEFILLAMA, JSON.stringify({ ...JSON.parse(store), [watchlistKey]: newWatchlist }))
				window.dispatchEvent(new Event('storage'))
			}
		}
	}, [store, type])
}

export function useCustomColumns() {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(DEFILLAMA) ?? '{}',
		() => '{}'
	)

	const customColumns = useMemo(() => JSON.parse(store)?.[CUSTOM_COLUMNS] ?? [], [store])

	function setCustomColumns(cols) {
		localStorage.setItem(DEFILLAMA, JSON.stringify({ ...JSON.parse(store), [CUSTOM_COLUMNS]: cols }))
		window.dispatchEvent(new Event('storage'))
	}

	function addCustomColumn(col) {
		setCustomColumns([...customColumns, col])
		window.dispatchEvent(new Event('storage'))
	}

	function editCustomColumn(index, col) {
		setCustomColumns(customColumns.map((c, i) => (i === index ? col : c)))
		window.dispatchEvent(new Event('storage'))
	}

	function deleteCustomColumn(index) {
		setCustomColumns(customColumns.filter((_, i) => i !== index))
		window.dispatchEvent(new Event('storage'))
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
		() => localStorage.getItem(DEFILLAMA) ?? '{}',
		() => '{}'
	)

	const dismissed = useMemo(() => JSON.parse(store)?.[LLAMA_AI_WELCOME_DISMISSED] ?? false, [store])

	const setDismissed = () => {
		localStorage.setItem(DEFILLAMA, JSON.stringify({ ...JSON.parse(store), [LLAMA_AI_WELCOME_DISMISSED]: true }))
		window.dispatchEvent(new Event('storage'))
	}

	return [dismissed, setDismissed]
}
