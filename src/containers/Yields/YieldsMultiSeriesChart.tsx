import { ToolboxComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { UniversalTransition } from 'echarts/features'

echarts.use([ToolboxComponent, UniversalTransition])

export { default } from '~/components/ECharts/MultiSeriesChart2'
