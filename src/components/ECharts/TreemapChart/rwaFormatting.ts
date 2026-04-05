type TreemapPathInfo = Array<{ name?: unknown }>

export function normalizeTreemapValue(rawValue: unknown): Array<number | null> {
	if (Array.isArray(rawValue)) {
		const value: Array<number | null> = rawValue.map((item) => {
			if (item == null) return null
			const parsed = typeof item === 'number' ? item : Number(item)
			return Number.isFinite(parsed) ? parsed : null
		})
		while (value.length < 3) value.push(null)
		value[0] = value[0] ?? 0
		return value
	}

	if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
		return [rawValue, null, null]
	}

	return [0, null, null]
}

function formatPct(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(n) ? Number(n.toFixed(2)) : 0
}

function getTreemapPath(treePathInfo: unknown): string[] {
	if (!Array.isArray(treePathInfo)) return []

	const treePath: string[] = []
	for (let i = 1; i < treePathInfo.length; i++) {
		const name = treePathInfo[i]?.name
		if (typeof name === 'string' && name.length > 0) treePath.push(name)
	}

	return treePath
}

function getName(value: unknown): string {
	return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
}

export function formatRwaUpperLabel(params: { name?: unknown }) {
	return getName(params?.name)
}

export function formatRwaTreemapBoxLabel(params: { name?: unknown }) {
	return getName(params?.name)
}

export function formatRwaTreemapTooltip({
	info,
	valueLabel,
	formatMetricValue
}: {
	info: { treePathInfo?: TreemapPathInfo; value?: unknown; name?: unknown }
	valueLabel: string
	formatMetricValue: (value: number) => string
}) {
	const treePath = getTreemapPath(info?.treePathInfo)
	const normalizedValue = normalizeTreemapValue(info?.value)
	const metricValue = formatMetricValue(normalizedValue[0])
	const shareOfParent = formatPct(normalizedValue[1])
	const shareOfTotal = formatPct(normalizedValue[2])

	if (treePath.length >= 2) {
		const parent = treePath[treePath.length - 2]
		const child = treePath[treePath.length - 1]
		return [
			`Parent: ${parent}<br>`,
			`Child: ${child}<br>`,
			`${valueLabel}: ${metricValue}<br>`,
			`Share of Parent: ${shareOfParent}%<br>`,
			`Share of Total: ${shareOfTotal}%<br>`
		].join('')
	}

	if (treePath.length === 1) {
		return [`${treePath[0]}<br>`, `${valueLabel}: ${metricValue}<br>`, `Share of Total: ${shareOfTotal}%<br>`].join('')
	}

	const rootLabel = getName(info?.name) || 'RWA'
	return [`${rootLabel}<br>`, `${valueLabel}: ${metricValue}<br>`].join('')
}
