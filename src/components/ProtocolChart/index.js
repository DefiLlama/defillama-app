import React, { useMemo } from 'react'
import { useMedia } from 'react-use'
import TokenChart from '../TokenChart'
import { usePool2Manager, useStakingManager } from '../../contexts/LocalStorage'

const ProtocolChart = ({
  chartData,
  protocol,
  tokens,
  tokensInUsd,
  chainTvls,
  misrepresentedTokens,
  color,
  denomination,
  selectedChain,
  chains,
  hallmarks
}) => {
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  // Refactor later
  const below1600 = useMedia('(max-width: 1650px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below900 = useMedia('(max-width: 900px)')
  const small = below900 || (!below1024 && below1600)

  const chartDataFiltered = useMemo(() => {
    let tvlDictionary = {}
    if (stakingEnabled || pool2Enabled) {
      for (const name of ['staking', 'pool2']) {
        if (chainTvls?.[name]) {
          tvlDictionary[name] = {}
          chainTvls[name].tvl.forEach(dataPoint => {
            tvlDictionary[name][dataPoint.date] = dataPoint.totalLiquidityUSD
          })
        }
      }
      return chartData?.map(item => [
        item[0],
        item[1] +
          (stakingEnabled ? tvlDictionary.staking?.[item[0]] ?? 0 : 0) +
          (pool2Enabled ? tvlDictionary.pool2?.[item[0]] ?? 0 : 0)
      ])
    }
    return chartData
  }, [chartData, stakingEnabled, pool2Enabled])

  return (
    <TokenChart
      small={small}
      data={chartDataFiltered}
      denomination={denomination}
      tokens={tokens}
      tokensInUsd={tokensInUsd}
      chainTvls={chainTvls}
      misrepresentedTokens={misrepresentedTokens}
      color={color}
      selectedChain={selectedChain}
      chains={chains ?? [protocol]}
      hallmarks={hallmarks}
    />
  )
}

export default ProtocolChart
