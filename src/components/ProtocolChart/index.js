import React, { useMemo } from 'react'
import { useMedia } from 'react-use'
import TokenChart from '../TokenChart'
import { useGetExtraTvlEnabled } from '../../contexts/LocalStorage'

const ProtocolChart = ({
  chartData = [],
  protocol,
  tokens,
  tokensInUsd,
  chainTvls = {},
  misrepresentedTokens,
  color,
  denomination,
  selectedChain,
  chains,
  hallmarks,
  isHourlyChart,
}) => {
  const extraTvlEnabled = useGetExtraTvlEnabled()

  // Refactor later
  const below1600 = useMedia('(max-width: 1650px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below900 = useMedia('(max-width: 900px)')
  const small = below900 || (!below1024 && below1600)
  const sections = Object.keys(chainTvls).filter((sect) => extraTvlEnabled[sect.toLowerCase()])
  const chartDataFiltered = useMemo(() => {
    const tvlDictionary = {}
    if (sections.length > 0) {
      for (const name of sections) {
        tvlDictionary[name] = {}
        chainTvls[name].tvl.forEach((dataPoint) => {
          tvlDictionary[name][dataPoint.date] = dataPoint.totalLiquidityUSD
        })
      }
      return chartData?.map((item) => {
        const sum = sections.reduce((total, sect) => total + (tvlDictionary[sect]?.[item[0]] ?? 0), item[1])
        return [item[0], sum]
      })
    } else return chartData
  }, [chartData, chainTvls, sections])

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
      isHourlyChart={isHourlyChart}
    />
  )
}

export default ProtocolChart
