export type ArticlePeoplePanelItem = {
	imageId: string | null
	src: string | null
	width: number | null
	height: number | null
	name: string
	bio: string
	href: string
}

export type ArticlePeoplePanelConfig = {
	label: string
	items: ArticlePeoplePanelItem[]
}

export function normalizePeopleHref(value: string): string {
	const trimmed = (value ?? '').trim()
	if (!trimmed) return ''
	if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
	return `https://${trimmed}`
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asNullableString(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null
}

export function makeEmptyPeoplePanelItem(): ArticlePeoplePanelItem {
	return { imageId: null, src: null, width: null, height: null, name: '', bio: '', href: '' }
}

export function makeEmptyPeoplePanelConfig(): ArticlePeoplePanelConfig {
	return { label: '', items: [makeEmptyPeoplePanelItem()] }
}

export function validateArticlePeoplePanel(value: unknown): ArticlePeoplePanelConfig | null {
	if (!value || typeof value !== 'object') return null
	const raw = value as Record<string, unknown>
	const itemsRaw = Array.isArray(raw.items) ? raw.items : []
	const items: ArticlePeoplePanelItem[] = []
	for (const entry of itemsRaw) {
		if (!entry || typeof entry !== 'object') continue
		const e = entry as Record<string, unknown>
		const src = asNullableString(e.src)
		if (!src) continue
		items.push({
			imageId: asNullableString(e.imageId),
			src,
			width: asNumber(e.width),
			height: asNumber(e.height),
			name: asString(e.name).trim(),
			bio: asString(e.bio).trim(),
			href: normalizePeopleHref(asString(e.href))
		})
	}
	if (items.length === 0) return null
	return {
		label: asString(raw.label).trim(),
		items
	}
}
