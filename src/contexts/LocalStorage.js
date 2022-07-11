import { createContext, useContext, useReducer, useMemo, useCallback, useState } from 'react'
import { trackGoal } from 'fathom-client'
import { standardizeProtocolName } from '~/utils'
import { useIsClient } from '~/hooks'

export const DARK_MODE = 'DARK_MODE'
export const POOL2 = 'pool2'
export const STAKING = 'staking'
export const BORROWED = 'borrowed'
export const DOUBLE_COUNT = 'doublecounted'
export const DISPLAY_USD = 'DISPLAY_USD'
export const HIDE_LAST_DAY = 'HIDE_LAST_DAY'
export const DEFAULT_PORTFOLIO = 'main'
export const UNRELEASED = 'unreleased'
export const STABLECOINS = 'STABLECOINS'
export const SINGLE_EXPOSURE = 'SINGLE_EXPOSURE'
export const NO_IL = 'NO_IL'
export const MILLION_DOLLAR = 'MILLION_DOLLAR'
export const AUDITED = 'AUDITED'
export const NO_OUTLIER = 'NO_OUTLIER'
export const APY_GT0 = 'APY_GT0'

const DEFI_WATCHLIST = 'DEFI_WATCHLIST'
const YIELDS_WATCHLIST = 'YIELDS_WATCHLIST'

export const extraTvlProps = [POOL2, STAKING, BORROWED, DOUBLE_COUNT]
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

export const groupKeys = groupSettings.map((g) => g.key)

const UPDATABLE_KEYS = [
	DARK_MODE,
	DEFI_WATCHLIST,
	YIELDS_WATCHLIST,
	...extraTvlProps,
	...extraPeggedProps,
	DISPLAY_USD,
	HIDE_LAST_DAY,
	...groupKeys,
	STABLECOINS,
	SINGLE_EXPOSURE,
	NO_IL,
	MILLION_DOLLAR,
	AUDITED,
	NO_OUTLIER,
	APY_GT0
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
		[DOUBLE_COUNT]: true,
		[DISPLAY_USD]: false,
		[HIDE_LAST_DAY]: false,
		[STABLECOINS]: false,
		[SINGLE_EXPOSURE]: false,
		[NO_IL]: false,
		[MILLION_DOLLAR]: false,
		[AUDITED]: false,
		[NO_OUTLIER]: true,
		[APY_GT0]: true,
		[DEFI_WATCHLIST]: { main: {} },
		[YIELDS_WATCHLIST]: DEFAULT_PORTFOLIO
	}

	return defaultLocalStorage
}

export default function Provider({ children }) {
	const [state, dispatch] = useReducer(reducer, undefined, init)

	const updateKey = useCallback((key, value) => {
		dispatch({ type: UPDATE_KEY, payload: { key, value } })
	}, [])

	// Change format from save addresses to save protocol names, so backwards compatible

	const savedProtocols = state[DEFI_WATCHLIST]

	let newSavedProtocols = savedProtocols

	if (!newSavedProtocols?.main) {
		const oldAddresses = Object.entries(savedProtocols)
			.map(([, value]) => (value?.protocol ? [standardizeProtocolName(value?.protocol), value?.protocol] : []))
			.filter((validPairs) => validPairs.length)

		newSavedProtocols = oldAddresses.length ? { main: Object.fromEntries(oldAddresses) } : { main: {} }
	}

	return (
		<LocalStorageContext.Provider
			value={useMemo(
				() => [{ ...state, [DEFI_WATCHLIST]: newSavedProtocols }, { updateKey }],
				[state, updateKey, newSavedProtocols]
			)}
		>
			{children}
		</LocalStorageContext.Provider>
	)
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

export function useToggleSetting() {
	const [state, { updateKey }] = useLocalStorageContext()
	return (key) => () => {
		updateKey(key, !state[key])
	}
}

export function useSettingsManager(settings) {
	const [state] = useLocalStorageContext()
	const isClient = useIsClient()

	return useMemo(
		() =>
			settings.reduce((acc, setting) => {
				let toggled = false
				if (isClient) {
					toggled = state[setting]
				} else if (setting === 'doublecounted') {
					toggled = true
				} else if (setting === 'emulator') {
					toggled = true
				} else toggled = false

				acc[setting] = toggled
				return acc
			}, {}),
		[state, isClient, settings]
	)
}

// Since we are only using protocol name as the unique identifier for the /protcol/:name route, change keys to be unique by name for now.
export function useSavedProtocols() {
	const [pinnedOpen, setPinnedOpen] = useState(false)
	const [state, { updateKey }] = useLocalStorageContext()
	const savedProtocols = state?.[DEFI_WATCHLIST]
	const selectedPortfolio = state?.[YIELDS_WATCHLIST]

	function addPortfolio(portfolio) {
		const newList = state?.[DEFI_WATCHLIST]
		newList[portfolio] = {}
		updateKey(DEFI_WATCHLIST, newList)
	}

	function removePortfolio(portfolio) {
		const newList = state?.[DEFI_WATCHLIST]
		delete newList?.[portfolio]
		updateKey(DEFI_WATCHLIST, newList)
	}

	function addProtocol(readableProtocolName) {
		let newList = state?.[DEFI_WATCHLIST]
		const standardProtocol = standardizeProtocolName(readableProtocolName)
		newList[selectedPortfolio] = {
			...(newList[selectedPortfolio] || {}),
			[standardProtocol]: readableProtocolName
		}
		trackGoal('VQ0TO7CU', standardProtocol)
		updateKey(DEFI_WATCHLIST, newList)
	}

	function removeProtocol(protocol) {
		let newList = state?.[DEFI_WATCHLIST]
		const standardProtocol = standardizeProtocolName(protocol)
		delete newList?.[selectedPortfolio]?.[standardProtocol]
		trackGoal('6SL0NZYJ', standardProtocol)
		updateKey(DEFI_WATCHLIST, newList)
	}

	function setSelectedPortfolio(name) {
		updateKey(YIELDS_WATCHLIST, name)
	}

	return {
		savedProtocols,
		addProtocol,
		removeProtocol,
		addPortfolio,
		removePortfolio,
		pinnedOpen,
		setPinnedOpen,
		selectedPortfolio,
		setSelectedPortfolio
	}
}
