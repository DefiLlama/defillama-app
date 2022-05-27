import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, TitleComponent, GridComponent, DataZoomComponent } from 'echarts/components'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef } from 'react'
import { useMedia } from 'react-use'
import { formattedNum } from 'utils'
import { v4 as uuid } from 'uuid'
import { stringToColour } from './utils'

echarts.use([CanvasRenderer, LineChart, TooltipComponent, TitleComponent, GridComponent, DataZoomComponent])

export default function AreaChart({
  finalChartData,
  tokensUnique,
  formatDate,
  moneySymbol = '$',
  title,
  color,
  height = 340,
}) {
  const { pathname } = useRouter()

  const id = useMemo(() => uuid(), [])

  const prevPathname = useRef(pathname)

  const { dates, series } = useMemo(() => {
    const dates = []

    const chartColor = color || stringToColour()

    if (tokensUnique?.length === 0) {
      const series = {
        name: '',
        type: 'line',
        stack: 'Total',
        emphasis: {
          focus: 'series',
        },
        symbol: 'none',
        itemStyle: {
          color,
        },
        areaStyle: {
          color: chartColor,
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
        type: 'line',
        stack: 'Total',
        emphasis: {
          focus: 'series',
        },
        symbol: 'none',
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
  }, [finalChartData, tokensUnique, color])

  useEffect(() => {
    const instance = echarts.getInstanceByDom(document.getElementById(id))
    if (instance) {
      if (prevPathname.current !== pathname) {
        instance.dispose()
      } else return
    }

    // create instance
    const chartInstance = echarts.init(document.getElementById(id))

    chartInstance.setOption({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => moneySymbol + formattedNum(value),
      },
      title: {
        text: title,
      },
      grid: {
        left: 20,
        containLabel: true,
        bottom: 20,
        top: 20,
        right: 20,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          formatter: (value) => formatDate(value),
        },
        nameTextStyle: {
          fontFamily: 'var(--font-inter)',
          fontSize: 14,
          fontWeight: 400,
        },
        splitNumber: 4,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => moneySymbol + formattedNum(value),
        },
        nameTextStyle: {
          fontFamily: 'var(--font-inter)',
          fontSize: 14,
          fontWeight: 400,
        },
        splitNumber: 4,
        splitLine: {
          lineStyle: {
            opacity: 0.3,
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
      series: series,
    })
    window.addEventListener('resize', () => chartInstance.resize())
    return () => {
      window.removeEventListener('resize', () => {
        chartInstance.resize()
      })
      chartInstance.dispose()
    }
  }, [id, dates, series, formatDate, moneySymbol, title, pathname])

  const isTwoXl = useMedia('(min-width: 80rem)')

  return <div id={id} style={{ height: isTwoXl ? height + 'px' : '340px', flex: 1 }}></div>
}
