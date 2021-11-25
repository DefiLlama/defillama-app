import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'

const UNISWAP = 'UNISWAP'

const VERSION = 'VERSION'
const CURRENT_VERSION = 0
const LAST_SAVED = 'LAST_SAVED'
const DISMISSED_PATHS = 'DISMISSED_PATHS'
const SAVED_ACCOUNTS = 'SAVED_ACCOUNTS'
const SAVED_TOKENS = 'SAVED_TOKENS'
const SAVED_PAIRS = 'SAVED_PAIRS'

const DARK_MODE = 'DARK_MODE'
const POOL2 = 'POOL2'
const STAKING = 'STAKING'
const DISPLAY_USD = 'DISPLAY_USD'

const UPDATABLE_KEYS = [
  DARK_MODE,
  DISMISSED_PATHS,
  SAVED_ACCOUNTS,
  SAVED_PAIRS,
  SAVED_TOKENS,
  POOL2,
  STAKING,
  DISPLAY_USD
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
      if (!UPDATABLE_KEYS.some(k => k === key)) {
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
    [VERSION]: CURRENT_VERSION,
    [DARK_MODE]: true,
    [STAKING]: false,
    [POOL2]: false,
    [DISPLAY_USD]: false,
    [DISMISSED_PATHS]: {},
    [SAVED_ACCOUNTS]: [],
    [SAVED_TOKENS]: {},
    [SAVED_PAIRS]: {}
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

  return (
    <LocalStorageContext.Provider value={useMemo(() => [state, { updateKey }], [state, updateKey])}>
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
  let isDarkMode = state[DARK_MODE]
  const toggleDarkMode = useCallback(
    value => {
      updateKey(DARK_MODE, value === false || value === true ? value : !isDarkMode)
    },
    [updateKey, isDarkMode]
  )
  return [isDarkMode, toggleDarkMode]
}

export function usePool2Manager() {
  const [state, { updateKey }] = useLocalStorageContext()
  let pool2Enabled = state[POOL2]
  const togglePool2 = useCallback(
    value => {
      updateKey(POOL2, value === false || value === true ? value : !pool2Enabled)
    },
    [updateKey, pool2Enabled]
  )
  return [pool2Enabled, togglePool2]
}

export function useStakingManager() {
  const [state, { updateKey }] = useLocalStorageContext()
  let stakingEnabled = state[STAKING]
  const toggleStaking = useCallback(
    value => {
      updateKey(STAKING, value === false || value === true ? value : !stakingEnabled)
    },
    [updateKey, stakingEnabled]
  )
  return [stakingEnabled, toggleStaking]
}

export function useDisplayUsdManager() {
  const [state, { updateKey }] = useLocalStorageContext()
  const displayUsd = state[DISPLAY_USD]

  const toggleDisplayUsd = () => {
    updateKey(DISPLAY_USD, !displayUsd)
  }

  return [displayUsd, toggleDisplayUsd]
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
      token1Symbol
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

export function useSavedTokens() {
  const [state, { updateKey }] = useLocalStorageContext()
  const savedTokens = state?.[SAVED_TOKENS]

  function addToken(address, protocol) {
    let newList = state?.[SAVED_TOKENS]
    newList[address] = {
      protocol
    }
    updateKey(SAVED_TOKENS, newList)
  }

  function removeToken(address) {
    let newList = state?.[SAVED_TOKENS]
    newList[address] = null
    updateKey(SAVED_TOKENS, newList)
  }

  return [savedTokens, addToken, removeToken]
}
