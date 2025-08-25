import { useCallback } from 'react'
import { useProDashboard } from '../ProDashboardAPIContext'
import { useCSVRegistry } from './useCSVRegistry'

type ChartDataPoint = [string, number]

interface ChartItem {
	id: string
	kind: string
	data?: ChartDataPoint[]
	items?: ChartItem[]
	name?: string
	protocol?: string
	chain?: string
}

export const useChartExtraction = () => {
	const { chartsWithData, getProtocolInfo } = useProDashboard()
	const { getCSVExtractor } = useCSVRegistry()

	const extractChartImage = useCallback(async (itemId: string): Promise<string | null> => {

		try {
			const item = chartsWithData?.find(item => item.id === itemId)
			
			if (item && item.kind === 'table') {
				return null
			}

			await new Promise(resolve => setTimeout(resolve, 500))

			const selectors = [
				`[data-chart-id="${itemId}"] canvas[data-zr-dom-id]`,
				`[data-chart-id="${itemId}"] canvas`,
				`#${itemId} canvas[data-zr-dom-id]`,
				`#${itemId} canvas`,
				`[data-multi-id="${itemId}"] canvas[data-zr-dom-id]`,
				`[data-builder-id="${itemId}"] canvas[data-zr-dom-id]`
			]

			let canvas: HTMLCanvasElement | null = null

			for (const selector of selectors) {
				canvas = document.querySelector(selector)
				if (canvas) {
					break
				}
			}

			if (!canvas) {
				return null
			}

			const imageData = canvas.toDataURL('image/png')			
			return imageData
		} catch (error) {
			return null
		}
	}, [chartsWithData])

	const extractChartCSV = useCallback(async (itemId: string): Promise<string | null> => {
	
		try {
			const chartItem = chartsWithData?.find(item => item.id === itemId)
			
			if (!chartItem) {
				return null
			}

			let csvContent = ''

			if (chartItem.kind === 'chart') {
				csvContent = generateChartCSV(chartItem)
			} else if (chartItem.kind === 'multi') {
				csvContent = generateMultiChartCSV(chartItem)
			} else if (chartItem.kind === 'builder') {
				csvContent = generateBuilderChartCSV(chartItem)
			} else if (chartItem.kind === 'table') {
				csvContent = await extractTableCSV(itemId)
			} else {
				return null
			}

			return csvContent

		} catch (error) {
			return null
		}
	}, [chartsWithData])

	const formatTimestamp = (timestamp: string): string => {
		return new Date(Number(timestamp) * 1000).toLocaleDateString()
	}

	const generateChartCSV = (chartItem: ChartItem): string => {
		if (!chartItem.data || !Array.isArray(chartItem.data)) {
			return ''
		}

		const itemName = getItemName(chartItem)
		const chartTypeTitle = 'Data'
		
		const headers = ['Date', `${itemName} ${chartTypeTitle}`]
		
		const rows = chartItem.data.map(([timestamp, value]: [string, number]) => [
			formatTimestamp(timestamp),
			value
		])

		return [headers, ...rows].map((row) => row.join(',')).join('\n')
	}

	const generateMultiChartCSV = (chartItem: ChartItem): string => {
		if (!chartItem.items || !Array.isArray(chartItem.items)) {
			return ''
		}

		const allSeries: { [key: string]: { [date: string]: number } } = {}
		const allDates = new Set<string>()

		for (const subItem of chartItem.items) {
			if (subItem.data && Array.isArray(subItem.data)) {
				const seriesName = getItemName(subItem)
				allSeries[seriesName] = {}

				for (const [timestamp, value] of subItem.data) {
					const date = formatTimestamp(timestamp)
					allDates.add(date)
					allSeries[seriesName][date] = value
				}
			}
		}

		const sortedDates = Array.from(allDates).sort()
		const headers = ['Date', ...Object.keys(allSeries)]
		
		const rows = sortedDates.map(date => {
			const row = [date]
			for (const seriesName of Object.keys(allSeries)) {
				row.push(allSeries[seriesName][date]?.toString() || '0')
			}
			return row
		})

		return [headers, ...rows].map(row => row.join(',')).join('\n')
	}

	const generateBuilderChartCSV = (chartItem: ChartItem): string => {
		return chartItem.data && Array.isArray(chartItem.data) ? generateChartCSV(chartItem) : ''
	}

	const extractTableCSV = async (itemId: string): Promise<string> => {		
		try {
			const csvExtractor = getCSVExtractor(itemId)
			
			if (csvExtractor) {
				const csvContent = csvExtractor(true)
				
				if (typeof csvContent === 'string') {
					return csvContent
				} else {
					return 'Error: CSV extractor returned no data'
				}
			} else {
				return 'Error: No CSV extractor found for table'
			}
			
		} catch (error) {
			return `Error: Failed to extract table data - ${error instanceof Error ? error.message : 'Unknown error'}`
		}
	}

	const getItemName = (item: ChartItem): string => {
		if (item.protocol) {
			const protocolInfo = getProtocolInfo?.(item.protocol)
			return protocolInfo?.name || item.protocol
		}
		if (item.chain) {
			return item.chain
		}
		if (item.name) {
			return item.name
		}
		return 'Value'
	}

	return {
		extractChartImage,
		extractChartCSV
	}
}