import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { ArticlePicker } from '~/containers/Articles/admin/ArticlePicker'
import { ArticleApiError, createBanner, deleteBanner, updateBanner } from '~/containers/Articles/api'
import type { ArticleSection, Banner, BannerKind, BannerPayload, BannerScope } from '~/containers/Articles/types'
import {
	ARTICLE_SECTIONS,
	ARTICLE_SECTION_LABELS,
	BANNER_KIND_DESCRIPTIONS,
	BANNER_KIND_LABELS,
	BANNER_KINDS,
	BANNER_SCOPES,
	BANNER_SCOPE_LABELS
} from '~/containers/Articles/types'
import { ImageUploadButton } from '~/containers/Articles/upload/ImageUploadButton'
import { useAuthContext } from '~/containers/Subscription/auth'

const TEXT_MAX = 500
const LINK_URL_MAX = 2000
const LINK_LABEL_MAX = 64
const IMAGE_ALT_MAX = 200

type FormState = {
	kind: BannerKind
	scope: BannerScope
	section: ArticleSection | ''
	articleId: string | null
	text: string
	linkUrl: string
	linkLabel: string
	imageUrl: string
	imageAlt: string
	enabled: boolean
}

function bannerToForm(banner: Banner | null): FormState {
	if (!banner) {
		return {
			kind: 'text',
			scope: 'landing',
			section: '',
			articleId: null,
			text: '',
			linkUrl: '',
			linkLabel: '',
			imageUrl: '',
			imageAlt: '',
			enabled: true
		}
	}
	return {
		kind: banner.type,
		scope: banner.scope,
		section: banner.section ?? '',
		articleId: banner.articleId,
		text: banner.text ?? '',
		linkUrl: banner.linkUrl ?? '',
		linkLabel: banner.linkLabel ?? '',
		imageUrl: banner.imageUrl ?? '',
		imageAlt: banner.imageAlt ?? '',
		enabled: banner.enabled
	}
}

function buildPayload(state: FormState): BannerPayload {
	const linkUrl = state.linkUrl.trim() || null
	const base: BannerPayload = {
		type: state.kind,
		scope: state.scope,
		section: state.scope === 'section' ? (state.section as ArticleSection) : null,
		articleId: state.scope === 'article' ? state.articleId : null,
		linkUrl,
		enabled: state.enabled
	}
	if (state.kind === 'text') {
		return {
			...base,
			text: state.text.trim(),
			linkLabel: state.linkLabel.trim() || null,
			imageUrl: null,
			imageAlt: null
		}
	}
	return {
		...base,
		text: null,
		linkLabel: null,
		imageUrl: state.imageUrl.trim(),
		imageAlt: state.imageAlt.trim() || null
	}
}

type FormErrors = {
	text?: string
	section?: string
	articleId?: string
	linkUrl?: string
	imageUrl?: string
	scope?: string
}

function validate(state: FormState): FormErrors {
	const errors: FormErrors = {}
	if (state.kind !== 'text' && state.scope === 'landing') {
		errors.scope = 'Image banners cannot use the landing scope'
	}
	if (state.kind === 'text') {
		if (!state.text.trim()) errors.text = 'Banner text is required'
		else if (state.text.length > TEXT_MAX) errors.text = `Max ${TEXT_MAX} characters`
	} else {
		if (!state.imageUrl.trim()) errors.imageUrl = 'Image is required'
	}
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
		state.kind !== initial.kind ||
		state.scope !== initial.scope ||
		state.section !== initial.section ||
		state.articleId !== initial.articleId ||
		state.text !== initial.text ||
		state.linkUrl !== initial.linkUrl ||
		state.linkLabel !== initial.linkLabel ||
		state.imageUrl !== initial.imageUrl ||
		state.imageAlt !== initial.imageAlt ||
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

	const handleKindChange = (kind: BannerKind) => {
		update({
			kind,
			...(kind !== 'text' && state.scope === 'landing' ? { scope: 'section' as BannerScope } : {})
		})
	}

	const visibleScopes = useMemo(
		() => BANNER_SCOPES.filter((scope) => state.kind === 'text' || scope !== 'landing'),
		[state.kind]
	)

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
		type: state.kind,
		scope: state.scope,
		section: state.scope === 'section' ? (state.section as ArticleSection) : null,
		articleId: state.scope === 'article' ? state.articleId : null,
		text: state.kind === 'text' ? state.text || 'Banner preview text — write your message above' : null,
		linkUrl: state.linkUrl.trim() || null,
		linkLabel: state.kind === 'text' ? state.linkLabel.trim() || null : null,
		imageUrl: state.kind !== 'text' ? state.imageUrl.trim() || null : null,
		imageAlt: state.kind !== 'text' ? state.imageAlt.trim() || null : null,
		enabled: true,
		createdByPbUserId: banner?.createdByPbUserId ?? '',
		createdAt: banner?.createdAt ?? new Date().toISOString(),
		updatedAt: banner?.updatedAt ?? new Date().toISOString()
	}

	return (
		<form onSubmit={handleSubmit} className="mx-auto grid w-full max-w-4xl gap-0 px-1 pb-28">
			<BannerPreview banner={previewBanner} />

			<Section
				title="Kind"
				description="Text shows as a dismissible strip at the top of the page. Right-rail image shows under SHARE on desktop. Mobile inline image is placed near the top of the article body on mobile."
			>
				<div className="grid gap-2 sm:grid-cols-3">
					{BANNER_KINDS.map((kind) => (
						<label
							key={kind}
							className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors ${
								state.kind === kind
									? 'border-(--link-text)/60 bg-(--link-button)'
									: 'border-(--cards-border) hover:border-(--link-text)/40'
							}`}
						>
							<input
								type="radio"
								name="kind"
								value={kind}
								checked={state.kind === kind}
								onChange={() => handleKindChange(kind)}
								className="mt-0.5 accent-(--link-text)"
							/>
							<div className="grid gap-0.5">
								<span className="text-sm font-medium text-(--text-primary)">{BANNER_KIND_LABELS[kind]}</span>
								<span className="text-xs text-(--text-tertiary)">{BANNER_KIND_DESCRIPTIONS[kind]}</span>
							</div>
						</label>
					))}
				</div>
			</Section>

			<Section title="Scope" description="Where should this banner appear?">
				<div className="grid gap-2">
					{visibleScopes.map((scope) => (
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
				{errors.scope ? <p className="text-xs text-red-500">{errors.scope}</p> : null}

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

			{state.kind === 'text' ? (
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
			) : (
				<Section title="Content" description="The image readers see and an optional click-through link.">
					<div className="grid gap-1.5">
						<span className="text-sm font-medium text-(--text-primary)">Image</span>
						<ImageUploadButton
							scope={state.kind === 'image-horizontal' ? 'banner-image-horizontal' : 'banner-image'}
							previewShape="wide"
							currentUrl={state.imageUrl || null}
							onUploaded={(result) => update({ imageUrl: result.url })}
							onCleared={() => update({ imageUrl: '' })}
							label="banner image"
							helperText={
								state.kind === 'image-horizontal'
									? 'Up to 8 MB. PNG, JPEG, WebP, or GIF. Resized to fit 1600 × 600, transcoded to WebP.'
									: 'Up to 8 MB. PNG, JPEG, WebP, or GIF. Resized to fit 800 × 1200, transcoded to WebP.'
							}
						/>
						{errors.imageUrl ? <p className="text-xs text-red-500">{errors.imageUrl}</p> : null}
					</div>

					<label className="grid gap-1.5">
						<span className="flex items-center justify-between gap-2 text-sm font-medium text-(--text-primary)">
							Alt text{' '}
							<span className="font-normal text-(--text-tertiary)">(optional, recommended for accessibility)</span>
							<CharCount value={state.imageAlt} max={IMAGE_ALT_MAX} />
						</span>
						<input
							type="text"
							value={state.imageAlt}
							onChange={(e) => update({ imageAlt: e.target.value })}
							maxLength={IMAGE_ALT_MAX}
							placeholder="e.g. State of DeFi banner — get in touch"
							className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
						/>
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
				</Section>
			)}

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

function BannerPreview({ banner }: { banner: Banner }) {
	return (
		<div className="grid gap-2 pt-2 pb-6">
			<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">Preview</span>
			{banner.type === 'text' ? (
				<div className="overflow-hidden rounded-md border border-(--cards-border)">
					<TextPreviewInner banner={banner} />
				</div>
			) : (
				<ImagePreview banner={banner} />
			)}
		</div>
	)
}

function ImagePreview({ banner }: { banner: Banner }) {
	const isHorizontal = banner.type === 'image-horizontal'
	const widthClass = isHorizontal ? 'max-w-[640px]' : 'max-w-[280px]'
	const placeholderHeight = isHorizontal ? 'h-32' : 'h-48'
	const placeholderCopy = isHorizontal
		? 'Upload an image to preview the mobile inline banner'
		: 'Upload an image to preview the right-rail banner'
	return (
		<div className={widthClass}>
			{banner.imageUrl ? (
				<div className="overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={banner.imageUrl} alt={banner.imageAlt ?? ''} className="block h-auto w-full" />
				</div>
			) : (
				<div
					className={`flex ${placeholderHeight} items-center justify-center rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg) px-4 text-center text-xs text-(--text-tertiary)`}
				>
					{placeholderCopy}
				</div>
			)}
		</div>
	)
}

function TextPreviewInner({ banner }: { banner: Banner }) {
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
