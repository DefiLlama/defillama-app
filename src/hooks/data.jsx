import { useMemo } from 'react'
import { useStakingManager, usePool2Manager } from 'contexts/LocalStorage'

export const useCalcStakePool2Tvl = (filteredProtocols, defaultSortingColumn) => {
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  const protocolTotals = useMemo(() => {
    if (!stakingEnabled && !pool2Enabled) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols
      .map(({ tvl, pool2 = 0, staking = 0, ...props }) => {
        let finalTvl = tvl

        if (stakingEnabled) {
          finalTvl += staking
        }

        if (pool2Enabled) {
          finalTvl += pool2
        }

        return {
          ...props,
          tvl: finalTvl
        }
      })
    if (defaultSortingColumn === undefined) {
      return updatedProtocols.sort((a, b) => b.tvl - a.tvl)
    } else {
      return updatedProtocols
    }
  }, [filteredProtocols, stakingEnabled, pool2Enabled, defaultSortingColumn])

  return protocolTotals
}
