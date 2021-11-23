import { NFT_CHARTS_API, NFT_COLLECTIONS_API, NFT_COLLECTION_API, PROTOCOLS_API, PROTOCOL_API } from 'constants/index'
import { standardizeProtocolName } from 'utils'

export const getProtocols = () =>
  fetch(PROTOCOLS_API)
    .then(r => r.json())
    .then(({ protocols, chains, protocolCategories }) => ({
      protocolsDict: protocols.reduce((acc, curr) => {
        acc[standardizeProtocolName(curr.name)] = curr
        return acc
      }, {}),
      protocols,
      chains,
      categories: protocolCategories
    }))

export const getProtocol = tokenName => {
  try {
    return fetch(`${PROTOCOL_API}/${tokenName}`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollections = () => fetch(NFT_COLLECTIONS_API).then(r => r.json())

export const getNFTCollection = slug => {
  try {
    return fetch(`${NFT_COLLECTION_API}/${slug}`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}

export const getNFTCollectionChartData = slug => {
  try {
    return fetch(`${NFT_CHARTS_API}/${slug}/dailyVolume`).then(r => r.json())
  } catch (e) {
    console.log(e)
  }
}
