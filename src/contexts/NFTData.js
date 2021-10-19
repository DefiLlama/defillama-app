import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'

import { useDisplayUsdManager } from './LocalStorage'
import { fetchAPI } from './API'
import { NFT_CHARTS_API, NFT_COLLECTIONS_API, UPDATE_ALL_NFT_COLLECTIONS, UPDATE_NFT_CHART } from '../constants'

const NFTDataContext = createContext()

function useNFTDataContext() {
  return useContext(NFTDataContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE_ALL_NFT_COLLECTIONS: {
      const { collections } = payload
      return {
        ...state,
        collections,
      }
    }
    case UPDATE_NFT_CHART: {
      const { timeSeriesData } = payload
      return {
        ...state,
        timeSeriesData,
      }
    }
    default: {
      throw Error(`Unexpected action type in DataContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, { collections: [] })

  const updateCollections = useCallback(collections => {
    dispatch({
      type: UPDATE_ALL_NFT_COLLECTIONS,
      payload: { collections },
    })
  }, [])

  const updateChart = useCallback(timeSeriesData => {
    dispatch({
      type: UPDATE_NFT_CHART,
      payload: { timeSeriesData },
    })
  }, [])

  return (
    <NFTDataContext.Provider
      value={[
        state,
        {
          updateCollections,
          updateChart,
        }
      ]}
    >
      {children}
    </NFTDataContext.Provider>
  )
}

const getCollections = async () => {
  try {
    let data = await fetchAPI(NFT_COLLECTIONS_API)
    for (const collection of data) {
      Object.entries(collection).forEach(([key, value]) => {
        if (key.endsWith("USD")) {
          collection[key] = parseInt(value);
        }
      })
    }
    return data
  } catch (e) {
    console.log(e)
  }
}

const getChartData = async () => {
  try {
    // let data = await fetchAPI(NFT_CHARTS_API)
    let data = [];
    return data
  } catch (e) {
    console.log(e)
  }
}

export function Updater() {
  const [, { updateCollections, updateChart }] = useNFTDataContext()
  useEffect(() => {
    async function getData() {
      const collections = await getCollections()
      collections && updateCollections(collections)
    }
    getData()
  }, [updateCollections])

  useEffect(() => {
    async function fetchData() {
      let timeSeriesData = await getChartData()
      updateChart(timeSeriesData)
    }
    fetchData()
  }, [updateChart])

  return null
}

export function useNFTCollectionsData() {
  const [state] = useNFTDataContext()
  const [displayUsd] = useDisplayUsdManager()

  return state.collections.map(collection => ({
    ...collection,
    floor: displayUsd ? collection.floorUSD: collection.floor,
    dailyVolume: displayUsd ? collection.dailyVolumeUSD : collection.dailyVolume,
    totalVolume: displayUsd ? collection.totalVolumeUSD : collection.totalVolume,
  }))
}

export function useNFTChartData() {
  const [state] = useNFTDataContext()
  return state.timeSeriesData
}

export function useNFTSummaryData() {
  const [state] = useNFTDataContext()
  // const { timeSeriesData } = state

  const todayTotalMarketCap = state.collections.reduce((prevSum, collection) => prevSum + collection.marketCapUSD, 0)
  const yesterdayTotalMarketCap = todayTotalMarketCap
  // const todayTotalMarketCap = timeSeriesData[timeSeriesData.length - 1].totalMarketCapUSD
  // const yesterdayTotalMarketCap = timeSeriesData[timeSeriesData.length - 2].totalMarketCapUSD
  const marketCapChange = ((todayTotalMarketCap - yesterdayTotalMarketCap) / yesterdayTotalMarketCap * 100).toFixed(2)

  const totalVolume = state.collections.reduce((prevSum, collection) => prevSum + collection.dailyVolumeUSD, 0)

  return {
    totalMarketCap: todayTotalMarketCap,
    marketCapChange,
    totalVolume,
  }
}