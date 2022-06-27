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

const Wrapper = styled.div`
  --gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function ScatterChart({ chartData }) {
  console.log(chartData[0])
  const id = useMemo(() => uuid(), [])

  const createInstance = useCallback(() => {
    const instance = echarts.getInstanceByDom(document.getElementById(id))

    return instance || echarts.init(document.getElementById(id))
  }, [id])

  useEffect(() => {
    const chartInstance = createInstance()

    const option = {
      xAxis: {},
      yAxis: {},
      series: [
        {
          symbolSize: 20,
          data: [
            [10.0, 8.04],
            [8.07, 6.95],
            [13.0, 7.58],
            [9.05, 8.81],
            [11.0, 8.33],
            [14.0, 7.66],
            [13.4, 6.81],
            [10.0, 6.33],
            [14.0, 8.96],
            [12.5, 6.82],
            [9.15, 7.2],
            [11.5, 7.2],
            [3.03, 4.23],
            [12.2, 7.83],
            [2.02, 4.47],
            [1.05, 3.33],
            [4.05, 4.96],
            [6.03, 7.24],
            [12.0, 6.26],
            [12.0, 8.84],
            [7.08, 5.82],
            [5.02, 5.68],
          ],
          type: 'scatter',
        },
      ],
    }

    chartInstance.setOption(option)
  }, [id, createInstance])

  return (
    <div style={{ position: 'relative' }}>
      <Wrapper id={id} style={{ height: '360px', margin: 'auto 0' }}></Wrapper>
    </div>
  )
}
