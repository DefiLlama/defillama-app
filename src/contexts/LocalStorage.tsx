/* eslint-disable no-unused-vars*/
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'
import { trackGoal } from 'fathom-client'
import { standardizeProtocolName } from '~/utils'
import { useIsClient } from '~/hooks'
import { NextRouter, useRouter } from 'next/router'
import { ISettings, IWatchlist, TUpdater } from './types'

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
const FIATSTABLES = 'FIATSTABLES'
const CRYPTOSTABLES = 'CRYPTOSTABLES'
const ALGOSTABLES = 'ALGOSTABLES'
const DEPEGGED = 'DEPEGGED'

// WATCHLISTS
const DEFI_WATCHLIST = 'DEFI_WATCHLIST'
const YIELDS_WATCHLIST = 'YIELDS_WATCHLIST'
const SELECTED_PORTFOLIO = 'SELECTED_PORTFOLIO'
export const DEFAULT_PORTFOLIO_NAME = 'main'

// LIQUIDATIONS
const LIQS_USING_USD = 'LIQS_USING_USD'
const LIQS_SHOWING_INSPECTOR = 'LIQS_SHOWING_INSPECTOR'
const LIQS_CUMULATIVE = 'LIQS_CUMULATIVE'

// BRIDGES
export const BRIDGES_SHOWING_TXS = 'BRIDGES_SHOWING_TXS'
export const BRIDGES_SHOWING_ADDRESSES = 'BRIDGES_SHOWING_ADDRESSES'

// DIMENSIONS (DEXS AND FEES)
const DIMENSIONS_CHART_INTERVAL_KEY = 'DIMENSIONS:CHART_INTERVAL'

export const BAR_MIN_WIDTH_IN_CHART = 'BAR_MIN_WIDTH_IN_CHART'

export const DEFI_SETTINGS = { POOL2, STAKING, BORROWED, DOUBLE_COUNT, LIQUID_STAKING, VESTING, GOV_TOKENS }

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
		name: 'Subnets',
		key: 'subnet'
	}
]

export const LIQS_SETTINGS = { LIQS_USING_USD, LIQS_SHOWING_INSPECTOR, LIQS_CUMULATIVE }

export const BRIDGES_SETTINGS = { BRIDGES_SHOWING_TXS, BRIDGES_SHOWING_ADDRESSES }

const DEFI_CHAINS_KEYS = DEFI_CHAINS_SETTINGS.map((g) => g.key)
export const DEFI_SETTINGS_KEYS = Object.values(DEFI_SETTINGS)
export const FEES_SETTINGS_KEYS = Object.values(FEES_SETTINGS)
export const STABLECOINS_SETTINGS_KEYS = Object.values(STABLECOINS_SETTINGS)
export const NFT_SETTINGS_KEYS = Object.values(NFT_SETTINGS)
export const LIQS_SETTINGS_KEYS = Object.values(LIQS_SETTINGS)
export const BRIDGES_SETTINGS_KEYS = Object.values(BRIDGES_SETTINGS)

const UPDATABLE_KEYS = [
	DARK_MODE,
	DEFI_WATCHLIST,
	YIELDS_WATCHLIST,
	SELECTED_PORTFOLIO,
	...DEFI_SETTINGS_KEYS,
	...FEES_SETTINGS_KEYS,
	...DEFI_CHAINS_KEYS,
	...STABLECOINS_SETTINGS_KEYS,
	...NFT_SETTINGS_KEYS,
	...LIQS_SETTINGS_KEYS,
	...BRIDGES_SETTINGS_KEYS,
	DIMENSIONS_CHART_INTERVAL_KEY,
	BAR_MIN_WIDTH_IN_CHART
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
		[DARK_MODE]: true,
		...DEFI_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		...FEES_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		...STABLECOINS_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: prop === UNRELEASED ? false : true }), {}),
		...NFT_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		...LIQS_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		...BRIDGES_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		[DEFI_WATCHLIST]: { [DEFAULT_PORTFOLIO_NAME]: {} },
		[YIELDS_WATCHLIST]: { [DEFAULT_PORTFOLIO_NAME]: {} },
		[SELECTED_PORTFOLIO]: DEFAULT_PORTFOLIO_NAME,
		[BAR_MIN_WIDTH_IN_CHART]: 0
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

	const updateKey = useCallback((key, value) => {
		dispatch({ type: UPDATE_KEY, payload: { key, value } })
	}, [])

	const updateKeyOptionallyPersist = useCallback((key, value, persist: boolean = false) => {
		dispatch({ type: UPDATE_KEY_OPTIONALLY_PERSIST, payload: { key, value, persist } })
	}, [])

	// Change format from save addresses to save protocol names, so backwards compatible
	const savedDefiProtocols: IWatchlist = state[DEFI_WATCHLIST]
	const savedYieldsProtocols: IWatchlist = state[YIELDS_WATCHLIST]

	let newSavedDefiProtocols = savedDefiProtocols
	let newSavedYieldsProtocols = savedYieldsProtocols

	if (!newSavedDefiProtocols?.main) {
		const oldAddresses = Object.entries(savedDefiProtocols)
			.map(([, value]) => (value?.protocol ? [standardizeProtocolName(value?.protocol), value?.protocol] : []))
			.filter((validPairs) => validPairs.length)

		newSavedDefiProtocols = oldAddresses.length ? { main: Object.fromEntries(oldAddresses) } : { main: {} }
	}

	if (!newSavedYieldsProtocols?.main) {
		const oldAddresses = Object.entries(savedYieldsProtocols)
			.map(([, value]) => (value?.protocol ? [standardizeProtocolName(value?.protocol), value?.protocol] : []))
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

export function useDarkModeManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const isClient = useIsClient()
	let darkMode = state[DARK_MODE]
	let isDarkMode = isClient ? darkMode : true

	const toggleDarkMode = useCallback(
		(value) => {
			updateKey(DARK_MODE, value === false || value === true ? value : !isDarkMode)
		},
		[updateKey, isDarkMode]
	)
	return [isDarkMode, toggleDarkMode]
}

// TODO fix unnecessary rerenders on all state managers
export function useSettingsManager(settings: Array<string>): [ISettings, TUpdater] {
	const [state, { updateKey, updateKeyOptionallyPersist }] = useLocalStorageContext()
	const isClient = useIsClient()
	const router = useRouter()

	const updateStateFromRouter = (setting: string, router?: NextRouter) => {
		// Per product needs, only defi settings are updated from the router
		if (!DEFI_SETTINGS_KEYS.includes(setting)) return

		let routerValue = router.query[setting]
		if (typeof routerValue === 'string' && ['true', 'false'].includes(routerValue)) {
			routerValue = JSON.parse(routerValue)

			if (routerValue !== state[setting]?.value) {
				const persist = !!state[setting]?.persist
				updateKeyOptionallyPersist(setting, routerValue, persist)
			}
		}
	}

	const updateRouter = (key: string, newState: boolean) => {
		router.push(
			{
				pathname: router.pathname,
				query: { ...router.query, [key]: newState }
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggledSettings: ISettings = useMemo(
		() =>
			settings.reduce((acc, setting) => {
				let toggled = false
				if (isClient) {
					updateStateFromRouter(setting, router)

					toggled = state[setting]?.value ?? state[setting]
					// prevent flash of these toggles when page loads initially
				} else if (setting === 'emulator') {
					toggled = true
				} else toggled = false

				acc[setting] = toggled
				return acc
			}, {}),
		[state, isClient, settings]
	)

	const updater = (key: string, shouldUpdateRouter?: boolean) => () => {
		// Router values override local storage values
		const oldState = state[key]?.value ?? state[key]
		const newState = !oldState

		if (shouldUpdateRouter) {
			updateRouter(key, newState)
			updateKeyOptionallyPersist(key, newState, true)
		} else {
			updateKey(key, newState)
		}
	}

	return [toggledSettings, updater]
}

export function useChartManager() {
	const [state, { updateKey }] = useLocalStorageContext()

	const updater = (value: number) => {
		updateKey(BAR_MIN_WIDTH_IN_CHART, value)
	}

	return [state[BAR_MIN_WIDTH_IN_CHART], updater]
}

// DEFI
export function useDefiManager() {
	return useSettingsManager(DEFI_SETTINGS_KEYS)
}
export function useFeesManager() {
	return useSettingsManager(FEES_SETTINGS_KEYS)
}
export function useTvlAndFeesManager() {
	return useSettingsManager([...DEFI_SETTINGS_KEYS, ...FEES_SETTINGS_KEYS])
}

// DEFI_CHAINS
export function useDefiChainsManager() {
	return useSettingsManager(DEFI_CHAINS_KEYS)
}

// STABLECOINS
export function useStablecoinsManager() {
	return useSettingsManager(STABLECOINS_SETTINGS_KEYS)
}

// NFTS
export function useNftsManager() {
	return useSettingsManager(NFT_SETTINGS_KEYS)
}

// LIQUIDATIONS
export function useLiqsManager() {
	return useSettingsManager(LIQS_SETTINGS_KEYS)
}

// BRIDGES
export function useBridgesManager() {
	return useSettingsManager(BRIDGES_SETTINGS_KEYS)
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
		const standardProtocol: any = standardizeProtocolName(readableProtocolName)
		newList[selectedPortfolio] = {
			...(newList[selectedPortfolio] || {}),
			[standardProtocol]: readableProtocolName
		}
		trackGoal('VQ0TO7CU', standardProtocol)
		updateKey(WATCHLIST, newList)
	}

	function removeProtocol(protocol) {
		let newList = state?.[WATCHLIST]
		const standardProtocol: any = standardizeProtocolName(protocol)
		delete newList?.[selectedPortfolio]?.[standardProtocol]
		trackGoal('6SL0NZYJ', standardProtocol)
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

export function useChartInterval(): [string, (interval: string) => void] {
	const [state, { updateKey }] = useLocalStorageContext()
	const isClient = useIsClient()
	const chartInterval = isClient ? state[DIMENSIONS_CHART_INTERVAL_KEY] ?? 'Daily' : 'Daily'

	const changeChartInterval = useCallback(
		(value) => {
			updateKey(DIMENSIONS_CHART_INTERVAL_KEY, value)
		},
		[updateKey]
	)
	return [chartInterval, changeChartInterval]
}
