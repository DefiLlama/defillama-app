import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react'

import { standardizeTokenName } from 'utils'

import { fetchAPI } from './API'
import { PROTOCOLS_API, PROTOCOL_API, UPDATE_TOP_TOKENS, UPDATE } from '../constants'

import { useStakingManager, usePool2Manager } from './LocalStorage'

const TokenDataContext = createContext()

function useTokenDataContext() {
  return useContext(TokenDataContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { tokenName, data } = payload
      return {
        ...state,
        tokenDict: {
          ...state.tokenDict,
          [tokenName]: {
            ...(state.tokenDict?.[tokenName] || {}),
            ...data
          }
        }
      }
    }
    case UPDATE_TOP_TOKENS: {
      const { topTokens } = payload
      const tokenDict = topTokens?.protocols.reduce((acc, curr) => {
        acc[standardizeTokenName(curr.name)] = curr
        return acc
      }, {})
      return {
        ...state,
        tokenDict,
        tokenArr: topTokens.protocols,
        chains: topTokens.chains,
        categories: topTokens.protocolCategories
      }
    }

    default: {
      throw Error(`Unexpected action type in DataContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    tokenDict: {},
    tokenArr: [],
    chains: [],
    categories: []
  })

  const updateToken = useCallback((tokenName, data) => {
    dispatch({
      type: UPDATE,
      payload: {
        tokenName,
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

  return (
    <TokenDataContext.Provider
      value={[
        state,
        {
          updateToken,
          updateTopTokens
        }
      ]}
    >
      {children}
    </TokenDataContext.Provider>
  )
}

const getTopTokens = async () => {
  try {
    let tokens = await fetchAPI(PROTOCOLS_API)
    return tokens
  } catch (e) {
    console.log(e)
  }
}

const getTokenByProtocol = async tokenName => {
  try {
    const tokenData = await fetchAPI(`${PROTOCOL_API}/${tokenName}`)
    return tokenData
  } catch (e) {
    console.log(e)
  }
}

const getTokenData = async tokenName => {
  try {
    if (tokenName) {
      const tokenData = await getTokenByProtocol(tokenName)
      // check what token chainTvls was object or array br
      const historicalChainTvls = { ...(tokenData?.chainTvls ?? {}) }
      // Don't overwrite topTokens' chainTvls response
      delete tokenData.chainTvls

      return {
        ...tokenData,
        tvl: tokenData?.tvl.length > 0 ? tokenData?.tvl[tokenData?.tvl.length - 1]?.totalLiquidityUSD : 0,
        tvlList: tokenData?.tvl.filter(item => item.date),
        historicalChainTvls,
        detailed: true
      }
    }
  } catch (e) {
    console.log(tokenName, e)
  }
  return {}
}

export function Updater() {
  const [, { updateTopTokens }] = useTokenDataContext()

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

export function useTokenData(tokenName) {
  const [{ tokenDict }, { updateToken }] = useTokenDataContext()
  const hasTokenData = tokenDict?.[tokenName]?.detailed

  useEffect(() => {
    if (!hasTokenData && tokenName) {
      getTokenData(tokenName).then(data => {
        updateToken(tokenName, data)
      })
    }
  }, [hasTokenData, updateToken, tokenName])

  return tokenDict[tokenName] || {}
}

export function useAllTokenData() {
  const [state] = useTokenDataContext()
  return state
}

export const useFilteredTokenData = ({ selectedChain = 'All', category = '' }) => {
  const allChains = selectedChain === 'All'
  const [{ chains, tokenArr }] = useTokenDataContext()

  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  const { filteredTokens, totalPool2, totalStaking } = useMemo(() => {
    let totalStaking = 0
    let totalPool2 = 0

    const filteredTokens = tokenArr.reduce((accTokenList, currTokenData) => {
      // Skip all chain tokens and if there is a category, skip all tokens that are not in that category
      if (
        currTokenData.category === 'Chain' ||
        (category && (currTokenData.category || '').toLowerCase() !== category.toLowerCase())
      ) {
        return accTokenList
      }

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

    return {
      filteredTokens,
      totalPool2,
      totalStaking
    }
  }, [pool2Enabled, stakingEnabled, selectedChain, allChains, category, tokenArr])

  if (!allChains || stakingEnabled || pool2Enabled || category) {
    filteredTokens.sort((a, b) => b.tvl - a.tvl)
  }

  return {
    filteredTokens,
    chains,
    totalStaking,
    totalPool2
  }
}
