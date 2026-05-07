export type ArticleImageBlockAttrs = {
	src?: string | null
	alt?: string | null
	caption?: string | null
	href?: string | null
	width?: number | null
	height?: number | null
}

export function ArticleImageBlock({ attrs }: { attrs: ArticleImageBlockAttrs | null | undefined }) {
	const src = attrs?.src
	if (!src) return null
	const alt = attrs?.alt ?? ''
	const caption = attrs?.caption ?? ''
	const href = (attrs?.href ?? '').trim()
	const aspectStyle =
		attrs?.width && attrs?.height ? { aspectRatio: `${attrs.width} / ${attrs.height}` } : undefined

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

	return (
		<figure className="not-prose mx-auto my-8" data-article-image>
			{href ? (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="block transition-opacity hover:opacity-90"
				>
					{imgEl}
				</a>
			) : (
				imgEl
			)}
			{caption ? (
				<figcaption className="mt-2 text-xs leading-relaxed text-(--text-tertiary)">{caption}</figcaption>
			) : null}
		</figure>
	)
}
