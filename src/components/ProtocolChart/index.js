import React, { useMemo } from 'react'
import { useMedia } from 'react-use'
import TokenChart from '../TokenChart'
import { useGetExtraTvlEnabled } from '../../contexts/LocalStorage'

const ProtocolChart = ({
  chartData = [],
  chainTvls,
  ...extraParams
}) => {
  // Refactor later
  const below1600 = useMedia('(max-width: 1650px)')
  const below1024 = useMedia('(max-width: 1024px)')
  const below900 = useMedia('(max-width: 900px)')
  const small = below900 || (!below1024 && below1600)
  /*
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
  */

  return (
    <TokenChart
      small={small}
      data={chartData}
      {...extraParams}
    />
  )
}

export default ProtocolChart
