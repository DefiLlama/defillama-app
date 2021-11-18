import { PROTOCOLS_API, PROTOCOL_API } from 'constants/index'
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
