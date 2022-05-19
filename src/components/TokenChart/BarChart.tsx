import * as echarts from 'echarts'
import { useEffect, useMemo } from 'react'
import { formattedNum } from 'utils'
import { v4 as uuid } from 'uuid'
import { stringToColour } from './utils'

export default function BarChart({ finalChartData, tokensUnique, formatDate, moneySymbol = '$', title }) {
  const id = useMemo(() => uuid(), [])
  const { dates, series } = useMemo(() => {
    const dates = []

    if (tokensUnique?.length === 0) {
      const series = {
        name: '',
        type: 'bar',
        stack: 'one',
        emphasis: {
          shadowBlur: 10,
          shadowColor: stringToColour(),
        },
        data: [],
      }

      finalChartData.forEach(([date, value]) => {
        dates.push(date)
        series.data.push(value)
      })

      return { dates, series }
    }

    const series = tokensUnique.map((token) => {
      const color = stringToColour()
      return {
        name: token,
        type: 'bar',
        stack: 'one',
        emphasis: {
          shadowBlur: 10,
          shadowColor: color,
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
    // skip chart init when a instance already exists
    if (echarts.getInstanceByDom(document.getElementById(id))) return

    const myChart = echarts.init(document.getElementById(id))
    myChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
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
        splitLine: {
          show: false,
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

// valueFormatter: (value) => moneySymbol + formattedNum(value),
