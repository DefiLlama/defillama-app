import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

const UPDATE = 'UPDATE'
const UPDATE_PAIR_TXNS = 'UPDATE_PAIR_TXNS'
const UPDATE_CHART_DATA = 'UPDATE_CHART_DATA'
const UPDATE_TOP_PAIRS = 'UPDATE_TOP_PAIRS'
const UPDATE_HOURLY_DATA = 'UPDATE_HOURLY_DATA'

dayjs.extend(utc)

export function safeAccess(object, path) {
  return object
    ? path.reduce(
        (accumulator, currentValue) => (accumulator && accumulator[currentValue] ? accumulator[currentValue] : null),
        object
      )
    : null
}

const PairDataContext = createContext()

function usePairDataContext() {
  return useContext(PairDataContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { pairAddress, data } = payload
      return {
        ...state,
        [pairAddress]: {
          ...state?.[pairAddress],
          ...data
        }
      }
    }

    case UPDATE_TOP_PAIRS: {
      const { topPairs } = payload
      let added = {}
      topPairs.map(pair => {
        return (added[pair.id] = pair)
      })
      return {
        ...state,
        ...added
      }
    }

    case UPDATE_PAIR_TXNS: {
      const { address, transactions } = payload
      return {
        ...state,
        [address]: {
          ...(safeAccess(state, [address]) || {}),
          txns: transactions
        }
      }
    }
    case UPDATE_CHART_DATA: {
      const { address, chartData } = payload
      return {
        ...state,
        [address]: {
          ...(safeAccess(state, [address]) || {}),
          chartData
        }
      }
    }

    case UPDATE_HOURLY_DATA: {
      const { address, hourlyData, timeWindow } = payload
      return {
        ...state,
        [address]: {
          ...state?.[address],
          hourlyData: {
            ...state?.[address]?.hourlyData,
            [timeWindow]: hourlyData
          }
        }
      }
    }

    default: {
      throw Error(`Unexpected action type in DataContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, {})

  // update pair specific data
  const update = useCallback((pairAddress, data) => {
    dispatch({
      type: UPDATE,
      payload: {
        pairAddress,
        data
      }
    })
  }, [])

  const updateTopPairs = useCallback(topPairs => {
    dispatch({
      type: UPDATE_TOP_PAIRS,
      payload: {
        topPairs
      }
    })
  }, [])

  const updatePairTxns = useCallback((address, transactions) => {
    dispatch({
      type: UPDATE_PAIR_TXNS,
      payload: { address, transactions }
    })
  }, [])

  const updateChartData = useCallback((address, chartData) => {
    dispatch({
      type: UPDATE_CHART_DATA,
      payload: { address, chartData }
    })
  }, [])

  const updateHourlyData = useCallback((address, hourlyData, timeWindow) => {
    dispatch({
      type: UPDATE_HOURLY_DATA,
      payload: { address, hourlyData, timeWindow }
    })
  }, [])

  return (
    <PairDataContext.Provider
      value={useMemo(() => [state, { update, updatePairTxns, updateChartData, updateTopPairs, updateHourlyData }], [
        state,
        update,
        updatePairTxns,
        updateChartData,
        updateTopPairs,
        updateHourlyData
      ])}
    >
      {children}
    </PairDataContext.Provider>
  )
}

export function Updater() {
  const [, { updateTopPairs }] = usePairDataContext()
  //const [ethPrice] = useEthPrice()
  useEffect(() => {}, [updateTopPairs])
  return null
}

export function useHourlyRateData(pairAddress, timeWindow) {}

/**
 * @todo
 * store these updates to reduce future redundant calls
 */
export function useDataForList(pairList) {}

/**
 * Get all the current and 24hr changes for a pair
 */
export function usePairData(pairAddress) {}

/**
 * Get most recent txns for a pair
 */
export function usePairTransactions(pairAddress) {}

export function usePairChartData(pairAddress) {}

/**
 * Get list of all pairs in Uniswap
 */
export function useAllPairData() {
  const [state] = usePairDataContext()
  return state || {}
}
