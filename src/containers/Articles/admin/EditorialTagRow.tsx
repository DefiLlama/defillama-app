import type * as React from 'react'
import { forwardRef } from 'react'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_LABELS } from '~/containers/Articles/types'

type EditorialTagRowProps = {
	article: ArticleDocument
	onRemove: () => void
	pending: boolean
	position?: number
	leading?: React.ReactNode
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'li'>, 'className'>

export const EditorialTagRow = forwardRef<HTMLLIElement, EditorialTagRowProps>(function EditorialTagRow(
	{ article, onRemove, pending, position, leading, className, ...rest },
	ref
) {
	const defaultClassName = leading
		? 'grid gap-3 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center'
		: 'grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center'

	return (
		<li ref={ref} className={className ?? defaultClassName} {...rest}>
			{leading ? (
				<div className="flex items-center gap-2 sm:col-start-1">
					{leading}
					{position != null ? (
						<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) tabular-nums">
							#{position}
						</span>
					) : null}
				</div>
			) : null}
			<div className={`grid min-w-0 gap-1${leading ? ' sm:col-start-2' : ''}`}>
				<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					{article.section ? ARTICLE_SECTION_LABELS[article.section] : 'No section'} · /{article.slug}
				</span>
				<span className="truncate text-sm text-(--text-primary)">{article.title}</span>
			</div>
			<button
				type="button"
				onClick={onRemove}
				disabled={pending}
				className={`justify-self-end rounded-md px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50${leading ? ' sm:col-start-3' : ''}`}
			>
				Remove
			</button>
		</li>
	)
})
