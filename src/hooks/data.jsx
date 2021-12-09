import { useMemo } from 'react'
import { useStakingManager, usePool2Manager, useBorrowedManager } from 'contexts/LocalStorage'

export const useCalcStakePool2Tvl = (filteredProtocols, defaultSortingColumn) => {
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()
  const [borrowedEnabled] = useBorrowedManager()

  const protocolTotals = useMemo(() => {
    if (!stakingEnabled && !pool2Enabled && !borrowedEnabled) {
      return filteredProtocols
    }

    const updatedProtocols = filteredProtocols
      .map(({ tvl, pool2 = 0, staking = 0, borrowed = 0, ...props }) => {
        let finalTvl = tvl

        if (stakingEnabled) {
          finalTvl += staking
        }

        if (pool2Enabled) {
          finalTvl += pool2
        }
        if (borrowedEnabled) {
          finalTvl += borrowed
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
  }, [filteredProtocols, stakingEnabled, pool2Enabled, borrowedEnabled, defaultSortingColumn])

  return protocolTotals
}
