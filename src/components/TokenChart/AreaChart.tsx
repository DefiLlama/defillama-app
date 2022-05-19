import * as echarts from 'echarts'
import { useEffect, useMemo } from 'react'
import { formattedNum } from 'utils'
import { v4 as uuid } from 'uuid'

function stringToColour() {
  return '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
}

export default function AreaChart({ finalChartData, tokensUnique, formatDate, moneySymbol = '$', title }) {
  const id = useMemo(() => uuid(), [])
  const { dates, series } = useMemo(() => {
    const dates = []
    const series = tokensUnique.map((token) => {
      const color = stringToColour()
      return {
        name: token,
        type: 'line',
        symbol: 'none',
        sampling: 'lttb',
        itemStyle: {
          color,
        },
        areaStyle: {
          color,
        },
        data: [],
      }
    })

    finalChartData.forEach(({ date, ...item }) => {
      dates.push(date)
      tokensUnique.forEach((token) => series.find((t) => t.name === token)?.data.push(item[token] || 0))
    })

    return { dates, series }
  }, [finalChartData, tokensUnique])

  useEffect(() => {
    const myChart = echarts.init(document.getElementById(id))
    myChart.setOption({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => moneySymbol + formattedNum(value),
      },
      title: {
        text: title,
      },
      toolbox: {
        feature: {
          saveAsImage: {},
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          formatter: (value) => formatDate(value),
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => moneySymbol + formattedNum(value),
        },
      },
      series: series,
    })

    window.addEventListener('resize', () => myChart.resize())

    return () =>
      window.removeEventListener('resize', () => {
        myChart.resize()
        myChart.dispose()
      })
  }, [id, dates, series, formatDate, moneySymbol, title])

  return (
    <div>
      <div id={id} style={{ height: '300px' }}></div>
    </div>
  )
}
