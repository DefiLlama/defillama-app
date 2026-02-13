import { useGetChartInstance } from './useGetChartInstance'

type CsvCell = string | number | boolean

interface ChartCsv {
	filename: string
	rows: Array<Array<CsvCell>>
}

function useChartCsvExport() {
	return useGetChartInstance()
}
