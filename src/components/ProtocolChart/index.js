import React, { useState, useMemo, useEffect, useRef } from 'react'
import { ResponsiveContainer } from 'recharts'
import { timeframeOptions } from '../../constants'
import TokenChart from '../TokenChart'
import { getTimeframe } from '../../utils'

const ProtocolChart = ({ chartData, protocol, tokens, tokensInUsd, chainTvls }) => {
  // global historical data

  // based on window, get starttim
  let utcStartTime = getTimeframe(timeframeOptions.ALL_TIME)

  const chartDataFiltered = useMemo(() => {
    return (
      chartData &&
      Object.keys(chartData)
        ?.map(key => {
          let item = chartData[key]
          if (item.date > utcStartTime) {
            return item
          } else {
            return
          }
        })
        .filter(item => {
          return !!item
        })
    )
  }, [chartData, utcStartTime])

  let change = 100;
  if (chartData.length > 1) {
    change = ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) / chartData[chartData.length - 2].totalLiquidityUSD) * 100;
  }

  // update the width on a window resize
  const ref = useRef()
  const isClient = typeof window === 'object'
  const [width, setWidth] = useState(ref?.current?.container?.clientWidth)

  useEffect(() => {
    if (!isClient) {
      return false
    }
    function handleResize() {
      setWidth(ref?.current?.container?.clientWidth ?? width)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isClient, width]) // Empty array ensures that effect is only run on mount and unmount

  return chartDataFiltered ? (
    <>
      {chartDataFiltered && (
        <ResponsiveContainer aspect={60 / 28} ref={ref}>
          <TokenChart
            data={chartData}
            base={chartData[chartData.length - 1].totalLiquidityUSD}
            baseChange={change}
            title={`${protocol} TVL`}
            field="totalLiquidityUSD"
            width={width}
            tokens={tokens}
            tokensInUsd={tokensInUsd}
            chainTvls={chainTvls}
          //type={CHART_TYPES.AREA}
          />
        </ResponsiveContainer>
      )}
    </>
  ) : (
    ''
  )
}

export default ProtocolChart
