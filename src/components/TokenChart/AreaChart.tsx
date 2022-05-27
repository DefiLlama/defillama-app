import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TooltipComponent,
  TitleComponent,
  GridComponent,
  DataZoomComponent,
  GraphicComponent,
} from 'echarts/components'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef } from 'react'
import { toK } from 'utils'
import { v4 as uuid } from 'uuid'
import { stringToColour } from './utils'
import styled from 'styled-components'
import { useDarkModeManager } from 'contexts/LocalStorage'
import logoLight from '../../../public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '../../../public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'
import { useMedia } from 'react-use'

echarts.use([
  CanvasRenderer,
  LineChart,
  TooltipComponent,
  TitleComponent,
  GridComponent,
  DataZoomComponent,
  GraphicComponent,
])

interface IChartProps {
  finalChartData: any
  tokensUnique: string[]
  formatDate: (date: any) => string
  moneySymbol?: string
  title: string
  color: string
}

const Wrapper = styled.div`
  --gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function AreaChart({
  finalChartData,
  tokensUnique,
  formatDate,
  moneySymbol = '$',
  title,
  color,
}: IChartProps) {
  const { pathname } = useRouter()

  const id = useMemo(() => uuid(), [])

  const [isDark] = useDarkModeManager()

  const prevPathname = useRef(pathname)

  const series = useMemo(() => {
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
          color: chartColor,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: chartColor,
            },
            {
              offset: 1,
              color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
            },
          ]),
        },
        data: [],
      }

      finalChartData.forEach(([date, value]) => {
        series.data.push([new Date(date * 1000), value])
      })

      return series
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
      tokensUnique.forEach((token) =>
        series.find((t) => t.name === token)?.data.push([new Date(date * 1000), item[token] || 0])
      )
    })

    return series
  }, [finalChartData, tokensUnique, color, isDark])

  const isSmall = useMedia(`(max-width: 600px)`)

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
      graphic: {
        type: 'image',
        z: 0,
        style: {
          image: isDark ? logoLight.src : logoDark.src,
          height: 28,
          y: 160,
          opacity: 0.3,
        },
        left: isSmall ? '40%' : '45%',
      },
      tooltip: {
        trigger: 'axis',
        formatter: function (params) {
          const chartdate = new Date(params[0].value[0]).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })

          const vals = params.reduce(
            (prev, curr) =>
              prev +
              '<li style="list-style:none">' +
              curr.marker +
              curr.seriesName +
              '&nbsp;&nbsp;' +
              moneySymbol +
              toK(curr.value[1]) +
              '</li>',
            ''
          )
          return chartdate + vals
        },
      },
      title: {
        text: title,
      },
      grid: {
        left: 20,
        containLabel: true,
        bottom: 60,
        top: 20,
        right: 20,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        nameTextStyle: {
          fontFamily: 'var(--font-inter)',
          fontSize: 14,
          fontWeight: 400,
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
            opacity: 0.2,
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => moneySymbol + toK(value),
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
            opacity: 0.1,
          },
        },
        boundaryGap: false,
        nameTextStyle: {
          fontFamily: 'var(--font-inter)',
          fontSize: 14,
          fontWeight: 400,
          color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
        },
        splitLine: {
          lineStyle: {
            color: '#a1a1aa',
            opacity: 0.1,
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          start: 0,
          end: 100,
          textStyle: {
            color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
          },
          borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
          handleStyle: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
            color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)',
          },
          moveHandleStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
          },
          selectedDataBackground: {
            lineStyle: {
              color,
            },
            areaStyle: {
              color,
            },
          },
          emphasis: {
            handleStyle: {
              borderColor: isDark ? 'rgba(255, 255, 255, 1)' : '#000',
              color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
            },
            moveHandleStyle: {
              borderColor: isDark ? 'rgba(255, 255, 255, 1)' : '#000',
              color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            },
          },
          fillerColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
          labelFormatter: (val) => {
            const date = new Date(val)
            return date.toLocaleDateString()
          },
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
  }, [id, series, formatDate, moneySymbol, title, pathname, isDark, color, isSmall])

  return <Wrapper id={id} style={{ height: '400px' }}></Wrapper>
}
