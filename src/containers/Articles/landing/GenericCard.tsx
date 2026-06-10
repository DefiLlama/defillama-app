import Link from 'next/link'
import { articleHref, formatDate, readingMinutes } from '~/containers/Articles/landing/utils'
import type { ArticleDocument } from '~/containers/Articles/types'

export function GenericCard({ article }: { article: ArticleDocument }) {
	const cover = article.coverImage?.url || null
	const primaryTag = article.tags?.[0]
	return (
		<Link
			href={articleHref(article)}
			className="group grid content-start gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)/40 p-4 transition-colors hover:border-(--link-text)/40"
		>
			<div className="flex items-center justify-between gap-3 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
				<span>{primaryTag?.replace(/-/g, ' ') || 'Story'}</span>
				<span className="tabular-nums">{readingMinutes(article)} min</span>
			</div>
			{cover ? (
				<div className="aspect-[16/9] w-full overflow-hidden">
					<img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
				</div>
			) : null}
			<h3 className="text-base leading-snug font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text)">
				{article.title}
			</h3>
			{article.excerpt || article.subtitle ? (
				<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
					{article.excerpt || article.subtitle}
				</p>
			) : null}
			<span className="flex items-center gap-2 text-xs text-(--text-tertiary)">
				{article.brandByline ? (
					<>
						<span className="font-medium text-(--text-secondary)">DefiLlama Research</span>
						<span aria-hidden>·</span>
					</>
				) : article.authorProfile?.displayName ? (
					<>
						<span className="font-medium text-(--text-secondary)">{article.authorProfile.displayName}</span>
						<span aria-hidden>·</span>
					</>
				) : null}
				<span>{formatDate(article.displayDate ?? article.publishedAt)}</span>
			</span>
		</Link>
	)
}
