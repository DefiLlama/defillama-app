import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState } from 'react'
import { trackGoal } from 'fathom-client'

import { standardizeProtocolName } from 'utils'
import { useIsClient } from 'hooks'

const UNISWAP = 'UNISWAP'

const VERSION = 'VERSION'
const CURRENT_VERSION = 0
const LAST_SAVED = 'LAST_SAVED'
const DISMISSED_PATHS = 'DISMISSED_PATHS'
const SAVED_ACCOUNTS = 'SAVED_ACCOUNTS'
const SAVED_TOKENS = 'SAVED_TOKENS'
const SAVED_PAIRS = 'SAVED_PAIRS'

export const DARK_MODE = 'DARK_MODE'
export const POOL2 = 'pool2'
export const STAKING = 'staking'
export const BORROWED = 'borrowed'
export const OFFERS = 'offers'
export const TREASURY = 'treasury'
export const DOUBLE_COUNT = 'doublecounted'
export const DISPLAY_USD = 'DISPLAY_USD'
export const HIDE_LAST_DAY = 'HIDE_LAST_DAY'

const extraTvlProps = [POOL2, STAKING, BORROWED, OFFERS, TREASURY, DOUBLE_COUNT]

const UPDATABLE_KEYS = [
  DARK_MODE,
  DISMISSED_PATHS,
  SAVED_ACCOUNTS,
  SAVED_PAIRS,
  SAVED_TOKENS,
  ...extraTvlProps,
  DISPLAY_USD,
  HIDE_LAST_DAY,
]

const UPDATE_KEY = 'UPDATE_KEY'

const LocalStorageContext = createContext()

function useLocalStorageContext() {
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
          [key]: value,
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
    [VERSION]: CURRENT_VERSION,
    [DARK_MODE]: true,
    ...extraTvlProps.reduce((o, prop) => ({ ...o, [prop]: false }), {}),
    [DOUBLE_COUNT]: true,
    [DISPLAY_USD]: false,
    [HIDE_LAST_DAY]: false,
    [DISMISSED_PATHS]: {},
    [SAVED_ACCOUNTS]: [],
    [SAVED_TOKENS]: { main: {} },
    [SAVED_PAIRS]: {},
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(UNISWAP))
    if (parsed[VERSION] !== CURRENT_VERSION) {
      // this is where we could run migration logic
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

export function Updater() {
  const [state] = useLocalStorageContext()

  useEffect(() => {
    window.localStorage.setItem(UNISWAP, JSON.stringify({ ...state, [LAST_SAVED]: Math.floor(Date.now() / 1000) }))
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

export const useGetExtraTvlEnabled = () => {
  const [state] = useLocalStorageContext()
  const isClient = useIsClient()

  return useMemo(
    () =>
      extraTvlProps.reduce((all, prop) => {
        all[prop] = isClient ? state[prop] : (prop === "doublecounted")
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

export function usePathDismissed(path) {
  const [state, { updateKey }] = useLocalStorageContext()
  const pathDismissed = state?.[DISMISSED_PATHS]?.[path]
  function dismiss() {
    let newPaths = state?.[DISMISSED_PATHS]
    newPaths[path] = true
    updateKey(DISMISSED_PATHS, newPaths)
  }

  return [pathDismissed, dismiss]
}

export function useSavedAccounts() {
  const [state, { updateKey }] = useLocalStorageContext()
  const savedAccounts = state?.[SAVED_ACCOUNTS]

  function addAccount(account) {
    let newAccounts = state?.[SAVED_ACCOUNTS]
    newAccounts.push(account)
    updateKey(SAVED_ACCOUNTS, newAccounts)
  }

  function removeAccount(account) {
    let newAccounts = state?.[SAVED_ACCOUNTS]
    let index = newAccounts.indexOf(account)
    if (index > -1) {
      newAccounts.splice(index, 1)
    }
    updateKey(SAVED_ACCOUNTS, newAccounts)
  }

  return [savedAccounts, addAccount, removeAccount]
}

export function useSavedPairs() {
  const [state, { updateKey }] = useLocalStorageContext()
  const savedPairs = state?.[SAVED_PAIRS]

  function addPair(address, token0Address, token1Address, token0Symbol, token1Symbol) {
    let newList = state?.[SAVED_PAIRS]
    newList[address] = {
      address,
      token0Address,
      token1Address,
      token0Symbol,
      token1Symbol,
    }
    updateKey(SAVED_PAIRS, newList)
  }

  function removePair(address) {
    let newList = state?.[SAVED_PAIRS]
    newList[address] = null
    updateKey(SAVED_PAIRS, newList)
  }

  return [savedPairs, addPair, removePair]
}

// Since we are only using protocol name as the unique identifier for the /protcol/:name route, change keys to be unique by name for now.
export function useSavedProtocols() {
  const [pinnedOpen, setPinnedOpen] = useState(false)
  const [state, { updateKey }] = useLocalStorageContext()
  const savedProtocols = state?.[SAVED_TOKENS]

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

  function addProtocol(readableProtocolName, portfolio = 'main') {
    let newList = state?.[SAVED_TOKENS]
    const standardProtocol = standardizeProtocolName(readableProtocolName)
    newList[portfolio] = {
      ...(newList[portfolio] || {}),
      [standardProtocol]: readableProtocolName,
    }
    trackGoal('VQ0TO7CU', standardProtocol)
    updateKey(SAVED_TOKENS, newList)
  }

  function removeProtocol(protocol, portfolio = 'main') {
    let newList = state?.[SAVED_TOKENS]
    const standardProtocol = standardizeProtocolName(protocol)
    delete newList?.[portfolio]?.[standardProtocol]
    trackGoal('6SL0NZYJ', standardProtocol)
    updateKey(SAVED_TOKENS, newList)
  }

  return { savedProtocols, addProtocol, removeProtocol, addPortfolio, removePortfolio, pinnedOpen, setPinnedOpen }
}
