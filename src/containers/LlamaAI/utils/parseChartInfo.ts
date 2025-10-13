export const parseChartInfo = (message: string): { count?: number; types?: string[] } => {
	const info: { count?: number; types?: string[] } = {}

	const patterns = [
		/(?:generating|creating|building|analyzing)\s+([^.]+?)\s+charts?/i,
		/(?:will create|planning)\s+([^.]+?)\s+(?:chart|visualization)/i,
		/(?:identified|detected)\s+([^.]+?)\s+chart\s+(?:opportunity|type)/i
	]

	for (const pattern of patterns) {
		const typesMatch = message.match(pattern)
		if (typesMatch) {
			const typesStr = typesMatch[1]
			const extractedTypes = typesStr
				.split(/[,\s]+/)
				.filter((type) =>
					['line', 'bar', 'area', 'combo', 'pie', 'time-series', 'timeseries'].includes(type.toLowerCase())
				)
				.map((type) => type.toLowerCase().replace('time-series', 'line').replace('timeseries', 'line'))

			if (extractedTypes.length > 0) {
				info.types = extractedTypes
				break
			}
		}
	}

	const countMatch = message.match(
		/(?:generated?|creating?|building|will create)\s*(\d+)\s+(?:charts?|visualizations?)/i
	)
	if (countMatch) {
		info.count = parseInt(countMatch[1], 10)
	}

	return info
}
