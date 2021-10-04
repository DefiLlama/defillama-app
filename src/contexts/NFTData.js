import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'

import { useDisplayUsdManager } from './LocalStorage'
import { fetchAPI } from './API'

const UPDATE_ALL_NFT_COLLECTIONS = 'UPDATE_ALL_NFT_COLLECTIONS'

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
        collections: collections,
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
      payload: {
        collections,
      }
    })
  }, [])

  return (
    <NFTDataContext.Provider
      value={[
        state,
        {
          updateCollections,
        }
      ]}
    >
      {children}
    </NFTDataContext.Provider>
  )
}

const getCollections = async () => {
  try {
    let data = await fetchAPI('https://api.llama.fi/nft/collections')
    return data.collections
  } catch (e) {
    console.log(e)
  }
}

export function Updater() {
  const [, { updateCollections }] = useNFTDataContext()
  useEffect(() => {
    async function getData() {
      const collections = await getCollections()
      collections && updateCollections(collections)
    }
    getData()
  }, [updateCollections])
  return null
}

export function useNFTCollectionsData() {
  const [state] = useNFTDataContext()
  const [displayUsd] = useDisplayUsdManager()

  return state.collections.map(collection => ({
    ...collection,
    floor: displayUsd ? collection.floorUsd : collection.floor,
    dailyVolume: displayUsd ? collection.dailyVolumeUsd : collection.dailyVolume,
    totalVolume: displayUsd ? collection.totalVolumeUsd : collection.totalVolume,
  }))
}
