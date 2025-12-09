import * as echarts from 'echarts/core'

export interface CapturedChart {
	chartId: string
	imageData: string
	title: string
}

const CAPTURE_WIDTH = 1280
const CAPTURE_HEIGHT = 720
const CAPTURE_TIMEOUT = 1500

export async function captureChartById(chartId: string, title: string, isDark: boolean): Promise<CapturedChart | null> {
	const wrapper = document.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement
	if (!wrapper) return null

	const chartContainer = wrapper.querySelector('div[_echarts_instance_]') as HTMLElement
	if (!chartContainer) return null

	const existingChart = echarts.getInstanceByDom(chartContainer)
	if (!existingChart) return null

	const tempContainer = document.createElement('div')
	tempContainer.style.width = `${CAPTURE_WIDTH}px`
	tempContainer.style.height = `${CAPTURE_HEIGHT}px`
	tempContainer.style.position = 'absolute'
	tempContainer.style.left = '-99999px'
	tempContainer.style.top = '0'
	document.body.appendChild(tempContainer)

	try {
		const tempChart = echarts.init(tempContainer, null, {
			width: CAPTURE_WIDTH,
			height: CAPTURE_HEIGHT
		})

		const currentOptions: any = existingChart.getOption()

		currentOptions.animation = false

		if (currentOptions.xAxis) {
			currentOptions.xAxis = currentOptions.xAxis.map((xAxis) => ({
				...xAxis,
				axisLabel: { ...(xAxis.axisLabel ?? {}), fontSize: 20 }
			}))
		}

		if (currentOptions.yAxis) {
			currentOptions.yAxis = currentOptions.yAxis.map((yAxis) => ({
				...yAxis,
				axisLabel: { ...(yAxis.axisLabel ?? {}), fontSize: 20 }
			}))
		}

		if (currentOptions.legend) {
			currentOptions.legend = Array.isArray(currentOptions.legend)
				? currentOptions.legend.map((l) => ({
						...l,
						textStyle: { ...(l.textStyle ?? {}), fontSize: 18 }
					}))
				: {
						...currentOptions.legend,
						textStyle: { ...(currentOptions.legend.textStyle ?? {}), fontSize: 18 }
					}
		}

		tempChart.setOption(currentOptions)

		await new Promise<void>((resolve) => {
			let timeoutId: ReturnType<typeof setTimeout> | null = null

			const handler = () => {
				if (timeoutId) clearTimeout(timeoutId)
				tempChart.off('rendered', handler as any)
				resolve()
			}

			timeoutId = setTimeout(() => {
				tempChart.off('rendered', handler as any)
				resolve()
			}, CAPTURE_TIMEOUT)

			tempChart.on('rendered', handler as any)
		})

		const dataURL = tempChart.getDataURL({
			type: 'png',
			pixelRatio: 2,
			backgroundColor: isDark ? '#0b1214' : '#ffffff',
			excludeComponents: ['toolbox', 'dataZoom']
		})

		tempChart.dispose()

		return {
			chartId,
			imageData: dataURL,
			title
		}
	} catch (error) {
		console.error('Chart capture error:', error)
		return null
	} finally {
		document.body.removeChild(tempContainer)
	}
}

export async function captureAllCharts(
	charts: Array<{ id: string; title: string }>,
	isDark: boolean
): Promise<CapturedChart[]> {
	const results: CapturedChart[] = []

	for (const chart of charts) {
		const captured = await captureChartById(chart.id, chart.title, isDark)
		if (captured) {
			results.push(captured)
		}
	}

	return results
}
