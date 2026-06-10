export type ArticleImageAttrs = {
	imageId: string | null
	src: string | null
	alt: string
	caption: string
	credit: string
	copyright: string
	headline: string
	href: string
	width: number | null
	height: number | null
	uploading: boolean
	placeholderId: string | null
}

export function normalizeImageHref(value: string): string {
	const trimmed = (value ?? '').trim()
	if (!trimmed) return ''
	if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
	return `https://${trimmed}`
}
