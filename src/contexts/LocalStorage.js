import { createContext, useContext, useReducer, useMemo, useCallback, useState } from 'react'
import { trackGoal } from 'fathom-client'
import { standardizeProtocolName } from '~/utils'
import { useIsClient } from '~/hooks'

const SAVED_TOKENS = 'SAVED_TOKENS'
const SELECTED_PORTFOLIO = 'SELECTED_PORTFOLIO'

export const DARK_MODE = 'DARK_MODE'
export const POOL2 = 'pool2'
export const STAKING = 'staking'
export const BORROWED = 'borrowed'
export const DOUBLE_COUNT = 'doublecounted'
export const DISPLAY_USD = 'DISPLAY_USD'
export const HIDE_LAST_DAY = 'HIDE_LAST_DAY'
export const DEFAULT_PORTFOLIO = 'main'
export const STABLECOINS = 'STABLECOINS'
export const SINGLE_EXPOSURE = 'SINGLE_EXPOSURE'
export const NO_IL = 'NO_IL'
export const MILLION_DOLLAR = 'MILLION_DOLLAR'
export const AUDITED = 'AUDITED'
export const NO_OUTLIER = 'NO_OUTLIER'
export const APY_GT0 = 'APY_GT0'
export const UNRELEASED = 'unreleased'
export const PEGGEDUSD = 'PEGGEDUSD'
export const PEGGEDEUR = 'PEGGEDEUR'
export const PEGGEDVAR = 'PEGGEDVAR'
export const FIATSTABLES = 'FIATSTABLES'
export const CRYPTOSTABLES = 'CRYPTOSTABLES'
export const ALGOSTABLES = 'ALGOSTABLES'

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

const groupKeys = groupSettings.map((g) => g.key)

const UPDATABLE_KEYS = [
	DARK_MODE,
	SAVED_TOKENS,
	...extraTvlProps,
	...extraPeggedProps,
	DISPLAY_USD,
	HIDE_LAST_DAY,
	SELECTED_PORTFOLIO,
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
		[SAVED_TOKENS]: { main: {} },
		[SELECTED_PORTFOLIO]: DEFAULT_PORTFOLIO
	}

	return defaultLocalStorage
}

export default function Provider({ children }) {
	const [state, dispatch] = useReducer(reducer, undefined, init)

	const updateKey = useCallback((key, value) => {
		dispatch({ type: UPDATE_KEY, payload: { key, value } })
	}, [])

	// Change format from save addresses to save protocol names, so backwards compatible

	const savedProtocols = state[SAVED_TOKENS]

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
				() => [{ ...state, [SAVED_TOKENS]: newSavedProtocols }, { updateKey }],
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

export function useStakingManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	let stakingEnabled = state[STAKING]
	const toggleStaking = useCallback(
		(value) => {
			updateKey(STAKING, value === false || value === true ? value : !stakingEnabled)
		},
		[updateKey, stakingEnabled]
	)
	return [stakingEnabled, toggleStaking]
}

export function useBorrowedManager() {
	const [state, { updateKey }] = useLocalStorageContext()
	let borrowedEnabled = state[BORROWED]
	const toggleBorrowed = useCallback(
		(value) => {
			updateKey(BORROWED, value === false || value === true ? value : !borrowedEnabled)
		},
		[updateKey, borrowedEnabled]
	)
	return [borrowedEnabled, toggleBorrowed]
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

// Since we are only using protocol name as the unique identifier for the /protcol/:name route, change keys to be unique by name for now.
export function useSavedProtocols() {
	const [pinnedOpen, setPinnedOpen] = useState(false)
	const [state, { updateKey }] = useLocalStorageContext()
	const savedProtocols = state?.[SAVED_TOKENS]
	const selectedPortfolio = state?.[SELECTED_PORTFOLIO]

	function addPortfolio(portfolio) {
		const newList = state?.[SAVED_TOKENS]
		newList[portfolio] = {}
		updateKey(SAVED_TOKENS, newList)
	}

	function removePortfolio(portfolio) {
		const newList = state?.[SAVED_TOKENS]
		delete newList?.[portfolio]
		updateKey(SAVED_TOKENS, newList)
	}

	function addProtocol(readableProtocolName) {
		let newList = state?.[SAVED_TOKENS]
		const standardProtocol = standardizeProtocolName(readableProtocolName)
		newList[selectedPortfolio] = {
			...(newList[selectedPortfolio] || {}),
			[standardProtocol]: readableProtocolName
		}
		trackGoal('VQ0TO7CU', standardProtocol)
		updateKey(SAVED_TOKENS, newList)
	}

	function removeProtocol(protocol) {
		let newList = state?.[SAVED_TOKENS]
		const standardProtocol = standardizeProtocolName(protocol)
		delete newList?.[selectedPortfolio]?.[standardProtocol]
		trackGoal('6SL0NZYJ', standardProtocol)
		updateKey(SAVED_TOKENS, newList)
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
		pinnedOpen,
		setPinnedOpen,
		selectedPortfolio,
		setSelectedPortfolio
	}
}
