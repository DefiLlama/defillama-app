import type * as echarts from 'echarts/core'
import type { RefObject } from 'react'
import { useEffect } from 'react'

/**
 * Manages chart resize event listener with stable subscription.
 * The resize listener is attached once and never re-subscribes,
 * regardless of chart instance changes.
 *
 * @param instanceRef - A ref containing the ECharts instance to resize
 *
 * @example
 * ```tsx
 * function MyChart({ data }) {
 *   const chartRef = useRef<echarts.ECharts | null>(null)
 *
 *   // Resize listener is stable - won't re-attach when data changes
 *   useChartResize(chartRef)
 *
 *   useEffect(() => {
 *     const instance = echarts.init(ref.current)
 *     chartRef.current = instance
 *     instance.setOption(getOptions(data))
 *     return () => {
 *       chartRef.current = null
 *       instance.dispose()
 *     }
 *   }, [data])
 * }
 * ```
 */
export function useChartResize(instanceRef: RefObject<echarts.ECharts | null>) {
	useEffect(() => {
		const resize = () => {
			instanceRef.current?.resize()
		}

		window.addEventListener('resize', resize)
		return () => window.removeEventListener('resize', resize)
	}, [instanceRef])
}
