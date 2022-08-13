import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'
import { trackGoal } from 'fathom-client'
import { standardizeProtocolName } from '~/utils'
import { useIsClient } from '~/hooks'
import { useRouter } from 'next/router'

const DEFILLAMA = 'DEFILLAMA'
export const DARK_MODE = 'DARK_MODE'
export const POOL2 = 'pool2'
export const STAKING = 'staking'
export const BORROWED = 'borrowed'
export const DOUBLE_COUNT = 'doublecounted'
export const LIQUID_STAKING = 'liquidstaking'
export const DISPLAY_USD = 'DISPLAY_USD'
export const HIDE_LAST_DAY = 'HIDE_LAST_DAY'
export const STABLECOINS = 'STABLECOINS'
export const SINGLE_EXPOSURE = 'SINGLE_EXPOSURE'
export const NO_IL = 'NO_IL'
export const MILLION_DOLLAR = 'MILLION_DOLLAR'
export const AUDITED = 'AUDITED'
export const NO_OUTLIER = 'NO_OUTLIER'
export const APY_GT0 = 'APY_GT0'
export const STABLE_OUTLOOK = 'STABLE_OUTLOOK'
export const HIGH_CONFIDENCE = 'HIGH_CONFIDENCE'
export const UNRELEASED = 'unreleased'
export const PEGGEDUSD = 'PEGGEDUSD'
export const PEGGEDEUR = 'PEGGEDEUR'
export const PEGGEDVAR = 'PEGGEDVAR'
export const FIATSTABLES = 'FIATSTABLES'
export const CRYPTOSTABLES = 'CRYPTOSTABLES'
export const ALGOSTABLES = 'ALGOSTABLES'

export const DEFI_WATCHLIST = 'DEFI_WATCHLIST'
export const YIELDS_WATCHLIST = 'YIELDS_WATCHLIST'
export const SELECTED_PORTFOLIO = 'SELECTED_PORTFOLIO'
export const DEFAULT_PORTFOLIO_NAME = 'main'

export const extraTvlProps = [POOL2, STAKING, BORROWED, DOUBLE_COUNT, LIQUID_STAKING]
export const extraPeggedProps = [UNRELEASED]

export const groupSettings = [
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
	// skale
]

const groupKeys = groupSettings.map((g) => g.key)

const UPDATABLE_KEYS = [
	DARK_MODE,
	DEFI_WATCHLIST,
	YIELDS_WATCHLIST,
	SELECTED_PORTFOLIO,
	...extraTvlProps,
	...extraPeggedProps,
	DISPLAY_USD,
	HIDE_LAST_DAY,
	...groupKeys,
	PEGGEDUSD,
	PEGGEDEUR,
	PEGGEDVAR,
	FIATSTABLES,
	CRYPTOSTABLES,
	ALGOSTABLES
]

const UPDATE_KEY = 'UPDATE_KEY'

const LocalStorageContext = createContext()

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
		default: {
			throw Error(`Unexpected action type in LocalStorageContext reducer: '${type}'.`)
		}
	}
}

function init() {
	const defaultLocalStorage = {
		[DARK_MODE]: true,
		...extraTvlProps.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		...extraPeggedProps.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		[DISPLAY_USD]: false,
		[HIDE_LAST_DAY]: false,
		[PEGGEDUSD]: true,
		[PEGGEDEUR]: true,
		[PEGGEDVAR]: true,
		[FIATSTABLES]: true,
		[CRYPTOSTABLES]: true,
		[ALGOSTABLES]: true,
		[DEFI_WATCHLIST]: { [DEFAULT_PORTFOLIO_NAME]: {} },
		[YIELDS_WATCHLIST]: { [DEFAULT_PORTFOLIO_NAME]: {} },
		[SELECTED_PORTFOLIO]: DEFAULT_PORTFOLIO_NAME
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

	// Change format from save addresses to save protocol names, so backwards compatible
	const savedDefiProtocols = state[DEFI_WATCHLIST]
	const savedYieldsProtocols = state[YIELDS_WATCHLIST]

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
			{ updateKey }
		],
		[state, updateKey, newSavedDefiProtocols, newSavedYieldsProtocols]
	)

	return <LocalStorageContext.Provider value={values}>{children}</LocalStorageContext.Provider>
}

export function Updater() {
	const [state] = useLocalStorageContext()

	useEffect(() => {
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

// TODO remove all state managers and use this settings manager
export function useSettingsManager(settings) {
	const [state, { updateKey }] = useLocalStorageContext()
	const isClient = useIsClient()

	const toggledSettings = useMemo(
		() =>
			settings.reduce((acc, setting) => {
				let toggled = false
				if (isClient) {
					toggled = state[setting]
				} else if (setting === 'emulator') {
					toggled = true
				} else toggled = false

				acc[setting] = toggled
				return acc
			}, {}),
		[state, isClient, settings]
	)

	const updater = (key) => () => {
		updateKey(key, !state[key])
	}

	return [toggledSettings, updater]
}

export const useGetExtraTvlEnabled = () => {
	const [state] = useLocalStorageContext()
	const isClient = useIsClient()

	return useMemo(
		() =>
			extraTvlProps.reduce((all, prop) => {
				all[prop] = isClient ? state[prop] : false
				return all
			}, {}),
		[state, isClient]
	)
}

// TODO: Remove code duplication with useGetExtraTvlEnabled
export const useGroupEnabled = () => {
	const [state] = useLocalStorageContext()
	const isClient = useIsClient()

	return useMemo(
		() =>
			groupKeys.reduce((all, prop) => {
				all[prop] = isClient ? state[prop] : prop === 'emulator'
				return all
			}, {}),
		[state, isClient]
	)
}

export function useTvlToggles() {
	const [state, { updateKey }] = useLocalStorageContext()
	return (key) => () => {
		updateKey(key, !state[key])
	}
}

export const useGetExtraPeggedEnabled = () => {
	const [state] = useLocalStorageContext()
	const isClient = useIsClient()

	return useMemo(
		() =>
			extraPeggedProps.reduce((all, prop) => {
				all[prop] = isClient ? state[prop] : prop === 'unreleased'
				return all
			}, {}),
		[state, isClient]
	)
}

export function usePeggedUSDManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const peggedUSD = state[PEGGEDUSD]

	const togglePeggedUSD = () => {
		updateKey(PEGGEDUSD, !peggedUSD)
	}

	return [peggedUSD, togglePeggedUSD]
}

export function usePeggedEURManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const peggedEUR = state[PEGGEDEUR]

	const togglePeggedEUR = () => {
		updateKey(PEGGEDEUR, !peggedEUR)
	}

	return [peggedEUR, togglePeggedEUR]
}

export function usePeggedVARManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const peggedVAR = state[PEGGEDVAR]

	const togglePeggedVAR = () => {
		updateKey(PEGGEDVAR, !peggedVAR)
	}

	return [peggedVAR, togglePeggedVAR]
}

export function useFiatStablesManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const fiatStables = state[FIATSTABLES]

	const toggleFiatStables = () => {
		updateKey(FIATSTABLES, !fiatStables)
	}

	return [fiatStables, toggleFiatStables]
}

export function useCryptoStablesManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const cryptoStables = state[CRYPTOSTABLES]

	const toggleCryptoStables = () => {
		updateKey(CRYPTOSTABLES, !cryptoStables)
	}

	return [cryptoStables, toggleCryptoStables]
}

export function useAlgoStablesManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const algoStables = state[ALGOSTABLES]

	const toggleAlgoStables = () => {
		updateKey(ALGOSTABLES, !algoStables)
	}

	return [algoStables, toggleAlgoStables]
}

export function useDisplayUsdManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const displayUsd = state[DISPLAY_USD]

	const toggleDisplayUsd = () => {
		updateKey(DISPLAY_USD, !displayUsd)
	}

	return [displayUsd, toggleDisplayUsd]
}

export function useHideLastDayManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	const hideLastDay = state[HIDE_LAST_DAY]

	const toggleHideLastDay = () => {
		updateKey(HIDE_LAST_DAY, !hideLastDay)
	}

	return [hideLastDay, toggleHideLastDay]
}

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
			newList[newPortfolio] = {}
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
		const standardProtocol = standardizeProtocolName(readableProtocolName)
		newList[selectedPortfolio] = {
			...(newList[selectedPortfolio] || {}),
			[standardProtocol]: readableProtocolName
		}
		trackGoal('VQ0TO7CU', standardProtocol)
		updateKey(WATCHLIST, newList)
	}

	function removeProtocol(protocol) {
		let newList = state?.[WATCHLIST]
		const standardProtocol = standardizeProtocolName(protocol)
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
