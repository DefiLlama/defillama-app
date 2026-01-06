export class ChartDataTransformer {
	static groupByInterval(
		series: any[],
		interval: 'day' | 'week' | 'month' | 'quarter',
		chartType: 'line' | 'area' | 'bar' | 'combo' | 'pie' | 'scatter' | 'hbar'
	): any[] {
		return series.map((s) => {
			const isFlowMetric = s.metricClass === 'flow'
			const grouped = new Map<number, number[]>()

			s.data.forEach(([timestamp, value]: [number, number]) => {
				const date = new Date(timestamp * 1000)
				let key: number

				if (interval === 'week') {
					const weekStart = new Date(date)
					weekStart.setDate(date.getDate() - date.getDay())
					weekStart.setHours(0, 0, 0, 0)
					key = Math.floor(weekStart.getTime() / 1000)
				} else if (interval === 'month') {
					key = Math.floor(new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000)
				} else if (interval === 'quarter') {
					const quarter = Math.floor(date.getMonth() / 3)
					key = Math.floor(new Date(date.getFullYear(), quarter * 3, 1).getTime() / 1000)
				} else {
					key = timestamp
				}

				if (!grouped.has(key)) grouped.set(key, [])
				grouped.get(key)!.push(value)
			})

			const aggregatedData: [number, number][] = Array.from(grouped.entries())
				.map(([timestamp, values]): [number, number] => {
					const aggregatedValue = isFlowMetric
						? values.reduce((sum, v) => sum + v, 0)
						: values.reduce((sum, v) => sum + v, 0) / values.length
					return [timestamp, aggregatedValue]
				})
				.sort((a, b) => a[0] - b[0])

			return {
				...s,
				data: aggregatedData
			}
		})
	}

	static toStacked(series: any[], chartType: 'line' | 'area' | 'bar' | 'combo' | 'pie' | 'scatter' | 'hbar'): any[] {
		const allTimestamps = new Set<number>()
		series.forEach((s) => {
			s.data.forEach(([timestamp]: [number, number]) => allTimestamps.add(timestamp))
		})

		const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

		return series.map((s) => {
			const dataMap = new Map(s.data)
			const alignedData: [number, number][] = sortedTimestamps.map((timestamp): [number, number] => [
				timestamp,
				(dataMap.get(timestamp) as number | undefined) || 0
			])

			return {
				...s,
				data: alignedData,
				stack: 'total',
				...(chartType === 'area' && {
					areaStyle: {
						opacity: 0.7
					}
				})
			}
		})
	}

	static toPercentage(series: any[], shouldStack: boolean = true): any[] {
		const allTimestamps = new Set<number>()
		series.forEach((s) => {
			s.data.forEach(([timestamp]: [number, number]) => allTimestamps.add(timestamp))
		})

		const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

		const totals = new Map<number, number>()
		sortedTimestamps.forEach((timestamp) => {
			let total = 0
			series.forEach((s) => {
				const dataPoint = s.data.find(([t]: [number, number]) => t === timestamp)
				if (dataPoint) {
					total += dataPoint[1]
				}
			})
			totals.set(timestamp, total)
		})

		const percentageColors = [
			'#FF6B6B',
			'#4ECDC4',
			'#45B7D1',
			'#96CEB4',
			'#FFEAA7',
			'#DDA0DD',
			'#98D8C8',
			'#F7DC6F',
			'#BB8FCE',
			'#85C1E9',
			'#F8C471',
			'#82E0AA',
			'#F1948A',
			'#85929E',
			'#D7BDE2'
		]

		const seriesWithAverages = series.map((s, serieIndex) => {
			const percentageData: [number, number][] = sortedTimestamps.map((timestamp) => {
				const dataPoint = s.data.find(([t]: [number, number]) => t === timestamp)
				const value = dataPoint ? dataPoint[1] : 0
				const total = totals.get(timestamp) || 0
				const percentage = total > 0 ? (value / total) * 100 : 0
				return [timestamp, percentage]
			})

			const avgPercentage = percentageData.reduce((sum, [_, pct]) => sum + pct, 0) / percentageData.length

			return {
				...s,
				data: percentageData,
				type: 'line' as const,
				...(shouldStack && { stack: 'total' }),
				avgPercentage
			}
		})

		const sortedSeries = shouldStack
			? seriesWithAverages.sort((a, b) => a.avgPercentage - b.avgPercentage)
			: seriesWithAverages

		const result = sortedSeries.map((s, index) => {
			const color = shouldStack ? percentageColors[index % percentageColors.length] : s.color
			return {
				...s,
				...(shouldStack && { color }),
				...(shouldStack && {
					areaStyle: {
						color: color,
						opacity: 0.7
					}
				})
			}
		})

		return result
	}

	static toCumulative(data: [number, number][]): [number, number][] {
		let cumSum = 0
		return data.map(([timestamp, value]) => {
			cumSum += value
			return [timestamp, cumSum]
		})
	}

	static applyCumulativeToSeries(series: any[]): any[] {
		return series.map((s) => ({
			...s,
			data: this.toCumulative(s.data),
			areaStyle: {
				opacity: 0.2
			}
		}))
	}
}
