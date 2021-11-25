import { useMemo } from 'react'
import { useStakingManager, usePool2Manager } from 'contexts/LocalStorage'

export const useCalcStakePool2Tvl = filteredProtocols => {
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  const protocolTotals = useMemo(() => {
    if (!stakingEnabled && !pool2Enabled) {
      return filteredProtocols
    }

    return filteredProtocols
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
      .sort((a, b) => b.tvl - a.tvl)
  }, [filteredProtocols, stakingEnabled, pool2Enabled])

  return protocolTotals
}
