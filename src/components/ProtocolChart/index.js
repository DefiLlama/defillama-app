import React, { useMemo } from 'react'
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
    <div></div>
  )
}

export default ProtocolChart