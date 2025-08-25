import { useState, useCallback } from 'react'
import { downloadCSV as downloadCSVUtil, downloadDatasetCSV as downloadDatasetCSVUtil } from '~/utils'
import { downloadChart as downloadChartUtil } from '~/components/ECharts/utils'

export function useCSVDownload() {
	const [isLoading, setIsLoading] = useState(false)

	const downloadCSV = useCallback((filename: string, csvData: any, options: any = {}) => {
		return downloadCSVUtil(filename, csvData, {
			...options,
			onLoadingStart: () => setIsLoading(true),
			onLoadingEnd: () => setIsLoading(false),
			onError: () => setIsLoading(false)
		})
	}, [])

	const downloadDatasetCSV = useCallback((options: any) => {
		return downloadDatasetCSVUtil({
			...options,
			onLoadingStart: () => setIsLoading(true),
			onLoadingEnd: () => setIsLoading(false),
			onError: () => setIsLoading(false)
		})
	}, [])

	const downloadChart = useCallback((data: any, filename: string, options: any = {}) => {
		return downloadChartUtil(data, filename, {
			...options,
			onLoadingStart: () => setIsLoading(true),
			onLoadingEnd: () => setIsLoading(false),
			onError: () => setIsLoading(false)
		})
	}, [])

	return {
		isLoading,
		downloadCSV,
		downloadDatasetCSV,
		downloadChart
	}
}