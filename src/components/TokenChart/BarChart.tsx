import { useCallback, useEffect, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart as EBarChart } from 'echarts/charts'
import { TitleComponent } from 'echarts/components'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { toK } from 'utils'
import { v4 as uuid } from 'uuid'
import { stringToColour } from './utils'
import { IChartProps } from './types'

echarts.use([EBarChart, CanvasRenderer, TitleComponent])

export default function BarChart({ chartData, tokensUnique, moneySymbol = '$', title, color }: IChartProps) {
  const id = useMemo(() => uuid(), [])

  const [isDark] = useDarkModeManager()

  const series = useMemo(() => {
    const chartColor = color || stringToColour()

    if (!tokensUnique || tokensUnique?.length === 0) {
      const series = {
        name: '',
        type: 'bar',
        stack: 'one',
        emphasis: {
          shadowBlur: 10,
          shadowColor: stringToColour(),
        },
        itemStyle: {
          color: chartColor,
        },
        data: [],
      }

      chartData.forEach(([date, value]) => {
        series.data.push([new Date(date * 1000), value])
      })

      return series
    } else {
      const series = tokensUnique.map((token) => {
        return {
          name: token,
          type: 'bar',
          stack: 'one',
          emphasis: {
            shadowBlur: 10,
            shadowColor: stringToColour(),
          },
          data: [],
        }
      })

      chartData.forEach(({ date, ...item }) => {
        tokensUnique.forEach((token) =>
          series.find((t) => t.name === token)?.data.push([new Date(date * 1000), item[token] || 0])
        )
      })

      return series
    }
  }, [chartData, color, tokensUnique])

  const createInstance = useCallback(() => {
    const instance = echarts.getInstanceByDom(document.getElementById(id))

    return instance || echarts.init(document.getElementById(id))
  }, [id])

  useEffect(() => {
    // create instance
    const chartInstance = createInstance()

    chartInstance.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: function (params) {
          const chartdate = new Date(params[0].value[0]).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })

          const vals = params.reduce((prev, curr) => {
            if (curr.value[1] !== 0) {
              return (prev +=
                '<li style="list-style:none">' +
                curr.marker +
                curr.seriesName +
                '&nbsp;&nbsp;' +
                moneySymbol +
                toK(curr.value[1]) +
                '</li>')
            } else return prev
          }, '')

          return chartdate + vals
        },
      },
      title: {
        text: title,
        textStyle: {
          fontFamily: 'inter, sans-serif',
          fontWeight: 600,
          color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
        },
      },
      grid: {
        left: 0,
        containLabel: true,
        bottom: 60,
        top: 48,
        right: 20,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        nameTextStyle: {
          fontFamily: 'inter, sans-serif',
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
          fontFamily: 'inter, sans-serif',
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
      series,
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
    })

    function resize() {
      chartInstance.resize()
    }

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chartInstance.dispose()
    }
  }, [id, moneySymbol, title, createInstance, series, isDark, color])

  return <div id={id} style={{ height: '360px', margin: 'auto 0' }}></div>
}
