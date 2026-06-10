import { useMemo } from 'react'
import { ArticleRenderer } from '../renderer/ArticleRenderer'
import type { LocalArticleDocument } from '../types'
import { ARTICLE_SECTION_SLUGS } from '../types'
import { Icon } from './ArticleEditorIcon'

type ArticleEditorPreviewProps = {
	article: LocalArticleDocument
	articleViewHref: string
	isDirty: boolean
	onEdit: () => void
	readMins: number
	wordCount: number
}

function articlePreviewShareUrl(article: LocalArticleDocument) {
	const path = article.section
		? `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`
		: `/research/${article.slug}`

	if (typeof window === 'undefined') return path
	return `${window.location.origin}${path}`
}

export function ArticleEditorPreview({
	article,
	articleViewHref,
	isDirty,
	onEdit,
	readMins,
	wordCount
}: ArticleEditorPreviewProps) {
	const shareUrl = useMemo(() => articlePreviewShareUrl(article), [article])
	const canOpenLive = article.status === 'published' && article.section && article.slug

	return (
		<section className="article-editor-preview relative left-1/2 mt-5 -translate-x-1/2 border-t border-(--cards-border)">
			<div className="sticky top-0 z-30 border-b border-(--cards-border) bg-(--app-bg)/95 backdrop-blur supports-[backdrop-filter]:bg-(--app-bg)/82">
				<div className="mx-auto flex w-full max-w-[1300px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
					<div className="flex min-w-[min(100%,18rem)] flex-1 items-start gap-3">
						<div className="grid size-9 shrink-0 place-items-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<Icon name="eye" className="size-4 text-(--link-text)" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="font-jetbrains text-[10px] font-medium tracking-[0.24em] text-(--text-tertiary) uppercase">
								Rendered proof
							</div>
							<div className="text-sm leading-snug font-medium break-words text-(--text-primary)" title={article.title}>
								{article.title || 'Untitled research'}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="hidden items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-2.5 py-1.5 font-jetbrains text-[10px] tracking-wider whitespace-nowrap text-(--text-tertiary) uppercase sm:flex">
							<span>{wordCount.toLocaleString()} words</span>
							<span aria-hidden className="h-3 w-px bg-(--cards-border)" />
							<span>{readMins} min</span>
							{isDirty ? (
								<>
									<span aria-hidden className="h-3 w-px bg-(--cards-border)" />
									<span className="text-amber-600 dark:text-amber-400">Unsaved</span>
								</>
							) : null}
						</div>

						{canOpenLive ? (
							<a
								href={articleViewHref}
								target="_blank"
								rel="noreferrer"
								className="hidden h-9 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) sm:flex"
							>
								<Icon name="external" className="size-3.5" />
								<span>Live</span>
							</a>
						) : null}

						<button
							type="button"
							onClick={onEdit}
							className="flex h-9 items-center gap-1.5 rounded-md bg-(--link-text) px-3.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
						>
							<Icon name="pencil" className="size-3.5" />
							<span>Edit</span>
						</button>
					</div>
				</div>
			</div>

			<div className="article-editor-preview-stage">
				<div className="article-editor-preview-proof mx-auto w-full">
					<ArticleRenderer article={article} hideSidePanel shareUrlOverride={shareUrl} />
				</div>
			</div>
		</section>
	)
}
