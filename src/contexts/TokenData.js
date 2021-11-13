import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { useEthPrice } from './GlobalData'
import { priorityChainFilters } from 'constants/chainTokens'

import { fetchAPI } from './API'
import {
  PROTOCOLS_API,
  PROTOCOL_API,
  UPDATE,
  UPDATE_TOKEN_TXNS,
  UPDATE_CHART_DATA,
  UPDATE_PRICE_DATA,
  UPDATE_TOP_TOKENS,
  UPDATE_ALL_PAIRS,
  TOKEN_PAIRS_KEY
} from '../constants'

import { useStakingManager, usePool2Manager } from './LocalStorage'

dayjs.extend(utc)

const TokenDataContext = createContext()

function useTokenDataContext() {
  return useContext(TokenDataContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { tokenAddress, data } = payload
      return {
        ...state,
        [tokenAddress]: {
          ...state?.[tokenAddress],
          ...data
        }
      }
    }
    case UPDATE_TOP_TOKENS: {
      const { topTokens } = payload
      let added = {}
      if (topTokens) {
        added = topTokens
      }
      return {
        ...state,
        ...added
      }
    }

    case UPDATE_TOKEN_TXNS: {
      const { address, transactions } = payload
      return {
        ...state,
        [address]: {
          ...state?.[address],
          txns: transactions
        }
      }
    }
    case UPDATE_CHART_DATA: {
      const { address, chartData } = payload
      return {
        ...state,
        [address]: {
          ...state?.[address],
          chartData
        }
      }
    }

    case UPDATE_PRICE_DATA: {
      const { address, data, timeWindow, interval } = payload
      return {
        ...state,
        [address]: {
          ...state?.[address],
          [timeWindow]: {
            ...state?.[address]?.[timeWindow],
            [interval]: data
          }
        }
      }
    }

    case UPDATE_ALL_PAIRS: {
      const { address, allPairs } = payload
      return {
        ...state,
        [address]: {
          ...state?.[address],
          [TOKEN_PAIRS_KEY]: allPairs
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
  const update = useCallback((tokenAddress, data) => {
    dispatch({
      type: UPDATE,
      payload: {
        tokenAddress,
        data
      }
    })
  }, [])

  const updateTopTokens = useCallback(topTokens => {
    dispatch({
      type: UPDATE_TOP_TOKENS,
      payload: {
        topTokens
      }
    })
  }, [])

  const updateTokenTxns = useCallback((address, transactions) => {
    dispatch({
      type: UPDATE_TOKEN_TXNS,
      payload: { address, transactions }
    })
  }, [])

  const updateChartData = useCallback((address, chartData) => {
    dispatch({
      type: UPDATE_CHART_DATA,
      payload: { address, chartData }
    })
  }, [])

  const updateAllPairs = useCallback((address, allPairs) => {
    dispatch({
      type: UPDATE_ALL_PAIRS,
      payload: { address, allPairs }
    })
  }, [])

  const updatePriceData = useCallback((address, data, timeWindow, interval) => {
    dispatch({
      type: UPDATE_PRICE_DATA,
      payload: { address, data, timeWindow, interval }
    })
  }, [])

  return (
    <TokenDataContext.Provider
      value={[
        state,
        {
          update,
          updateTokenTxns,
          updateChartData,
          updateTopTokens,
          updateAllPairs,
          updatePriceData
        }
      ]}
    >
      {children}
    </TokenDataContext.Provider>
  )
}

const getTopTokens = async () => {
  //const utcCurrentTime = dayjs()
  // const utcOneDayBack = utcCurrentTime.subtract(1, 'day').unix()
  // const utcTwoDaysBack = utcCurrentTime.subtract(2, 'day').unix()
  // let oneDayBlock = await getBlockFromTimestamp(utcOneDayBack)
  // let twoDayBlock = await getBlockFromTimestamp(utcTwoDaysBack)

  try {
    let tokens = await fetchAPI(PROTOCOLS_API)
    let bulkResults = tokens.map(token => {
      return { ...token, priceUSD: token?.derivedETH * 1 || 0 }
      //data.TVL = data.TVL;
      // data.oneDayVolumeUSD = parseFloat(oneDayVolumeUSD)
      // data.volumeChangeUSD = volumeChangeUSD
      // data.priceChangeUSD = priceChangeUSD
      // data.liquidityChangeUSD = getPercentChange(currentLiquidityUSD ?? 0, oldLiquidityUSD ?? 0)
      // data.oneDayTxns = oneDayTxns
      // data.txnChange = txnChange
    })
    return bulkResults

    // calculate percentage changes and daily changes
  } catch (e) {
    console.log(e)
  }
}

const getTokenByProtocol = async protocol => {
  try {
    const tokenData = await fetchAPI(`${PROTOCOL_API}/${protocol}`)
    return tokenData
  } catch (e) {
    console.log(e)
  }
}

const getTokenData = async (address, protocol, ethPrice, ethPriceOld) => {
  try {
    if (protocol) {
      const tokenData = await getTokenByProtocol(protocol?.split(' ').join('-'))
      const data = {
        id: tokenData?.id,
        name: tokenData?.name,
        address: tokenData?.address,
        url: tokenData?.url,
        tvl: tokenData?.tvl.length > 0 ? tokenData?.tvl[tokenData?.tvl.length - 1]?.totalLiquidityUSD : 0,
        tvlList: tokenData?.tvl.filter(item => item.date),
        tokensInUsd: tokenData?.tokensInUsd,
        tokens: tokenData?.tokens,
        description: tokenData?.description,
        twitter: tokenData?.twitter,
        historicalChainTvls: tokenData?.chainTvls,
        methodology: tokenData?.methodology,
        misrepresentedTokens: tokenData?.misrepresentedTokens,
        hallmarks: tokenData?.hallmarks,
        logo: tokenData?.logo,
        audits: tokenData?.audits,
        audit_links: tokenData?.["audit_links"],
      }
      return data
    }
  } catch (e) {
    console.log(protocol, e)
  }
  return {}
}

export function Updater() {
  const [, { updateTopTokens }] = useTokenDataContext()
  //const [ethPrice, ethPriceOld] = useEthPrice()
  useEffect(() => {
    async function getData() {
      // get top pairs for overview list
      const topTokens = await getTopTokens()
      topTokens && updateTopTokens(topTokens)
    }
    getData()
  }, [updateTopTokens])
  return null
}

export function useTokenData(tokenId, protocol = '') {
  const [state, { update }] = useTokenDataContext()
  const [ethPrice, ethPriceOld] = useEthPrice()
  const [oldProtocol, setOldProtocol] = useState()
  const tokenData = state?.[tokenId]

  useEffect(() => {
    if (protocol && oldProtocol !== protocol) {
      getTokenData(tokenId, protocol, ethPrice, ethPriceOld).then(data => {
        update(tokenId, data)
      })
      setOldProtocol(protocol)
    }
  }, [tokenId, tokenData, update, protocol, oldProtocol])

  return tokenData || {}
}

export function useTokenTransactions(tokenAddress) { }

export function useTokenPairs(tokenAddress) { }

export function useTokenChartData(tokenAddress) { }

/**
 * get candlestick data for a token - saves in context based on the window and the
 * interval size
 * @param {*} tokenAddress
 * @param {*} timeWindow // a preset time window from constant - how far back to look
 * @param {*} interval  // the chunk size in seconds - default is 1 hour of 3600s
 */
export function useTokenPriceData(tokenAddress, timeWindow, interval = 3600) { }

export function useAllTokenData() {
  const [state] = useTokenDataContext()
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()
  if (stakingEnabled || pool2Enabled) {
    // TODO Optimize
    return Object.fromEntries(
      Object.entries(state).map(entry => [
        entry[0],
        {
          ...entry[1],
          tvl: entry[1].tvl + (stakingEnabled ? entry[1].chainTvls.staking ?? 0 : 0) + (pool2Enabled ? entry[1].chainTvls.pool2 ?? 0 : 0)
        }
      ])
    )
  }
  return state
}

export const useFilteredTokenData = ({ selectedChain = 'All', category = '' }) => {
  const allChains = selectedChain === 'All'
  const [allTokenData] = useTokenDataContext()

  let totalStaking = 0
  const [stakingEnabled] = useStakingManager()
  let totalPool2 = 0
  const [pool2Enabled] = usePool2Manager()

  // All chains accumulated from priority list and from looping through tokens' specific chains
  const chainsSet = new Set(priorityChainFilters)

  let filteredTokens = Object.values(allTokenData).reduce((accTokenList, currTokenData) => {
    // Skip all chain tokens and if there is a category, skip all tokens that are not in that category
    if (
      currTokenData.category === 'Chain' ||
      (category && (currTokenData.category || '').toLowerCase() !== category.toLowerCase())
    ) {
      return accTokenList
    }

    // Accumulating unique chains from tokens
    currTokenData.chains.forEach(chain => {
      chainsSet.add(chain)
    })

    // Calculate the correct tvl

    const updatedTokenData = { ...currTokenData }

    if (!allChains) {
      updatedTokenData.tvl = currTokenData.chainTvls[selectedChain]

      if (typeof updatedTokenData.tvl !== 'number') {
        return accTokenList
      }
    }

    // Add staking and pool2 to tvl

    if (stakingEnabled) {
      let stakedAmount = 0
      if (allChains) {
        stakedAmount = updatedTokenData.chainTvls.staking ?? 0
      } else {
        stakedAmount = updatedTokenData?.chainTvls?.[`${selectedChain}-staking`] ?? 0
      }
      updatedTokenData.tvl += stakedAmount
      totalStaking += stakedAmount
    }

    if (pool2Enabled) {
      let pooledAmount = 0
      if (allChains) {
        pooledAmount = updatedTokenData?.chainTvls.pool2 ?? 0
      } else {
        pooledAmount = updatedTokenData?.chainTvls?.[`${selectedChain}-pool2`] ?? 0
      }
      updatedTokenData.tvl += pooledAmount
      totalPool2 += pooledAmount
    }

    // When specific chain, do not return mcap/tvl for specific chain since tvl is spread accross chains
    if (!allChains && updatedTokenData?.chains?.length > 1) {
      updatedTokenData.mcaptvl = null
    }

    accTokenList.push(updatedTokenData)
    return accTokenList
  }, [])

  if (!allChains || stakingEnabled || pool2Enabled || category) {
    filteredTokens = filteredTokens.sort((a, b) => b.tvl - a.tvl)
  }

  return {
    filteredTokens,
    chainsSet,
    totalStaking,
    totalPool2
  }
}
