import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ArticlePicker } from '~/containers/Articles/admin/ArticlePicker'
import {
	ArticleApiError,
	listArticlesByTag,
	setEditorialTag,
	unsetEditorialTag,
	updateEditorialTagMetadata,
	updateReportHighlightSponsorLogo,
	type ArticleByTagResponse
} from '~/containers/Articles/api'
import { EDITORIAL_TAG_LIST, type EditorialTagDefinition } from '~/containers/Articles/editorialTags'
import type { ArticleDocument, ArticleImage } from '~/containers/Articles/types'
import { ARTICLE_SECTION_LABELS } from '~/containers/Articles/types'
import { ImageUploadButton } from '~/containers/Articles/upload/ImageUploadButton'
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

	const { data, isLoading, error } = useQuery<ArticleByTagResponse>({
		queryKey: ['research', 'admin', 'editorial-tag', definition.slug],
		queryFn: () => listArticlesByTag(definition.slug, limit, authorizedFetch),
		retry: false
	})

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ['research', 'admin', 'editorial-tag', definition.slug] })
		queryClient.invalidateQueries({ queryKey: ['research', 'by-tag', definition.slug] })
		queryClient.invalidateQueries({ queryKey: ['research-landing'] })
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
					listArticlesParams={
						definition.slug === 'report-highlight' || definition.slug === 'reports-hero'
							? { section: 'report' }
							: undefined
					}
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

			{definition.slug === 'report-highlight' && items[0] ? (
				<ReportHighlightControls article={items[0]} pending={pending} invalidate={invalidate} />
			) : null}
		</section>
	)
}

function ReportHighlightControls({
	article,
	pending,
	invalidate
}: {
	article: ArticleDocument
	pending: boolean
	invalidate: () => void
}) {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const currentText = article.editorialTagMetadata?.highlightText ?? ''
	const [highlightText, setHighlightText] = useState(currentText)
	const [sponsorLogo, setSponsorLogo] = useState<ArticleImage | null>(article.sponsorLogo ?? null)

	useEffect(() => {
		setHighlightText(article.editorialTagMetadata?.highlightText ?? '')
		setSponsorLogo(article.sponsorLogo ?? null)
	}, [article.id, article.editorialTagMetadata?.highlightText, article.sponsorLogo])

	const textDirty = highlightText.trim() !== currentText.trim()
	const previewText =
		highlightText.trim() ||
		article.reportDescription?.trim() ||
		article.excerpt?.trim() ||
		article.subtitle?.trim() ||
		''

	const metadataMutation = useMutation({
		mutationFn: (nextText: string) =>
			updateEditorialTagMetadata(
				article.id,
				'report-highlight',
				{ highlightText: nextText.trim() || null },
				authorizedFetch
			),
		onSuccess: (result) => {
			setHighlightText(result.metadata.highlightText ?? '')
			invalidate()
			toast.success('Highlight text saved')
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to save highlight text')
		}
	})

	const logoMutation = useMutation({
		mutationFn: (nextLogo: ArticleImage | null) =>
			updateReportHighlightSponsorLogo(article.id, nextLogo, authorizedFetch),
		onSuccess: (updated) => {
			setSponsorLogo(updated.sponsorLogo ?? null)
			invalidate()
			queryClient.invalidateQueries({ queryKey: ['research', 'admin', 'reports'] })
			toast.success('Sponsor logo updated')
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to update sponsor logo')
		}
	})

	return (
		<div className="grid gap-4 border-t border-(--cards-border) pt-4">
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
				<label className="grid gap-1.5">
					<span className="flex items-baseline justify-between gap-2 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
						<span>Highlight text</span>
						<span>{highlightText.length}/600</span>
					</span>
					<textarea
						value={highlightText}
						onChange={(event) => setHighlightText(event.target.value.slice(0, 600))}
						placeholder="Custom text shown on the right side of the Report highlight block."
						rows={4}
						maxLength={600}
						className="resize-none rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
					/>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							disabled={!textDirty || pending || metadataMutation.isPending}
							onClick={() => metadataMutation.mutate(highlightText)}
							className="rounded-md border border-(--cards-border) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
						>
							{metadataMutation.isPending ? 'Saving…' : 'Save highlight text'}
						</button>
						{currentText ? (
							<button
								type="button"
								disabled={pending || metadataMutation.isPending}
								onClick={() => {
									setHighlightText('')
									metadataMutation.mutate('')
								}}
								className="rounded-md px-2.5 py-1.5 text-xs text-(--text-tertiary) transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Clear override
							</button>
						) : null}
					</div>
				</label>

				<div className="grid content-start gap-1.5">
					<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
						Sponsor logo
					</span>
					<ImageUploadButton
						scope="report-sponsor-logo"
						articleId={article.id}
						currentUrl={sponsorLogo?.url ?? null}
						label="sponsor logo"
						previewShape="square"
						helperText={
							logoMutation.isPending ? 'Updating highlighted report…' : 'Updates the live highlighted report.'
						}
						onUploaded={(result) =>
							logoMutation.mutate({
								url: result.url,
								width: result.width,
								height: result.height
							})
						}
						onCleared={() => logoMutation.mutate(null)}
					/>
				</div>
			</div>

			<div className="grid gap-2 bg-(--app-bg)/40 p-3">
				<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					Current highlight
				</span>
				<div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start">
					<div className="grid gap-2">
						{sponsorLogo?.url ? (
							<div className="flex items-center gap-2">
								<span className="text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">Sponsored by</span>
								<img src={sponsorLogo.url} alt="" className="h-5 max-w-24 object-contain" />
							</div>
						) : null}
						<span className="text-sm font-semibold text-(--text-primary)">{article.title}</span>
					</div>
					<p className="line-clamp-4 text-sm leading-relaxed text-(--text-secondary)">
						{previewText || 'No highlight text, report description, excerpt, or subtitle set.'}
					</p>
				</div>
			</div>
		</div>
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
				className="justify-self-end rounded-md px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
			>
				Remove
			</button>
		</li>
	)
}
