import { useLayoutEffect, useRef } from 'react'
import type { LocalArticleDocument } from '../types'
import type { ArticleFieldUpdater } from './ArticleEditorTypes'

type ArticleTitleFieldsProps = {
	article: LocalArticleDocument
	updateArticle: ArticleFieldUpdater
}

const titleSerif = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"

export function ArticleTitleFields({ article, updateArticle }: ArticleTitleFieldsProps) {
	const titleRef = useRef<HTMLTextAreaElement>(null)

	useLayoutEffect(() => {
		const title = titleRef.current
		if (!title) return

		title.style.height = 'auto'
		title.style.height = `${title.scrollHeight}px`
	}, [article.title])

	return (
		<div className="mb-2">
			<textarea
				ref={titleRef}
				value={article.title}
				onChange={(e) => updateArticle('title', e.target.value.replace(/\s*\n+\s*/g, ' '))}
				onKeyDown={(e) => {
					if (e.key === 'Enter') e.preventDefault()
				}}
				placeholder="Untitled research"
				aria-label="Article title"
				rows={1}
				style={{ fontFamily: titleSerif }}
				className="article-title-input block w-full resize-none overflow-hidden bg-transparent text-4xl leading-[1.05] font-semibold tracking-[-0.025em] text-(--text-primary) placeholder:text-(--text-tertiary)/60 focus:outline-none md:text-[3.25rem]"
			/>
			<input
				value={article.subtitle ?? ''}
				onChange={(e) => updateArticle('subtitle', e.target.value)}
				placeholder="Add a subtitle…"
				style={{ fontFamily: titleSerif }}
				className="mt-3 w-full bg-transparent text-lg leading-snug text-(--text-secondary) italic placeholder:text-(--text-tertiary)/60 focus:outline-none md:text-xl"
			/>
			{article.brandByline ? (
				<div className="mt-4 text-xs tracking-[0.18em] text-(--text-tertiary) uppercase">By DefiLlama Research</div>
			) : article.author ? (
				<div className="mt-4 text-xs tracking-[0.18em] text-(--text-tertiary) uppercase">
					{(() => {
						const names = [article.author, ...(article.coAuthors ?? []).map((p) => p.displayName)]
						if (names.length <= 1) return `By ${names[0]}`
						if (names.length === 2) return `By ${names[0]} and ${names[1]}`
						return `By ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
					})()}
				</div>
			) : null}
		</div>
	)
}
