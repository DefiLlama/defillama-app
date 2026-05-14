import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
	ArticleApiError,
	listArticles,
	publishArticle,
	updateArticleReportFields,
	type ReportFieldsPatch
} from '~/containers/Articles/api'
import type { ArticleDocument, ArticleImage, ArticlePdf } from '~/containers/Articles/types'
import { ImageUploadButton } from '~/containers/Articles/upload/ImageUploadButton'
import { PdfUploadButton } from '~/containers/Articles/upload/PdfUploadButton'
import { useAuthContext } from '~/containers/Subscription/auth'

function formatSize(bytes: number | undefined | null): string {
	if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '—'
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function articleEditHref(article: ArticleDocument): string {
	return `/research/edit/${encodeURIComponent(article.id)}`
}

type RowState = {
	reportPdf: ArticlePdf | null
	carouselImage: ArticleImage | null
	sponsorLogo: ArticleImage | null
	reportDescription: string
}

function rowStateFromArticle(article: ArticleDocument): RowState {
	return {
		reportPdf: article.reportPdf ?? null,
		carouselImage: article.carouselImage ?? null,
		sponsorLogo: article.sponsorLogo ?? null,
		reportDescription: article.reportDescription ?? ''
	}
}

function isRowDirty(state: RowState, article: ArticleDocument): boolean {
	if ((state.reportPdf?.id ?? null) !== (article.reportPdf?.id ?? null)) return true
	if ((state.carouselImage?.url ?? null) !== (article.carouselImage?.url ?? null)) return true
	if ((state.sponsorLogo?.url ?? null) !== (article.sponsorLogo?.url ?? null)) return true
	if ((state.reportDescription || '').trim() !== (article.reportDescription || '').trim()) return true
	return false
}

function buildPatch(state: RowState): ReportFieldsPatch {
	const description = state.reportDescription.trim()
	return {
		reportPdf: state.reportPdf,
		carouselImage: state.carouselImage,
		sponsorLogo: state.sponsorLogo,
		reportDescription: description.length > 0 ? description : null
	}
}

function ReportRow({ article }: { article: ArticleDocument }) {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const [state, setState] = useState<RowState>(() => rowStateFromArticle(article))

	useEffect(() => {
		setState(rowStateFromArticle(article))
	}, [
		article.id,
		article.reportPdf?.id,
		article.carouselImage?.url,
		article.sponsorLogo?.url,
		article.reportDescription
	])

	const dirty = isRowDirty(state, article)
	const isPublished = article.status === 'published'
	const hasPending = article.pending != null

	const saveMutation = useMutation({
		mutationFn: () => updateArticleReportFields(article.id, buildPatch(state), authorizedFetch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['research', 'admin', 'reports'] })
			toast.success(isPublished ? 'Saved — publish to push live' : 'Saved')
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to save')
		}
	})

	const publishMutation = useMutation({
		mutationFn: async () => {
			if (dirty) {
				await updateArticleReportFields(article.id, buildPatch(state), authorizedFetch)
			}
			return publishArticle(article.id, authorizedFetch)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['research', 'admin', 'reports'] })
			toast.success('Published')
		},
		onError: (err) => {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to publish')
		}
	})

	const isMutating = saveMutation.isPending || publishMutation.isPending

	return (
		<li className="grid gap-4 px-4 py-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-jetbrains text-[9px] tracking-[0.18em] uppercase ${
								isPublished ? 'bg-emerald-500/10 text-emerald-500' : 'bg-(--text-tertiary)/10 text-(--text-tertiary)'
							}`}
						>
							<span aria-hidden className="h-1 w-1 rounded-full bg-current" />
							{isPublished ? 'Live' : 'Draft'}
						</span>
						{hasPending ? (
							<span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 font-jetbrains text-[9px] tracking-[0.18em] text-amber-500 uppercase">
								Pending edits
							</span>
						) : null}
					</div>
					<Link
						href={articleEditHref(article)}
						className="mt-1 block truncate text-base font-semibold text-(--text-primary) hover:text-(--link-text)"
					>
						{article.title}
					</Link>
					<p className="font-jetbrains text-[10px] tracking-[0.16em] text-(--text-tertiary) uppercase">
						/research/report/{article.slug}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						disabled={!dirty || isMutating}
						onClick={() => saveMutation.mutate()}
						className="rounded-md border border-(--cards-border) px-3 py-1.5 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saveMutation.isPending ? 'Saving…' : 'Save'}
					</button>
					{isPublished ? (
						<button
							type="button"
							disabled={isMutating || (!dirty && !hasPending)}
							onClick={() => publishMutation.mutate()}
							className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{publishMutation.isPending ? 'Publishing…' : 'Save & publish'}
						</button>
					) : null}
					<Link
						href={articleEditHref(article)}
						className="rounded-md px-2.5 py-1.5 text-xs text-(--text-tertiary) transition-colors hover:text-(--link-text)"
					>
						Open editor →
					</Link>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
				<div className="grid gap-1.5">
					<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">PDF</span>
					<PdfUploadButton
						articleId={article.id}
						currentPdf={state.reportPdf}
						onUploaded={(result) =>
							setState((prev) => ({
								...prev,
								reportPdf: {
									id: result.id,
									url: result.url,
									sizeBytes: result.sizeBytes,
									...(result.originalName ? { originalName: result.originalName } : {})
								}
							}))
						}
						onCleared={() => setState((prev) => ({ ...prev, reportPdf: null }))}
					/>
				</div>
				<div className="grid gap-1.5">
					<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
						Carousel image
					</span>
					<ImageUploadButton
						scope="report-carousel"
						articleId={article.id}
						currentUrl={state.carouselImage?.url ?? null}
						label="carousel image"
						previewShape="wide"
						onUploaded={(result) =>
							setState((prev) => ({
								...prev,
								carouselImage: {
									url: result.url,
									width: result.width,
									height: result.height
								}
							}))
						}
						onCleared={() => setState((prev) => ({ ...prev, carouselImage: null }))}
					/>
				</div>
				<div className="grid gap-1.5">
					<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
						Sponsor logo
					</span>
					<ImageUploadButton
						scope="report-sponsor-logo"
						articleId={article.id}
						currentUrl={state.sponsorLogo?.url ?? null}
						label="sponsor logo"
						previewShape="square"
						onUploaded={(result) =>
							setState((prev) => ({
								...prev,
								sponsorLogo: {
									url: result.url,
									width: result.width,
									height: result.height
								}
							}))
						}
						onCleared={() => setState((prev) => ({ ...prev, sponsorLogo: null }))}
					/>
				</div>
			</div>

			<label className="grid gap-1.5">
				<span className="flex items-baseline justify-between gap-2 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					<span>Description</span>
					<span className="text-(--text-tertiary)">{state.reportDescription.length}/600</span>
				</span>
				<textarea
					value={state.reportDescription}
					onChange={(event) => setState((prev) => ({ ...prev, reportDescription: event.target.value.slice(0, 600) }))}
					placeholder="Shown on hover over the report card on /research."
					rows={3}
					maxLength={600}
					className="resize-none rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
				/>
			</label>
		</li>
	)
}

type StatusFilter = 'all' | 'published' | 'draft'

export function ReportsAdminView() {
	const { authorizedFetch } = useAuthContext()
	const [filter, setFilter] = useState<StatusFilter>('all')

	const {
		data: reports,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'admin', 'reports'],
		queryFn: async () => {
			const response = await listArticles({ section: 'report', limit: 100 }, authorizedFetch)
			return response.items
		},
		retry: false
	})

	if (isLoading) {
		return <div className="mx-auto py-24 text-center text-sm text-(--text-tertiary)">Loading…</div>
	}

	if (error) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load reports'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load reports</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
			</div>
		)
	}

	const all = reports ?? []
	const filtered = filter === 'all' ? all : all.filter((a) => a.status === filter)

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-6 px-1 pb-16">
			<header className="flex flex-wrap items-end justify-between gap-3 pt-2 pb-2">
				<div>
					<Link
						href="/research/admin"
						className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
					>
						<span aria-hidden>←</span> Admin
					</Link>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--text-primary)">Reports</h1>
					<p className="mt-1 text-sm text-(--text-secondary)">
						Attach a PDF, carousel image, sponsor logo, and description to each Report article. Changes to published
						reports go to a pending revision — use <span className="font-medium">Save &amp; publish</span> to push them
						live.
					</p>
				</div>
				<div className="inline-flex overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) text-xs">
					{(['all', 'published', 'draft'] as const).map((value) => (
						<button
							key={value}
							type="button"
							onClick={() => setFilter(value)}
							className={`px-3 py-1.5 transition-colors ${
								filter === value
									? 'bg-(--link-button) text-(--link-text)'
									: 'text-(--text-secondary) hover:text-(--text-primary)'
							}`}
						>
							{value === 'all' ? 'All' : value === 'published' ? 'Published' : 'Drafts'}
						</button>
					))}
				</div>
			</header>

			{filtered.length === 0 ? (
				<div className="rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg) p-10 text-center">
					<p className="text-sm text-(--text-secondary)">
						{all.length === 0 ? 'No Report articles yet.' : 'No reports match this filter.'}
					</p>
				</div>
			) : (
				<ul className="grid divide-y divide-(--cards-border) overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{filtered.map((article) => (
						<ReportRow key={article.id} article={article} />
					))}
				</ul>
			)}
		</div>
	)
}
