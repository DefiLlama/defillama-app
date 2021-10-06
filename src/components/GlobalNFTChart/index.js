import React, { useState, useMemo, useEffect, useRef } from 'react'
import { ResponsiveContainer } from 'recharts'
import { timeframeOptions } from '../../constants'
import TradingViewChart, { CHART_TYPES } from '../TradingviewChart'
import { getTimeframe } from '../../utils'
import { useNFTChartData } from '../../contexts/NFTData'

const GlobalNFTChart = () => {
  // time window and window size for chart
  const timeWindow = timeframeOptions.ALL_TIME

  // global historical data
  const data = useNFTChartData()
  
  // based on window, get starttim
  let utcStartTime = getTimeframe(timeWindow)

  const chartDataFiltered = useMemo(() => {
    let currentData = data
    return (
      currentData &&
      Object.keys(currentData)
        ?.map(key => {
          let item = currentData[key]
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
  }, [utcStartTime, data])

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
    <ResponsiveContainer aspect={60 / 28} ref={ref}>
      <TradingViewChart
        data={data}
        base={data[data.length - 1].totalMarketCapUSD}
        title="Total Market Cap"
        field="totalMarketCapUSD"
        width={width}
        type={CHART_TYPES.AREA}
      />
    </ResponsiveContainer>
  ) : (
    ''
  )
}

export default GlobalNFTChart
