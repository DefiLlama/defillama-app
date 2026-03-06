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
