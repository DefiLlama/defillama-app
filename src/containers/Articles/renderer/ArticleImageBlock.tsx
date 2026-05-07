import type { ArticleImageWidthMode } from '../editor/nodes/ArticleImage'

const widthModeWrapClass: Record<ArticleImageWidthMode, string> = {
	default: 'mx-auto',
	wide: 'mx-auto lg:-mx-12 xl:-mx-24',
	full: 'relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2'
}

const widthModeImageClass: Record<ArticleImageWidthMode, string> = {
	default: 'rounded-md border border-(--cards-border)',
	wide: 'rounded-md border border-(--cards-border)',
	full: 'rounded-none border-y border-(--cards-border)'
}

export type ArticleImageBlockAttrs = {
	src?: string | null
	alt?: string | null
	caption?: string | null
	width?: number | null
	height?: number | null
	widthMode?: ArticleImageWidthMode | string | null
}

function normalizeWidthMode(value: unknown): ArticleImageWidthMode {
	if (value === 'wide' || value === 'full') return value
	return 'default'
}

export function ArticleImageBlock({ attrs }: { attrs: ArticleImageBlockAttrs | null | undefined }) {
	const src = attrs?.src
	if (!src) return null
	const alt = attrs?.alt ?? ''
	const caption = attrs?.caption ?? ''
	const widthMode = normalizeWidthMode(attrs?.widthMode)
	const aspectStyle = attrs?.width && attrs?.height ? { aspectRatio: `${attrs.width} / ${attrs.height}` } : undefined

	return (
		<figure
			className={`not-prose my-8 ${widthModeWrapClass[widthMode]}`}
			data-article-image
			data-width-mode={widthMode}
		>
			<img
				src={src}
				alt={alt}
				loading="lazy"
				decoding="async"
				className={`block w-full ${widthModeImageClass[widthMode]}`}
				style={aspectStyle}
			/>
			{caption ? (
				<figcaption
					className={`mt-2 text-xs leading-relaxed text-(--text-tertiary) ${
						widthMode === 'full' ? 'mx-auto max-w-[760px] px-4 sm:px-6' : ''
					}`}
				>
					{caption}
				</figcaption>
			) : null}
		</figure>
	)
}
