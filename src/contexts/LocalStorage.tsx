/* eslint-disable no-unused-vars*/
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'
import { trackGoal } from 'fathom-client'
import { standardizeProtocolName } from '~/utils'
import { useIsClient } from '~/hooks'
import { useRouter } from 'next/router'
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

// NFT
const DISPLAY_USD = 'DISPLAY_USD'
const HIDE_LAST_DAY = 'HIDE_LAST_DAY'

// YIELDS
const STABLECOINS = 'STABLECOINS'
const SINGLE_EXPOSURE = 'SINGLE_EXPOSURE'
const NO_IL = 'NO_IL'
const MILLION_DOLLAR = 'MILLION_DOLLAR'
const AUDITED = 'AUDITED'
const NO_OUTLIER = 'NO_OUTLIER'
const APY_GT0 = 'APY_GT0'
const STABLE_OUTLOOK = 'STABLE_OUTLOOK'
const HIGH_CONFIDENCE = 'HIGH_CONFIDENCE'
const NO_BAD_DEBT = 'NO_BAD_DEBT'
const NO_LOCKUP_REWARDS = 'NO_LOCKUP_REWARDS'
const NO_LOCKUP_COLLATERAL = 'NO_LOCKUP_COLLATERAL'

// STABLECOINS
export const UNRELEASED = 'unreleased'
const PEGGEDUSD = 'PEGGEDUSD'
const PEGGEDEUR = 'PEGGEDEUR'
const PEGGEDVAR = 'PEGGEDVAR'
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

export const DEFI_SETTINGS = { POOL2, STAKING, BORROWED, DOUBLE_COUNT, LIQUID_STAKING, VESTING }
export const YIELDS_SETTINGS = {
	AUDITED,
	MILLION_DOLLAR,
	NO_IL,
	SINGLE_EXPOSURE,
	STABLECOINS,
	NO_OUTLIER,
	APY_GT0,
	STABLE_OUTLOOK,
	HIGH_CONFIDENCE,
	NO_BAD_DEBT,
	NO_LOCKUP_REWARDS,
	NO_LOCKUP_COLLATERAL
}

export const STABLECOINS_SETTINGS = {
	PEGGEDUSD,
	PEGGEDEUR,
	PEGGEDVAR,
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

const DEFI_CHAINS_KEYS = DEFI_CHAINS_SETTINGS.map((g) => g.key)
export const DEFI_SETTINGS_KEYS = Object.values(DEFI_SETTINGS)
export const STABLECOINS_SETTINGS_KEYS = Object.values(STABLECOINS_SETTINGS)
export const NFT_SETTINGS_KEYS = Object.values(NFT_SETTINGS)
export const LIQS_SETTINGS_KEYS = Object.values(LIQS_SETTINGS)

const UPDATABLE_KEYS = [
	DARK_MODE,
	DEFI_WATCHLIST,
	YIELDS_WATCHLIST,
	SELECTED_PORTFOLIO,
	...DEFI_SETTINGS_KEYS,
	...DEFI_CHAINS_KEYS,
	...STABLECOINS_SETTINGS_KEYS,
	...NFT_SETTINGS_KEYS,
	...LIQS_SETTINGS_KEYS
]

const UPDATE_KEY = 'UPDATE_KEY'

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
		default: {
			throw Error(`Unexpected action type in LocalStorageContext reducer: '${type}'.`)
		}
	}
}

function init() {
	const defaultLocalStorage = {
		[DARK_MODE]: true,
		...DEFI_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		...STABLECOINS_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: true }), {}),
		...NFT_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
		...LIQS_SETTINGS_KEYS.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
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

// TODO fix unnecessary rerenders on all state managers
function useSettingsManager(settings: Array<string>): [ISettings, TUpdater] {
	const [state, { updateKey }] = useLocalStorageContext()
	const isClient = useIsClient()

	const toggledSettings: ISettings = useMemo(
		() =>
			settings.reduce((acc, setting) => {
				let toggled = false
				if (isClient) {
					toggled = state[setting]
					// prevent flash of these toggles when page loads intially
				} else if (setting === 'emulator' || setting === 'unreleased') {
					toggled = true
				} else toggled = false

				acc[setting] = toggled
				return acc
			}, {}),
		[state, isClient, settings]
	)

	const updater = (key: string) => () => {
		updateKey(key, !state[key])
	}

	return [toggledSettings, updater]
}

// DEFI
export function useDefiManager() {
	return useSettingsManager(DEFI_SETTINGS_KEYS)
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
