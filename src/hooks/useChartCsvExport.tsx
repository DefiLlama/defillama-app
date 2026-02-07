import { useGetChartInstance } from './useGetChartInstance'

export type CsvCell = string | number | boolean

export interface ChartCsv {
	filename: string
	rows: Array<Array<CsvCell>>
}

export function useChartCsvExport() {
	return useGetChartInstance()
}
