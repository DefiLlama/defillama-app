import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
	ArticleApiError,
	listArticlesByTag,
	setEditorialTag,
	unsetEditorialTag,
	type ArticleByTagResponse
} from '~/containers/Articles/api'
import { ArticlePicker } from '~/containers/Articles/admin/ArticlePicker'
import { EDITORIAL_TAG_LIST, type EditorialTagDefinition } from '~/containers/Articles/editorialTags'
import type { ArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_LABELS } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'

export function EditorialTagsView() {
	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-1 pb-16">
			<header className="pt-2 pb-2">
				<Link
					href="/research/admin"
					className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
				>
					<span aria-hidden>←</span> Admin
				</Link>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--text-primary)">Curation</h1>
				<p className="mt-1 text-sm text-(--text-secondary)">
					Pick which published articles surface in editor-curated widgets on /research.
				</p>
			</header>

			<div className="grid gap-8">
				{EDITORIAL_TAG_LIST.map((definition) => (
					<EditorialTagSection key={definition.slug} definition={definition} />
				))}
			</div>
		</div>
	)
}

function EditorialTagSection({ definition }: { definition: EditorialTagDefinition }) {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const limit = definition.cardinality === 'singleton' ? 1 : 30

	const {
		data,
		isLoading,
		error
	} = useQuery<ArticleByTagResponse>({
		queryKey: ['research', 'admin', 'editorial-tag', definition.slug],
		queryFn: () => listArticlesByTag(definition.slug, limit, authorizedFetch),
		retry: false
	})

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ['research', 'admin', 'editorial-tag', definition.slug] })
		queryClient.invalidateQueries({ queryKey: ['research', 'by-tag', definition.slug] })
	}

	const setMutation = useMutation({
		mutationFn: (articleId: string) => setEditorialTag(articleId, definition.slug, authorizedFetch),
		onSuccess: () => {
			invalidate()
			toast.success(`Added to ${definition.label}`)
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : `Failed to update ${definition.label}`)
		}
	})

	const unsetMutation = useMutation({
		mutationFn: (articleId: string) => unsetEditorialTag(articleId, definition.slug, authorizedFetch),
		onSuccess: () => {
			invalidate()
			toast.success(`Removed from ${definition.label}`)
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : `Failed to update ${definition.label}`)
		}
	})

	const items = data?.items ?? []
	const pending = setMutation.isPending || unsetMutation.isPending

	return (
		<section className="grid gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
			<header className="grid gap-2 sm:flex sm:items-end sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-xl font-semibold text-(--text-primary)">{definition.label}</h2>
						<span className="inline-flex items-center rounded-full bg-(--link-button) px-2 py-0.5 font-jetbrains text-[9px] tracking-[0.18em] text-(--link-text) uppercase">
							{definition.cardinality === 'singleton' ? '1 article' : 'Many articles'}
						</span>
					</div>
					<p className="mt-1 text-sm text-(--text-secondary)">{definition.description}</p>
				</div>
				<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
					Current · {items.length}
				</span>
			</header>

			<div className="grid gap-1.5">
				<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					{definition.cardinality === 'singleton' ? 'Set article' : 'Add article'}
				</span>
				<ArticlePicker
					value={null}
					onChange={(article) => {
						if (!article || pending) return
						setMutation.mutate(article.id)
					}}
					hint={
						definition.cardinality === 'singleton'
							? 'Picking an article replaces the current Spotlight.'
							: 'Pick an article to add to this list. Already-tagged articles are skipped.'
					}
				/>
			</div>

			{error ? (
				<p className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-500">
					{error instanceof ArticleApiError ? error.message : `Failed to load ${definition.label}`}
				</p>
			) : isLoading ? (
				<p className="text-sm text-(--text-tertiary)">Loading…</p>
			) : items.length === 0 ? (
				<p className="rounded-md border border-dashed border-(--cards-border) bg-(--app-bg)/40 px-3 py-3 text-center text-xs text-(--text-tertiary)">
					No articles tagged as {definition.label.toLowerCase()} yet.
				</p>
			) : (
				<ul className="grid divide-y divide-(--cards-border) overflow-hidden rounded-md border border-(--cards-border) bg-(--app-bg)/40">
					{items.map((article) => (
						<EditorialTagRow
							key={article.id}
							article={article}
							onRemove={() => {
								if (pending) return
								unsetMutation.mutate(article.id)
							}}
							pending={pending}
						/>
					))}
				</ul>
			)}
		</section>
	)
}

function EditorialTagRow({
	article,
	onRemove,
	pending
}: {
	article: ArticleDocument
	onRemove: () => void
	pending: boolean
}) {
	return (
		<li className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
			<div className="grid min-w-0 gap-1">
				<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					{article.section ? ARTICLE_SECTION_LABELS[article.section] : 'No section'} · /{article.slug}
				</span>
				<span className="truncate text-sm text-(--text-primary)">{article.title}</span>
			</div>
			<button
				type="button"
				onClick={onRemove}
				disabled={pending}
				className="rounded-md px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50 justify-self-end"
			>
				Remove
			</button>
		</li>
	)
}
