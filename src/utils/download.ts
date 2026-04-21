import { trackUmamiEvent } from './analytics/umami'

export interface CSVDownloadOptions {
	mimeType?: string
	addTimestamp?: boolean
}

export interface DatasetCSVParams {
	data: Record<string, unknown>[]
	columns?: string[]
	columnHeaders?: Record<string, string>
	filename?: string
	filenameSuffix?: string
	addTimestamp?: boolean
}

export type CsvCell = string | number | boolean | object | null | undefined
export type CsvData = CsvCell[][] | string

export function download(filename: string, text: string): void {
	const element = document.createElement('a')
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
	element.setAttribute('download', filename)

	element.style.display = 'none'
	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}

export function downloadDataURL(filename: string, dataURL: string): void {
	const element = document.createElement('a')
	element.setAttribute('href', dataURL)
	element.setAttribute('download', filename)

	element.style.display = 'none'
	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}

function stringifyCell(cell: CsvCell): string {
	if (cell == null) return ''
	if (typeof cell === 'object') return JSON.stringify(cell)
	return String(cell)
}

export function downloadJSON(filename: string, data: CsvCell[][], options: { addTimestamp?: boolean } = {}): void {
	try {
		const [header, ...rows] = data
		if (!header) {
			download(filename, '[]')
			return
		}
		const headerStrings = header.map(stringifyCell)
		const objects = rows.map((row) => {
			const obj: Record<string, string> = {}
			for (let i = 0; i < headerStrings.length; i++) {
				obj[headerStrings[i]] = stringifyCell(row[i])
			}
			return obj
		})
		const content = JSON.stringify(objects, null, 2)

		trackUmamiEvent('export-json-success', { filename })

		let finalFilename = filename
		if (options.addTimestamp && !filename.includes(new Date().toISOString().split('T')[0])) {
			const extension = filename.split('.').pop()
			const nameWithoutExt = filename.replace(`.${extension}`, '')
			finalFilename = `${nameWithoutExt}_${new Date().toISOString().split('T')[0]}.${extension}`
		}

		const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
		const downloadUrl = window.URL.createObjectURL(blob)

		const link = document.createElement('a')
		link.href = downloadUrl
		link.download = finalFilename
		link.style.display = 'none'

		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)

		window.URL.revokeObjectURL(downloadUrl)
	} catch (error) {
		console.log('JSON download error:', error)
	}
}

export type DownloadFormat = 'csv' | 'json'

export function downloadTabular(
	format: DownloadFormat,
	filename: string,
	data: CsvCell[][],
	options: { addTimestamp?: boolean } = {}
): void {
	const base = filename.replace(/\.(csv|json)$/i, '')
	if (format === 'json') {
		downloadJSON(`${base}.json`, data, options)
	} else {
		downloadCSV(`${base}.csv`, data, options)
	}
}

export function downloadCSV(filename: string, csvData: CsvData, options: CSVDownloadOptions = {}): void {
	try {
		const { mimeType = 'text/csv;charset=utf-8;', addTimestamp = false } = options

		let csvContent: string

		if (Array.isArray(csvData)) {
			csvContent = csvData
				.map((row) =>
					row
						.map((cell) => {
							if (cell == null) return ''
							if (typeof cell === 'object') return JSON.stringify(cell)
							const cellStr = String(cell)
							if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
								return `"${cellStr.replace(/"/g, '""')}"`
							}
							return cellStr
						})
						.join(',')
				)
				.join('\n')
		} else {
			csvContent = String(csvData)
		}

		trackUmamiEvent('export-csv-success', { filename })

		let finalFilename = filename
		if (addTimestamp && !filename.includes(new Date().toISOString().split('T')[0])) {
			const extension = filename.split('.').pop()
			const nameWithoutExt = filename.replace(`.${extension}`, '')
			finalFilename = `${nameWithoutExt}_${new Date().toISOString().split('T')[0]}.${extension}`
		}

		const blob = new Blob([csvContent], { type: mimeType })
		const downloadUrl = window.URL.createObjectURL(blob)

		const link = document.createElement('a')
		link.href = downloadUrl
		link.download = finalFilename
		link.style.display = 'none'

		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)

		window.URL.revokeObjectURL(downloadUrl)
	} catch (error) {
		console.log('CSV download error:', error)
		download(filename, String(csvData))
	}
}
