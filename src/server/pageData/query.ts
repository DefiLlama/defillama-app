type QueryParamValue = string | string[] | undefined

export function getCommaSeparatedQueryParam(value: QueryParamValue): string[] {
	if (!value) return []

	const values = Array.isArray(value) ? value : [value]
	const items: string[] = []

	for (const rawValue of values) {
		for (const item of rawValue.split(',')) {
			const trimmed = item.trim()
			if (trimmed) items.push(trimmed)
		}
	}

	return items
}
