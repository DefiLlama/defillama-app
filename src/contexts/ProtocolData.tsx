import React, { createContext, useContext, useMemo } from 'react'
import { useStakingManager, usePool2Manager } from './LocalStorage'

const ProtocolDataContext = createContext({
  protocolsDict: {},
  protocols: [],
  chains: [],
  categories: []
})

export const useProtocolData = () => useContext(ProtocolDataContext)

export default function Provider({ children, protocolData }) {
  return <ProtocolDataContext.Provider value={protocolData}>{children}</ProtocolDataContext.Provider>
}

export const useFilteredProtocolData = ({ selectedChain = 'All', category = '' }) => {
  const allChains = selectedChain === 'All'
  const { chains, protocols } = useProtocolData()

  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  const { filteredProtocols, totalPool2, totalStaking } = useMemo(() => {
    let totalStaking = 0
    let totalPool2 = 0

    const filteredProtocols = protocols.reduce((accProtocolList, currProtocolData) => {
      // Skip all chain protocols and if there is a category, skip all protocols that are not in that category
      if (
        currProtocolData.category === 'Chain' ||
        (category && (currProtocolData.category || '').toLowerCase() !== category.toLowerCase())
      ) {
        return accProtocolList
      }

      // Calculate the correct tvl

      const updatedProtocolData = { ...currProtocolData }

      if (!allChains) {
        updatedProtocolData.tvl = currProtocolData.chainTvls[selectedChain]

        if (typeof updatedProtocolData.tvl !== 'number') {
          return accProtocolList
        }
      }

      // Add staking and pool2 to tvl

      if (stakingEnabled) {
        let stakedAmount = 0
        if (allChains) {
          stakedAmount = updatedProtocolData.chainTvls.staking ?? 0
        } else {
          stakedAmount = updatedProtocolData?.chainTvls?.[`${selectedChain}-staking`] ?? 0
        }
        updatedProtocolData.tvl += stakedAmount
        totalStaking += stakedAmount
      }

      if (pool2Enabled) {
        let pooledAmount = 0
        if (allChains) {
          pooledAmount = updatedProtocolData?.chainTvls.pool2 ?? 0
        } else {
          pooledAmount = updatedProtocolData?.chainTvls?.[`${selectedChain}-pool2`] ?? 0
        }
        updatedProtocolData.tvl += pooledAmount
        totalPool2 += pooledAmount
      }

      // When specific chain, do not return mcap/tvl for specific chain since tvl is spread accross chains
      if (!allChains && updatedProtocolData?.chains?.length > 1) {
        updatedProtocolData.mcaptvl = null
      }

      accProtocolList.push(updatedProtocolData)
      return accProtocolList
    }, [])

    return {
      filteredProtocols,
      totalPool2,
      totalStaking
    }
  }, [pool2Enabled, stakingEnabled, selectedChain, allChains, category, protocols])

  if (!allChains || stakingEnabled || pool2Enabled || category) {
    filteredProtocols.sort((a, b) => b.tvl - a.tvl)
  }

  return {
    filteredProtocols,
    chains,
    totalStaking,
    totalPool2
  }
}
