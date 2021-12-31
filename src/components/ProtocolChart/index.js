import React, { useMemo } from 'react'
import { useMedia } from 'react-use'
import TokenChart from '../TokenChart'
import { getExtraTvlEnabled } from '../../contexts/LocalStorage'

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
  const extraTvlEnabled = getExtraTvlEnabled()

  // Refactor later
  const below1600 = useMedia('(max-width: 1650px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below900 = useMedia('(max-width: 900px)')
  const small = below900 || (!below1024 && below1600)

  const chartDataFiltered = useMemo(() => {
    const tvlDictionary = {}
    const sections = Object.keys(chainTvls).filter(
      sect => sect[0].toLowerCase() === sect[0] && extraTvlEnabled[sect] === true
    )

    if (sections.length > 0) {
      for (const name of sections) {
        tvlDictionary[name] = {}
        chainTvls[name].tvl.forEach(dataPoint => {
          tvlDictionary[name][dataPoint.date] = dataPoint.totalLiquidityUSD
        })
      }
      return chartData?.map(item => [
        item[0],
        sections.reduce((total, sect) => total + (tvlDictionary[sect]?.[item[0]] ?? 0), item[1])
      ])
    }
    return chartData
  }, [chartData, extraTvlEnabled, chainTvls])

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
