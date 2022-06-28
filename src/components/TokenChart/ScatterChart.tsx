import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useCallback, useEffect, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  ToolboxComponent,
  BrushComponent,
} from 'echarts/components'

echarts.use([
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  ToolboxComponent,
  BrushComponent,
  CanvasRenderer,
])

export interface IChartProps {
  chartData: any
}

const Wrapper = styled.div`
  --gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

const option = {
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      data: [150, 230],
      type: 'line',
      color: 'red',
    },
  ],
}

export default function ScatterChart({ chartData }: IChartProps) {
  console.log(chartData[0])
  const id = useMemo(() => uuid(), [])

  const createInstance = useCallback(() => {
    const instance = echarts.getInstanceByDom(document.getElementById(id))

    return instance || echarts.init(document.getElementById(id))
  }, [id])

  useEffect(() => {
    const chartInstance = createInstance()
    chartInstance.setOption(option)

    function resize() {
      chartInstance.resize()
    }

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chartInstance.dispose()
    }
  }, [id])

  return (
    <div style={{ position: 'relative' }}>
      <Wrapper id={id} style={{ height: '500px', margin: 'auto 0' }}></Wrapper>
    </div>
  )
}
