import { PROTOCOLS_API, PROTOCOL_API } from 'constants/index'
import { standardizeTokenName } from 'utils'

export const getProtocols = () =>
  fetch(PROTOCOLS_API)
    .then(r => r.json())
    .then(({ protocols, chains, protocolCategories }) => ({
      protocolsDict: protocols.reduce((acc, curr) => {
        acc[standardizeTokenName(curr.name)] = curr
        return acc
      }, {}),
      protocols,
      chains,
      categories: protocolCategories
    }))

export const getProtocol = async tokenName => {
  try {
    const tokenData = await fetch(`${PROTOCOL_API}/${tokenName}`).then(r => r.json())
    return tokenData
  } catch (e) {
    console.log(e)
  }
}
