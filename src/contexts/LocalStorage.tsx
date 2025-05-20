/* eslint-disable no-unused-vars*/
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useSyncExternalStore } from 'react'
// import { trackGoal } from 'fathom-client'
import { slug } from '~/utils'
import { useIsClient } from '~/hooks'
import { useRouter } from 'next/router'
import { IWatchlist } from './types'
import { useUserConfig } from '~/hooks/useUserConfig'

const DEFILLAMA = 'DEFILLAMA'
export const DARK_MODE = 'DARK_MODE'

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
const FIATSTABLES = 'FIATSTABLES'
const CRYPTOSTABLES = 'CRYPTOSTABLES'
const ALGOSTABLES = 'ALGOSTABLES'
const DEPEGGED = 'DEPEGGED'

// WATCHLISTS
const DEFI_WATCHLIST = 'DEFI_WATCHLIST'
const YIELDS_WATCHLIST = 'YIELDS_WATCHLIST'
const SELECTED_PORTFOLIO = 'SELECTED_PORTFOLIO'
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

// DIMENSIONS (DEXS AND FEES)
const DIMENSIONS_CHART_INTERVAL_KEY = 'DIMENSIONS:CHART_INTERVAL'

//custom columns
const CUSTOM_COLUMNS = 'CUSTOM_COLUMNS'

// Pro Dashboard
export const PRO_DASHBOARD_ITEMS = 'PRO_DASHBOARD_ITEMS'

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

const UPDATABLE_KEYS = [
	DEFI_WATCHLIST,
	YIELDS_WATCHLIST,
	SELECTED_PORTFOLIO,
	YIELDS_SAVED_FILTERS,
	CUSTOM_COLUMNS,
	PRO_DASHBOARD_ITEMS
]

const UPDATE_KEY = 'UPDATE_KEY'
const UPDATE_KEY_OPTIONALLY_PERSIST = 'UPDATE_KEY_OPTIONALLY_PERSIST'

const LocalStorageContext = createContext(null)

export function useLocalStorageContext() {
	return useContext(LocalStorageContext)
}

function reducer(state, { type, payload }) {
	switch (type) {
		case UPDATE_KEY: {
			const { key, value } = payload
			if (!UPDATABLE_KEYS.some((k) => k === key)) {
				throw Error(`Unexpected key in LocalStorageContext reducer: '${key}'.`)
			} else {
				return {
					...state,
					[key]: value
				}
			}
		}
		case UPDATE_KEY_OPTIONALLY_PERSIST: {
			const { key, value, persist } = payload
			if (!UPDATABLE_KEYS.some((k) => k === key)) {
				throw Error(`Unexpected key in LocalStorageContext reducer: '${key}'.`)
			} else {
				return {
					...state,
					[key]: { value: value, persist }
				}
			}
		}
		default: {
			throw Error(`Unexpected action type in LocalStorageContext reducer: '${type}'.`)
		}
	}
}

function init() {
	const defaultLocalStorage = {
		[DEFI_WATCHLIST]: { [DEFAULT_PORTFOLIO_NAME]: {} },
		[YIELDS_WATCHLIST]: { [DEFAULT_PORTFOLIO_NAME]: {} },
		[SELECTED_PORTFOLIO]: DEFAULT_PORTFOLIO_NAME,
		[YIELDS_SAVED_FILTERS]: {},
		[CUSTOM_COLUMNS]: [],
		[PRO_DASHBOARD_ITEMS]: []
	}

	try {
		const parsed = JSON.parse(window.localStorage.getItem(DEFILLAMA))
		if (!parsed) {
			return defaultLocalStorage
		} else {
			return { ...defaultLocalStorage, ...parsed }
		}
	} catch {
		return defaultLocalStorage
	}
}

export default function Provider({ children }) {
	const [state, dispatch] = useReducer(reducer, undefined, init)
	const { userConfig, saveUserConfig, isLoadingConfig } = useUserConfig()

	useEffect(() => {
		if (userConfig && Object.keys(userConfig).length > 0 && !isLoadingConfig) {
			const currentLocalStorage = init()
			const mergedConfig = { ...currentLocalStorage, ...userConfig }
			window.localStorage.setItem(DEFILLAMA, JSON.stringify(mergedConfig))
		}
	}, [userConfig])

	const updateKey = useCallback((key, value) => {
		dispatch({ type: UPDATE_KEY, payload: { key, value } })
		const newState = reducer(state, { type: UPDATE_KEY, payload: { key, value } })
		saveUserConfig(newState)
	}, [])

	const updateKeyOptionallyPersist = useCallback((key, value, persist: boolean = false) => {
		dispatch({ type: UPDATE_KEY_OPTIONALLY_PERSIST, payload: { key, value, persist } })
		const newState = reducer(state, { type: UPDATE_KEY_OPTIONALLY_PERSIST, payload: { key, value, persist } })
		saveUserConfig(newState)
	}, [])

	// Change format from save addresses to save protocol names, so backwards compatible
	const savedDefiProtocols: IWatchlist = state[DEFI_WATCHLIST]
	const savedYieldsProtocols: IWatchlist = state[YIELDS_WATCHLIST]

	let newSavedDefiProtocols = savedDefiProtocols
	let newSavedYieldsProtocols = savedYieldsProtocols

	if (!newSavedDefiProtocols?.main) {
		const oldAddresses = Object.entries(savedDefiProtocols)
			.map(([, value]) => (value?.protocol ? [slug(value?.protocol), value?.protocol] : []))
			.filter((validPairs) => validPairs.length)

		newSavedDefiProtocols = oldAddresses.length ? { main: Object.fromEntries(oldAddresses) } : { main: {} }
	}

	if (!newSavedYieldsProtocols?.main) {
		const oldAddresses = Object.entries(savedYieldsProtocols)
			.map(([, value]) => (value?.protocol ? [slug(value?.protocol), value?.protocol] : []))
			.filter((validPairs) => validPairs.length)

		newSavedYieldsProtocols = oldAddresses.length ? { main: Object.fromEntries(oldAddresses) } : { main: {} }
	}

	const values = useMemo(
		() => [
			{ ...state, [DEFI_WATCHLIST]: newSavedDefiProtocols, [YIELDS_WATCHLIST]: newSavedYieldsProtocols },
			{ updateKey, updateKeyOptionallyPersist }
		],
		[state, updateKey, updateKeyOptionallyPersist, newSavedDefiProtocols, newSavedYieldsProtocols]
	)

	return <LocalStorageContext.Provider value={values}>{children}</LocalStorageContext.Provider>
}

export function Updater() {
	const [state] = useLocalStorageContext()

	useEffect(() => {
		// const toPersist = Object.entries(state).reduce((acc, [key, value]) => {
		// 	const persist = (value as { value: unknown; persist?: boolean })?.persist
		// 	// Optionally persisted values are object type with a value and persist key
		// 	// Local storage is only updated if persist is true
		// 	if (typeof value === 'object' && 'value' in value && persist === true) {
		// 		acc[key] = (value as any).value

		// 		// If the value is a boolean, it is persisted
		// 	} else if (typeof value === 'boolean') {
		// 		acc[key] = value
		// 	}

		// 	return acc
		// }, {})

		window.localStorage.setItem(DEFILLAMA, JSON.stringify(state))
	})

	return null
}

export function subscribeToLocalStorage(callback: () => void) {
	window.addEventListener('storage', callback)

	return () => {
		window.removeEventListener('storage', callback)
	}
}

const toggleDarkMode = () => {
	const isDarkMode = localStorage.getItem(DARK_MODE) === 'true'
	localStorage.setItem(DARK_MODE, isDarkMode ? 'false' : 'true')
	window.dispatchEvent(new Event('storage'))
}

export function useDarkModeManager() {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(DARK_MODE) ?? 'true',
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
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(DEFILLAMA) ?? '{}',
		() => '{}'
	)

	const isClient = useIsClient()

	const toggledSettings = useMemo(() => {
		const urlParams = isClient ? new URLSearchParams(window.location.search) : null

		const ps = JSON.parse(store)
		return Object.fromEntries(
			getSettingKeys(type).map((s) => [
				s,
				(urlParams && urlParams.get(s) ? urlParams.get(s) === 'true' : null) ?? ps[s] ?? false
			])
		)
	}, [store, type, isClient])

	return [toggledSettings, updateSetting]
}

const updateAllSettings = (keys: Record<string, boolean>) => {
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
	const [state, { updateKey }] = useLocalStorageContext()
	const savedFilters = state?.[YIELDS_SAVED_FILTERS] ?? {}

	function saveFilter(name: string, filters: any) {
		const newFilters = {
			...savedFilters,
			[name]: filters
		}
		updateKey(YIELDS_SAVED_FILTERS, newFilters)
	}

	function deleteFilter(name: string) {
		const newFilters = { ...savedFilters }
		delete newFilters[name]
		updateKey(YIELDS_SAVED_FILTERS, newFilters)
	}

	return {
		savedFilters,
		saveFilter,
		deleteFilter
	}
}

// DEFI AND YIELDS WATCHLIST
export function useWatchlist() {
	const router = useRouter()
	const WATCHLIST = router.pathname.startsWith('/yields') ? YIELDS_WATCHLIST : DEFI_WATCHLIST

	const [state, { updateKey }] = useLocalStorageContext()

	const selectedPortfolio = state?.[SELECTED_PORTFOLIO] ?? DEFAULT_PORTFOLIO_NAME
	const savedProtocols = state?.[WATCHLIST]?.[selectedPortfolio] ?? {}
	const watchlistPortfolios = Object.keys(state?.[WATCHLIST] ?? {})

	function addPortfolio() {
		const newPortfolio = window.prompt('New Portfolio name')

		if (newPortfolio) {
			const newList = state?.[WATCHLIST]
			newList[newPortfolio.substring(0, 100)] = {}
			updateKey(WATCHLIST, newList)
		}
	}

	function removePortfolio(portfolio) {
		const confirmed = window.confirm(`Do you really want to delete "${selectedPortfolio}"?`)

		if (confirmed) {
			setSelectedPortfolio(DEFAULT_PORTFOLIO_NAME)

			const newList = state?.[WATCHLIST]
			delete newList?.[portfolio]
			updateKey(WATCHLIST, newList)
		}
	}

	function addProtocol(readableProtocolName) {
		let newList = state?.[WATCHLIST]
		const standardProtocol: any = slug(readableProtocolName)
		newList[selectedPortfolio] = {
			...(newList[selectedPortfolio] || {}),
			[standardProtocol]: readableProtocolName
		}
		// trackGoal('VQ0TO7CU', standardProtocol)
		updateKey(WATCHLIST, newList)
	}

	function removeProtocol(protocol) {
		let newList = state?.[WATCHLIST]
		const standardProtocol: any = slug(protocol)
		delete newList?.[selectedPortfolio]?.[standardProtocol]
		// trackGoal('6SL0NZYJ', standardProtocol)
		updateKey(WATCHLIST, newList)
	}

	function setSelectedPortfolio(name) {
		updateKey(SELECTED_PORTFOLIO, name)
	}

	return {
		savedProtocols,
		addProtocol,
		removeProtocol,
		addPortfolio,
		removePortfolio,
		portfolios: watchlistPortfolios,
		selectedPortfolio,
		setSelectedPortfolio
	}
}

const updateChartInterval = (value: 'Daily' | 'Weekly' | 'Monthly') => {
	const current = JSON.parse(localStorage.getItem(DEFILLAMA) ?? '{}')
	localStorage.setItem(DEFILLAMA, JSON.stringify({ ...current, [DIMENSIONS_CHART_INTERVAL_KEY]: value }))
	window.dispatchEvent(new Event('storage'))
}

export const useDimensionChartInterval = () => {
	const store = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(DEFILLAMA) ?? '{}',
		() => '{}'
	)

	const chartInterval = useMemo(() => {
		const currentStore = JSON.parse(store)
		return ['Daily', 'Weekly', 'Monthly'].includes(currentStore[DIMENSIONS_CHART_INTERVAL_KEY])
			? currentStore[DIMENSIONS_CHART_INTERVAL_KEY]
			: 'Daily'
	}, [store])

	return [chartInterval, updateChartInterval] as const
}

export function useCustomColumns() {
	const [state, { updateKey }] = useLocalStorageContext()
	const customColumns = state?.[CUSTOM_COLUMNS] ?? []

	function setCustomColumns(cols) {
		updateKey(CUSTOM_COLUMNS, cols)
	}

	function addCustomColumn(col) {
		setCustomColumns([...customColumns, col])
	}

	function editCustomColumn(index, col) {
		setCustomColumns(customColumns.map((c, i) => (i === index ? col : c)))
	}

	function deleteCustomColumn(index) {
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
