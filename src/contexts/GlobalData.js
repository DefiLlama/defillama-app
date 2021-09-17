import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState } from 'react'
import { client } from '../apollo/client'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import weekOfYear from 'dayjs/plugin/weekOfYear'

import { useTimeframe } from './Application'
import { getPercentChange, get2DayPercentChange, getTimeframe } from '../utils'
import { TOP_LPS_PER_PAIRS } from '../apollo/queries'

import { useAllPairData } from './PairData'
import { fetchAPI } from './API'
import {
  CHART_API,
  UPDATE,
  UPDATE_TXNS,
  UPDATE_CHART,
  UPDATE_ETH_PRICE,
  ETH_PRICE_KEY,
  UPDATE_ALL_PAIRS_IN_UNISWAP,
  UPDATE_ALL_TOKENS_IN_UNISWAP,
  UPDATE_TOP_LPS
} from '../constants'

// format dayjs with the libraries that we need
dayjs.extend(utc)
dayjs.extend(weekOfYear)

const GlobalDataContext = createContext()

function useGlobalDataContext() {
  return useContext(GlobalDataContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { data } = payload
      return {
        ...state,
        globalData: data
      }
    }
    case UPDATE_TXNS: {
      const { transactions } = payload
      return {
        ...state,
        transactions
      }
    }
    case UPDATE_CHART: {
      const { daily, weekly } = payload
      return {
        ...state,
        chartData: {
          daily,
          weekly
        }
      }
    }
    case UPDATE_ETH_PRICE: {
      const { ethPrice, oneDayPrice, ethPriceChange } = payload
      return {
        [ETH_PRICE_KEY]: ethPrice,
        oneDayPrice,
        ethPriceChange
      }
    }

    case UPDATE_ALL_PAIRS_IN_UNISWAP: {
      const { allPairs } = payload
      return {
        ...state,
        allPairs
      }
    }

    case UPDATE_ALL_TOKENS_IN_UNISWAP: {
      const { allTokens } = payload
      return {
        ...state,
        allTokens
      }
    }

    case UPDATE_TOP_LPS: {
      const { topLps } = payload
      return {
        ...state,
        topLps
      }
    }
    default: {
      throw Error(`Unexpected action type in DataContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, {})
  const update = useCallback(data => {
    dispatch({
      type: UPDATE,
      payload: {
        data
      }
    })
  }, [])

  const updateTransactions = useCallback(transactions => {
    dispatch({
      type: UPDATE_TXNS,
      payload: {
        transactions
      }
    })
  }, [])

  const updateChart = useCallback((daily, weekly) => {
    dispatch({
      type: UPDATE_CHART,
      payload: {
        daily,
        weekly
      }
    })
  }, [])

  const updateEthPrice = useCallback((ethPrice, oneDayPrice, ethPriceChange) => {
    dispatch({
      type: UPDATE_ETH_PRICE,
      payload: {
        ethPrice,
        oneDayPrice,
        ethPriceChange
      }
    })
  }, [])

  const updateAllPairsInUniswap = useCallback(allPairs => {
    dispatch({
      type: UPDATE_ALL_PAIRS_IN_UNISWAP,
      payload: {
        allPairs
      }
    })
  }, [])

  const updateAllTokensInUniswap = useCallback(allTokens => {
    dispatch({
      type: UPDATE_ALL_TOKENS_IN_UNISWAP,
      payload: {
        allTokens
      }
    })
  }, [])

  const updateTopLps = useCallback(topLps => {
    dispatch({
      type: UPDATE_TOP_LPS,
      payload: {
        topLps
      }
    })
  }, [])
  return (
    <GlobalDataContext.Provider
      value={useMemo(
        () => [
          state,
          {
            update,
            updateTransactions,
            updateChart,
            updateEthPrice,
            updateTopLps,
            updateAllPairsInUniswap,
            updateAllTokensInUniswap
          }
        ],
        [
          state,
          update,
          updateTransactions,
          updateTopLps,
          updateChart,
          updateEthPrice,
          updateAllPairsInUniswap,
          updateAllTokensInUniswap
        ]
      )}
    >
      {children}
    </GlobalDataContext.Provider>
  )
}

/**
 * Gets all the global data for the overview page.
 * Needs current eth price and the old eth price to get
 * 24 hour USD changes.
 * @param {*} ethPrice
 * @param {*} oldEthPrice
 */
async function getGlobalData() {
  // data for each day , historic data used for % changes
  let data = {}
  let oneDayData = {}
  let twoDayData = {}

  try {
    let chartData = await fetchAPI(CHART_API)

    if (data && oneDayData && twoDayData) {
      const [oneDayTxns, txnChange] = get2DayPercentChange(
        data.txCount,
        oneDayData.txCount ? oneDayData.txCount : 0,
        twoDayData.txCount ? twoDayData.txCount : 0
      )

      // format the total liquidity in USD
      data.totalLiquidityUSD = chartData[chartData.length - 1].totalLiquidityUSD
      data.totalVolumeUSD = chartData[chartData.length - 1].totalLiquidityUSD

      var change =
        ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) /
          chartData[chartData.length - 2].totalLiquidityUSD) *
        100
      //
      // add relevant fields with the calculated amounts
      data.oneDayVolumeUSD =
        chartData[chartData.length - 1].dailyVolumeUSD - chartData[chartData.length - 2].dailyVolumeUSD

      data.volumeChangeUSD = change
      //data.liquidityChangeUSD = liquidityChangeUSD
      data.oneDayTxns = oneDayTxns
      data.txnChange = txnChange
    }
  } catch (e) {
    console.log(e)
  }

  return data
}

/**
 * Get historical data for volume and liquidity used in global charts
 * on main page
 * @param {*} oldestDateToFetch // start of window to fetch from
 */

const getChartData = async oldestDateToFetch => {
  let data = []
  let weeklyData = []

  try {
    data = await fetchAPI(CHART_API)

    //console.log('week chart data',data);
  } catch (e) {
    console.log(e)
  }
  return [data, weeklyData]
}

/**
 * Get and format transactions for global page
 */
const getGlobalTransactions = async () => {}

/**
 * Gets the current price  of ETH, 24 hour price, and % change between them
 */
const getEthPrice = async () => {
  let ethPrice = 0
  let ethPriceOneDay = 0
  let priceChangeETH = 0

  try {
    const currentPrice = 400
    const oneDayBackPrice = 400
    priceChangeETH = getPercentChange(currentPrice, oneDayBackPrice)
    ethPrice = currentPrice
    ethPriceOneDay = oneDayBackPrice
  } catch (e) {
    console.log(e)
  }

  return [ethPrice, ethPriceOneDay, priceChangeETH]
}

/**
 * Hook that fetches overview data, plus all tokens and pairs for search
 */
export function useGlobalData() {
  const [state, { update, updateAllPairsInUniswap, updateAllTokensInUniswap }] = useGlobalDataContext()
  //const [ethPrice, oldEthPrice] = useEthPrice()

  const data = state?.globalData

  useEffect(() => {
    async function fetchData() {
      let globalData = await getGlobalData()
      globalData && update(globalData)
    }
    if (!data) {
      fetchData()
    }
  }, [update, data, updateAllPairsInUniswap, updateAllTokensInUniswap])

  return data || {}
}

export function useGlobalChartData() {
  const [state, { updateChart }] = useGlobalDataContext()
  const [oldestDateFetch, setOldestDateFetched] = useState()
  const [activeWindow] = useTimeframe()

  const chartDataDaily = state?.chartData?.daily
  const chartDataWeekly = state?.chartData?.weekly

  /**
   * Keep track of oldest date fetched. Used to
   * limit data fetched until its actually needed.
   * (dont fetch year long stuff unless year option selected)
   */
  useEffect(() => {
    // based on window, get starttime
    let startTime = getTimeframe(activeWindow)

    if ((activeWindow && startTime < oldestDateFetch) || !oldestDateFetch) {
      setOldestDateFetched(startTime)
    }
  }, [activeWindow, oldestDateFetch])

  /**
   * Fetch data if none fetched or older data is needed
   */
  useEffect(() => {
    async function fetchData() {
      // historical stuff for chart
      let [newChartData, newWeeklyData] = await getChartData(oldestDateFetch)
      updateChart(newChartData, newWeeklyData)
    }
    if (oldestDateFetch && !(chartDataDaily && chartDataWeekly)) {
      fetchData()
    }
  }, [chartDataDaily, chartDataWeekly, oldestDateFetch, updateChart])

  return [chartDataDaily, chartDataWeekly]
}

export function useGlobalTransactions() {
  const [state, { updateTransactions }] = useGlobalDataContext()
  const transactions = state?.transactions
  useEffect(() => {
    async function fetchData() {
      if (!transactions) {
        let txns = await getGlobalTransactions()
        updateTransactions(txns)
      }
    }
    fetchData()
  }, [updateTransactions, transactions])
  return transactions
}

export function useEthPrice() {
  const [state, { updateEthPrice }] = useGlobalDataContext()
  const ethPrice = state?.[ETH_PRICE_KEY]
  const ethPriceOld = state?.['oneDayPrice']
  useEffect(() => {
    async function checkForEthPrice() {
      if (!ethPrice) {
        let [newPrice, oneDayPrice, priceChange] = await getEthPrice()
        updateEthPrice(newPrice, oneDayPrice, priceChange)
      }
    }
    checkForEthPrice()
  }, [ethPrice, updateEthPrice])

  return [ethPrice, ethPriceOld]
}

export function useAllPairsInUniswap() {
  const [state] = useGlobalDataContext()
  let allPairs = state?.allPairs

  return allPairs || []
}

export function useAllTokensInUniswap() {
  const [state] = useGlobalDataContext()
  let allTokens = state?.allTokens

  return allTokens || []
}

/**
 * Get the top liquidity positions based on USD size
 * @TODO Not a perfect lookup needs improvement
 */
export function useTopLps() {
  const [state, { updateTopLps }] = useGlobalDataContext()
  let topLps = state?.topLps

  const allPairs = useAllPairData()

  useEffect(() => {
    async function fetchData() {
      // get top 20 by reserves
      let topPairs = Object.keys(allPairs)
        ?.sort((a, b) => parseFloat(allPairs[a].reserveUSD > allPairs[b].reserveUSD ? -1 : 1))
        ?.slice(0, 99)
        .map(pair => pair)

      let topLpLists = await Promise.all(
        topPairs.map(async pair => {
          // for each one, fetch top LPs
          try {
            const { data: results } = await client.query({
              query: TOP_LPS_PER_PAIRS,
              variables: {
                pair: pair.toString()
              },
              fetchPolicy: 'cache-first'
            })
            if (results) {
              return results.liquidityPositions
            }
          } catch (e) {}
        })
      )

      // get the top lps from the results formatted
      const topLps = []
      topLpLists
        .filter(i => !!i) // check for ones not fetched correctly
        .map(list => {
          return list.map(entry => {
            const pairData = allPairs[entry.pair.id]
            return topLps.push({
              user: entry.user,
              pairName: pairData.token0.symbol + '-' + pairData.token1.symbol,
              pairAddress: entry.pair.id,
              token0: pairData.token0.id,
              token1: pairData.token1.id,
              usd:
                (parseFloat(entry.liquidityTokenBalance) / parseFloat(pairData.totalSupply)) *
                parseFloat(pairData.reserveUSD)
            })
          })
        })

      const sorted = topLps.sort((a, b) => (a.usd > b.usd ? -1 : 1))
      const shorter = sorted.splice(0, 100)
      updateTopLps(shorter)
    }

    if (!topLps && allPairs && Object.keys(allPairs).length > 0) {
      fetchData()
    }
  })

  return topLps
}
