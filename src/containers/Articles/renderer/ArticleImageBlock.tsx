export type ArticleImageBlockAttrs = {
	src?: string | null
	alt?: string | null
	caption?: string | null
	credit?: string | null
	copyright?: string | null
	headline?: string | null
	href?: string | null
	width?: number | null
	height?: number | null
}

export function ArticleImageBlock({ attrs }: { attrs: ArticleImageBlockAttrs | null | undefined }) {
	const src = attrs?.src
	if (!src) return null
	const alt = attrs?.alt ?? ''
	const caption = (attrs?.caption ?? '').trim()
	const credit = (attrs?.credit ?? '').trim()
	const copyright = (attrs?.copyright ?? '').trim()
	const headline = (attrs?.headline ?? '').trim()
	const href = (attrs?.href ?? '').trim()
	const aspectStyle = attrs?.width && attrs?.height ? { aspectRatio: `${attrs.width} / ${attrs.height}` } : undefined
	const metaParts = [credit ? `Credit: ${credit}` : '', copyright ? `© ${copyright}` : ''].filter(Boolean)

	const imgEl = (
		<img
			src={src}
			alt={alt}
			loading="lazy"
			decoding="async"
			className="block w-full rounded-md border border-(--cards-border)"
			style={aspectStyle}
		/>
	)

	const hasMeta = headline || caption || metaParts.length > 0

	return (
		<figure className="not-prose mx-auto my-8" data-article-image>
			{href ? (
				<a href={href} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-90">
					{imgEl}
				</a>
			) : (
				imgEl
			)}
			{hasMeta ? (
				<figcaption className="mt-2 grid gap-1 text-xs leading-relaxed text-(--text-tertiary)">
					{headline ? <span className="font-medium text-(--text-secondary)">{headline}</span> : null}
					{caption ? <span>{caption}</span> : null}
					{metaParts.length > 0 ? <span className="text-(--text-tertiary)/80">{metaParts.join(' · ')}</span> : null}
				</figcaption>
			) : null}
		</figure>
	)
}
