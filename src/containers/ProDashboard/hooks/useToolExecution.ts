import { useCallback } from 'react'
import { useProDashboard } from '../ProDashboardAPIContext'
import { useChartExtraction } from './useChartExtraction'

export const useToolExecution = () => {
	const { items } = useProDashboard()
	const { extractChartImage, extractChartCSV } = useChartExtraction()

	const executeSearchCharts = useCallback(
		async (parameters: any) => {
			const { series_name, axis_label, dataset_type, metric_type, protocol_name, chain_name, chart_kind, table_type } =
				parameters

			const matchingIds: string[] = []

			if (!items || items.length === 0) {
				return { matching_ids: [] }
			}

			for (const item of items) {
				let isMatch = false

				if (chart_kind && item.kind === chart_kind) {
					isMatch = true
				}

				if (table_type && 'tableType' in item && item.tableType === table_type) {
					isMatch = true
				}

				if (dataset_type) {
					if (
						('category' in item && item.category === dataset_type) ||
						('datasetType' in item && item.datasetType === dataset_type)
					) {
						isMatch = true
					}
				}

				if (metric_type && 'type' in item && item.type === metric_type) {
					isMatch = true
				}

				if (chain_name) {
					if (
						('chain' in item && item.chain === chain_name) ||
						('chains' in item && item.chains && item.chains.includes(chain_name)) ||
						('datasetChain' in item && item.datasetChain === chain_name)
					) {
						isMatch = true
					}
				}

				if (protocol_name && 'protocol' in item && item.protocol === protocol_name) {
					isMatch = true
				}

				if (series_name) {
					if ('name' in item && item.name && item.name.toLowerCase().includes(series_name.toLowerCase())) {
						isMatch = true
					}

					if ('items' in item && item.items) {
						for (const subItem of item.items) {
							if (
								'protocol' in subItem &&
								subItem.protocol &&
								subItem.protocol.toLowerCase().includes(series_name.toLowerCase())
							) {
								isMatch = true
								break
							}
						}
					}
				}

				if (axis_label && 'type' in item && item.type && item.type.toLowerCase().includes(axis_label.toLowerCase())) {
					isMatch = true
				}

				if (
					!series_name &&
					!axis_label &&
					!dataset_type &&
					!metric_type &&
					!protocol_name &&
					!chain_name &&
					!chart_kind &&
					!table_type
				) {
					if (item.kind === 'chart' || item.kind === 'multi' || item.kind === 'builder') {
						isMatch = true
					}
				}

				if (isMatch && !matchingIds.includes(item.id)) {
					matchingIds.push(item.id)
				}
			}

			return { matching_ids: matchingIds }
		},
		[items]
	)

	const executeGetChartData = useCallback(
		async (parameters: any) => {
			let { ids } = parameters

			if (typeof ids === 'string') {
				try {
					ids = JSON.parse(ids)
				} catch (e) {
					return { error: 'Invalid IDs format' }
				}
			}

			if (!Array.isArray(ids)) {
				return { error: 'IDs must be an array' }
			}

			const items = []

			for (const id of ids) {
				try {
					const imageData = await extractChartImage(id)

					const csvData = await extractChartCSV(id)

					items.push({
						id,
						image: imageData,
						csv_data: csvData
					})
				} catch (error) {
					items.push({
						id,
						error: `Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`
					})
				}
			}

			return { items }
		},
		[extractChartImage, extractChartCSV]
	)

	return {
		executeSearchCharts,
		executeGetChartData
	}
}
