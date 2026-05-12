import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { ArticlePicker } from '~/containers/Articles/admin/ArticlePicker'
import { ArticleApiError, createBanner, deleteBanner, updateBanner } from '~/containers/Articles/api'
import type { ArticleSection, Banner, BannerPayload, BannerScope } from '~/containers/Articles/types'
import {
	ARTICLE_SECTIONS,
	ARTICLE_SECTION_LABELS,
	BANNER_SCOPES,
	BANNER_SCOPE_LABELS
} from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'

const TEXT_MAX = 500
const LINK_URL_MAX = 2000
const LINK_LABEL_MAX = 64

type FormState = {
	scope: BannerScope
	section: ArticleSection | ''
	articleId: string | null
	text: string
	linkUrl: string
	linkLabel: string
	enabled: boolean
}

function bannerToForm(banner: Banner | null): FormState {
	if (!banner) {
		return {
			scope: 'landing',
			section: '',
			articleId: null,
			text: '',
			linkUrl: '',
			linkLabel: '',
			enabled: true
		}
	}
	return {
		scope: banner.scope,
		section: banner.section ?? '',
		articleId: banner.articleId,
		text: banner.text,
		linkUrl: banner.linkUrl ?? '',
		linkLabel: banner.linkLabel ?? '',
		enabled: banner.enabled
	}
}

function buildPayload(state: FormState): BannerPayload {
	return {
		scope: state.scope,
		section: state.scope === 'section' ? (state.section as ArticleSection) : null,
		articleId: state.scope === 'article' ? state.articleId : null,
		text: state.text.trim(),
		linkUrl: state.linkUrl.trim() ? state.linkUrl.trim() : null,
		linkLabel: state.linkLabel.trim() ? state.linkLabel.trim() : null,
		enabled: state.enabled
	}
}

function validate(state: FormState) {
	const errors: { text?: string; section?: string; articleId?: string; linkUrl?: string } = {}
	if (!state.text.trim()) errors.text = 'Banner text is required'
	if (state.text.length > TEXT_MAX) errors.text = `Max ${TEXT_MAX} characters`
	if (state.scope === 'section' && !state.section) errors.section = 'Pick a section'
	if (state.scope === 'article' && !state.articleId) errors.articleId = 'Pick an article'
	const link = state.linkUrl.trim()
	if (link && !/^(https?:\/\/|\/)/.test(link)) {
		errors.linkUrl = 'Must start with http://, https://, or /'
	}
	return errors
}

type Props = {
	banner: Banner | null
}

export function BannerForm({ banner }: Props) {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()
	const [state, setState] = useState<FormState>(() => bannerToForm(banner))
	const initial = useMemo(() => bannerToForm(banner), [banner])

	useEffect(() => {
		setState(bannerToForm(banner))
	}, [banner])

	const errors = validate(state)
	const hasError = Object.keys(errors).length > 0

	const dirty =
		state.scope !== initial.scope ||
		state.section !== initial.section ||
		state.articleId !== initial.articleId ||
		state.text !== initial.text ||
		state.linkUrl !== initial.linkUrl ||
		state.linkLabel !== initial.linkLabel ||
		state.enabled !== initial.enabled

	const saveMutation = useMutation({
		mutationFn: async () => {
			const payload = buildPayload(state)
			if (banner) return updateBanner(banner.id, payload, authorizedFetch)
			return createBanner(payload, authorizedFetch)
		}
	})

	const deleteMutation = useMutation({
		mutationFn: async () => {
			if (!banner) return
			await deleteBanner(banner.id, authorizedFetch)
		}
	})

	const update = (patch: Partial<FormState>) => setState((prev) => ({ ...prev, ...patch }))

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (hasError) return
		try {
			const saved = await saveMutation.mutateAsync()
			toast.success(banner ? 'Banner saved' : 'Banner created')
			if (!banner && saved?.id) {
				router.push(`/research/admin/banners/${saved.id}`)
			}
		} catch (err) {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to save')
		}
	}

	const handleDelete = async () => {
		if (!banner) return
		if (!window.confirm('Delete this banner? This cannot be undone.')) return
		try {
			await deleteMutation.mutateAsync()
			toast.success('Banner deleted')
			router.push('/research/admin/banners')
		} catch (err) {
			toast.error(err instanceof ArticleApiError ? err.message : 'Failed to delete')
		}
	}

	const previewBanner: Banner = {
		id: banner?.id ?? 'preview',
		scope: state.scope,
		section: state.scope === 'section' ? (state.section as ArticleSection) : null,
		articleId: state.scope === 'article' ? state.articleId : null,
		text: state.text || 'Banner preview text — write your message above',
		linkUrl: state.linkUrl.trim() || null,
		linkLabel: state.linkLabel.trim() || null,
		enabled: true,
		createdByPbUserId: banner?.createdByPbUserId ?? '',
		createdAt: banner?.createdAt ?? new Date().toISOString(),
		updatedAt: banner?.updatedAt ?? new Date().toISOString()
	}

	return (
		<form onSubmit={handleSubmit} className="mx-auto grid w-full max-w-4xl gap-0 px-1 pb-28">
			<PreviewStrip banner={previewBanner} />

			<Section title="Scope" description="Where should this banner appear?">
				<div className="grid gap-2">
					{BANNER_SCOPES.map((scope) => (
						<label
							key={scope}
							className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors ${
								state.scope === scope
									? 'border-(--link-text)/60 bg-(--link-button)'
									: 'border-(--cards-border) hover:border-(--link-text)/40'
							}`}
						>
							<input
								type="radio"
								name="scope"
								value={scope}
								checked={state.scope === scope}
								onChange={() => update({ scope })}
								className="mt-0.5 accent-(--link-text)"
							/>
							<div className="grid gap-0.5">
								<span className="text-sm font-medium text-(--text-primary)">{BANNER_SCOPE_LABELS[scope]}</span>
								<span className="text-xs text-(--text-tertiary)">
									{scope === 'landing'
										? 'Shows on /research'
										: scope === 'section'
											? 'Shows on every article in the chosen section'
											: 'Shows only on the chosen article'}
								</span>
							</div>
						</label>
					))}
				</div>

				{state.scope === 'section' ? (
					<div className="grid gap-1.5">
						<span className="text-sm font-medium text-(--text-primary)">Section</span>
						<Ariakit.SelectProvider
							value={state.section}
							setValue={(v) => {
								const next = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : ''
								update({ section: next as ArticleSection })
							}}
						>
							<Ariakit.Select
								aria-label="Banner section"
								className={`flex h-10 items-center justify-between gap-2 rounded-md border bg-(--app-bg) px-3 text-sm transition-colors focus-visible:border-(--link-text) focus-visible:outline-none data-[state=open]:border-(--link-text) ${
									errors.section
										? 'border-red-500/60 text-(--text-primary)'
										: state.section
											? 'border-(--cards-border) text-(--text-primary)'
											: 'border-(--cards-border) text-(--text-tertiary)'
								}`}
							>
								<span className="truncate text-left">
									{state.section ? ARTICLE_SECTION_LABELS[state.section as ArticleSection] : 'Select a section…'}
								</span>
								<Ariakit.SelectArrow className="shrink-0 text-(--text-tertiary)" />
							</Ariakit.Select>
							<Ariakit.SelectPopover
								gutter={6}
								sameWidth
								portal
								unmountOnHide
								className="z-[90] flex flex-col overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) py-1 text-sm shadow-xl outline-none"
							>
								{ARTICLE_SECTIONS.map((section) => (
									<Ariakit.SelectItem
										key={section}
										value={section}
										className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-(--text-secondary) data-active-item:bg-(--link-button) data-active-item:text-(--link-text)"
									>
										<span className="truncate">{ARTICLE_SECTION_LABELS[section]}</span>
										<Ariakit.SelectItemCheck className="shrink-0 text-(--link-text)" />
									</Ariakit.SelectItem>
								))}
							</Ariakit.SelectPopover>
						</Ariakit.SelectProvider>
						{errors.section ? <p className="text-xs text-red-500">{errors.section}</p> : null}
					</div>
				) : null}

				{state.scope === 'article' ? (
					<div className="grid gap-1.5">
						<span className="text-sm font-medium text-(--text-primary)">Article</span>
						<ArticlePicker
							value={state.articleId}
							onChange={(article) => update({ articleId: article?.id ?? null })}
							error={errors.articleId}
						/>
					</div>
				) : null}
			</Section>

			<Section title="Content" description="The text readers see and an optional link.">
				<label className="grid gap-1.5">
					<span className="flex items-center justify-between gap-2 text-sm font-medium text-(--text-primary)">
						Banner text
						<CharCount value={state.text} max={TEXT_MAX} />
					</span>
					<textarea
						value={state.text}
						onChange={(e) => update({ text: e.target.value })}
						maxLength={TEXT_MAX}
						rows={3}
						placeholder="KATANA’S VKAT ARMORY REPRESENTS THE NEXT EVOLUTION OF VE-TOKENOMICS."
						className="w-full resize-y rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
					/>
					{errors.text ? <p className="text-xs text-red-500">{errors.text}</p> : null}
				</label>

				<label className="grid gap-1.5">
					<span className="flex items-center justify-between gap-2 text-sm font-medium text-(--text-primary)">
						Link URL <span className="font-normal text-(--text-tertiary)">(optional)</span>
						<CharCount value={state.linkUrl} max={LINK_URL_MAX} />
					</span>
					<input
						type="text"
						value={state.linkUrl}
						onChange={(e) => update({ linkUrl: e.target.value })}
						maxLength={LINK_URL_MAX}
						placeholder="https://… or /research/…"
						className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
					/>
					{errors.linkUrl ? <p className="text-xs text-red-500">{errors.linkUrl}</p> : null}
				</label>

				<label className="grid gap-1.5">
					<span className="flex items-center justify-between gap-2 text-sm font-medium text-(--text-primary)">
						Link label <span className="font-normal text-(--text-tertiary)">(optional, default “Read more”)</span>
						<CharCount value={state.linkLabel} max={LINK_LABEL_MAX} />
					</span>
					<input
						type="text"
						value={state.linkLabel}
						onChange={(e) => update({ linkLabel: e.target.value })}
						maxLength={LINK_LABEL_MAX}
						placeholder="Read more"
						className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
					/>
				</label>
			</Section>

			<Section title="Visibility" description="Disable a banner to hide it without deleting it.">
				<label className="flex items-center gap-3">
					<input
						type="checkbox"
						checked={state.enabled}
						onChange={(e) => update({ enabled: e.target.checked })}
						className="h-4 w-4 accent-(--link-text)"
					/>
					<span className="text-sm text-(--text-primary)">Enabled</span>
				</label>
			</Section>

			<div className="sticky bottom-0 -mx-1 mt-2 border-t border-(--cards-border) bg-(--app-bg)/90 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-(--app-bg)/70">
				<div className="flex items-center justify-between gap-3">
					<span className="inline-flex items-center gap-2 text-xs text-(--text-tertiary)">
						<span
							aria-hidden
							className={`h-1.5 w-1.5 rounded-full transition-colors ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
						/>
						{dirty ? 'Unsaved changes' : banner ? 'All changes saved' : 'New banner'}
					</span>
					<div className="flex items-center gap-2">
						{banner ? (
							<button
								type="button"
								onClick={handleDelete}
								disabled={deleteMutation.isPending}
								className="rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Delete
							</button>
						) : null}
						<button
							type="submit"
							disabled={hasError || saveMutation.isPending || (!dirty && !!banner)}
							className="rounded-md bg-(--link-text) px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
						>
							{saveMutation.isPending ? 'Saving…' : banner ? 'Save changes' : 'Create banner'}
						</button>
					</div>
				</div>
			</div>
		</form>
	)
}

function PreviewStrip({ banner }: { banner: Banner }) {
	return (
		<div className="grid gap-2 pt-2 pb-6">
			<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">Preview</span>
			<div className="overflow-hidden rounded-md border border-(--cards-border)">
				<PreviewStripInner banner={banner} />
			</div>
		</div>
	)
}

function PreviewStripInner({ banner }: { banner: Banner }) {
	return (
		<div className="flex w-full items-center gap-3 bg-[#0b1e6b] px-4 py-2.5 text-white">
			<div className="flex flex-1 items-center justify-center">
				<p className="m-0 text-center font-jetbrains text-[11px] font-semibold tracking-[0.18em] uppercase">
					<span>{banner.text}</span>
					{banner.linkUrl ? (
						<>
							{' '}
							<span className="underline underline-offset-2">{banner.linkLabel?.trim() || 'Read more'}</span>
						</>
					) : null}
				</p>
			</div>
		</div>
	)
}

function Section({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
	return (
		<section className="grid gap-6 border-t border-(--cards-border) py-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-x-12 md:py-10">
			<div>
				<h2 className="text-base font-semibold text-(--text-primary)">{title}</h2>
				<p className="mt-1.5 text-sm leading-relaxed text-(--text-secondary)">{description}</p>
			</div>
			<div className="grid min-w-0 gap-5">{children}</div>
		</section>
	)
}

function CharCount({ value, max }: { value: string; max: number }) {
	const remaining = max - value.length
	const tight = remaining < Math.max(20, Math.round(max * 0.1))
	return (
		<span
			className={`font-jetbrains text-[10px] tracking-[0.16em] uppercase ${tight ? 'text-amber-500' : 'text-(--text-tertiary)'}`}
		>
			{value.length} / {max}
		</span>
	)
}
