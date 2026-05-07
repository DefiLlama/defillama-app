import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
	ArticleApiError,
	type AuthorProfileUpdate,
	getMyAuthorProfile,
	updateMyAuthorProfile
} from '~/containers/Articles/api'
import type { ArticleAuthorProfile } from '~/containers/Articles/types'
import { ImageUploadButton } from '~/containers/Articles/upload/ImageUploadButton'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'

const DISPLAY_NAME_MAX = 120
const SLUG_MAX = 60
const BIO_MAX = 2000
const SOCIAL_VALUE_MAX = 300
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type SocialKind = {
	id: string
	label: string
	placeholder: string
}

const PRESET_SOCIALS: SocialKind[] = [
	{ id: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourhandle' },
	{ id: 'github', label: 'GitHub', placeholder: 'https://github.com/yourhandle' },
	{ id: 'farcaster', label: 'Farcaster', placeholder: 'https://warpcast.com/yourhandle' },
	{ id: 'bluesky', label: 'Bluesky', placeholder: 'https://bsky.app/profile/you.bsky.social' },
	{ id: 'mastodon', label: 'Mastodon', placeholder: 'https://mastodon.social/@you' },
	{ id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/yourhandle' },
	{ id: 'discord', label: 'Discord', placeholder: 'username or invite URL' },
	{ id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/you' },
	{ id: 'website', label: 'Website', placeholder: 'https://yourdomain.com' }
]

type FormState = {
	displayName: string
	slug: string
	bio: string
	avatarUrl: string
	socials: Record<string, string>
	customSocials: Array<{ key: string; value: string }>
}

function profileToForm(profile: ArticleAuthorProfile): FormState {
	const presetIds = new Set(PRESET_SOCIALS.map((s) => s.id))
	const presetEntries: Record<string, string> = {}
	const custom: Array<{ key: string; value: string }> = []
	for (const [key, value] of Object.entries(profile.socials || {})) {
		if (!value) continue
		if (presetIds.has(key)) presetEntries[key] = value
		else custom.push({ key, value })
	}
	return {
		displayName: profile.displayName || '',
		slug: profile.slug || '',
		bio: profile.bio || '',
		avatarUrl: profile.avatarUrl || '',
		socials: presetEntries,
		customSocials: custom
	}
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, SLUG_MAX)
}

function formsEqual(a: FormState, b: FormState): boolean {
	if (a.displayName !== b.displayName) return false
	if (a.slug !== b.slug) return false
	if (a.bio !== b.bio) return false
	if (a.avatarUrl !== b.avatarUrl) return false
	const aKeys = Object.keys(a.socials).sort()
	const bKeys = Object.keys(b.socials).sort()
	if (aKeys.length !== bKeys.length || aKeys.some((k, i) => k !== bKeys[i])) return false
	if (aKeys.some((k) => a.socials[k] !== b.socials[k])) return false
	if (a.customSocials.length !== b.customSocials.length) return false
	for (let i = 0; i < a.customSocials.length; i += 1) {
		if (a.customSocials[i].key !== b.customSocials[i].key) return false
		if (a.customSocials[i].value !== b.customSocials[i].value) return false
	}
	return true
}

function validateSlug(value: string): string | null {
	const trimmed = value.trim()
	if (!trimmed) return null
	if (trimmed.length > SLUG_MAX) return `Handle must be ${SLUG_MAX} characters or fewer`
	if (!SLUG_REGEX.test(trimmed)) return 'Use lowercase letters, numbers, and dashes only'
	return null
}

function buildPayload(state: FormState, initial: FormState): AuthorProfileUpdate {
	const payload: AuthorProfileUpdate = {}
	if (state.displayName.trim() !== initial.displayName.trim()) {
		payload.displayName = state.displayName.trim()
	}
	if (state.slug.trim() !== initial.slug.trim()) {
		payload.slug = state.slug.trim()
	}
	if (state.bio.trim() !== initial.bio.trim()) {
		payload.bio = state.bio.trim() || null
	}
	if (state.avatarUrl.trim() !== initial.avatarUrl.trim()) {
		payload.avatarUrl = state.avatarUrl.trim() || null
	}
	const socials: Record<string, string> = {}
	for (const [key, value] of Object.entries(state.socials)) {
		const trimmed = (value || '').trim()
		if (trimmed) socials[key] = trimmed
	}
	for (const { key, value } of state.customSocials) {
		const k = slugify(key)
		const v = (value || '').trim()
		if (k && v) socials[k] = v
	}
	const initialSocials: Record<string, string> = { ...initial.socials }
	for (const { key, value } of initial.customSocials) {
		const k = slugify(key)
		if (k && value) initialSocials[k] = value
	}
	const sameSocials =
		Object.keys(socials).length === Object.keys(initialSocials).length &&
		Object.entries(socials).every(([k, v]) => initialSocials[k] === v)
	if (!sameSocials) payload.socials = socials
	return payload
}

function CharCount({ value, max }: { value: string; max: number }) {
	const len = value.length
	const near = len >= Math.floor(max * 0.9)
	return (
		<span className={`text-[11px] tabular-nums ${near ? 'text-amber-500' : 'text-(--text-tertiary)'}`}>
			{len.toLocaleString()}/{max.toLocaleString()}
		</span>
	)
}

function formatJoined(iso: string | null | undefined): string {
	if (!iso) return ''
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return ''
	return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(d)
}

function LivePreview({ state, createdAt }: { state: FormState; createdAt: string | null | undefined }) {
	const displayName = state.displayName.trim() || 'Your name'
	const slug = state.slug.trim() || 'your-handle'
	const initials = displayName.slice(0, 2).toUpperCase()
	const joined = formatJoined(createdAt)
	const socialCount =
		Object.values(state.socials).filter((v) => v.trim()).length +
		state.customSocials.filter((c) => c.value.trim()).length

	return (
		<section className="grid gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 md:p-6">
			<div className="flex items-center justify-between gap-2">
				<span className="font-jetbrains text-[10px] tracking-[0.2em] text-(--text-tertiary) uppercase">
					Live preview
				</span>
				<span className="text-[11px] text-(--text-tertiary)">How readers see you</span>
			</div>
			<div className="flex items-start gap-4">
				{state.avatarUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={state.avatarUrl}
						alt=""
						className="h-20 w-20 shrink-0 rounded-full border border-(--cards-border) object-cover"
					/>
				) : (
					<div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-(--cards-border) bg-(--app-bg) text-xl font-semibold text-(--text-secondary)">
						{initials}
					</div>
				)}
				<div className="grid min-w-0 gap-1.5">
					<h2 className="text-xl font-semibold tracking-tight text-(--text-primary) md:text-2xl">{displayName}</h2>
					<p className="font-jetbrains text-xs text-(--text-tertiary)">@{slug}</p>
					{state.bio.trim() ? (
						<p className="line-clamp-3 max-w-prose text-sm leading-relaxed text-(--text-secondary)">
							{state.bio.trim()}
						</p>
					) : (
						<p className="max-w-prose text-sm text-(--text-tertiary) italic">
							Add a bio so readers know what you cover.
						</p>
					)}
					{joined || socialCount > 0 ? (
						<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-(--text-tertiary)">
							{joined ? <span>Joined {joined}</span> : null}
							{joined && socialCount > 0 ? <span aria-hidden>·</span> : null}
							{socialCount > 0 ? (
								<span>
									{socialCount} {socialCount === 1 ? 'link' : 'links'}
								</span>
							) : null}
						</div>
					) : null}
				</div>
			</div>
		</section>
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

export function AuthorProfileForm() {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const [profile, setProfile] = useState<ArticleAuthorProfile | null>(null)
	const [initial, setInitial] = useState<FormState | null>(null)
	const [state, setState] = useState<FormState | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const [showCustom, setShowCustom] = useState(false)

	useEffect(() => {
		if (loaders.userLoading) return
		if (!isAuthenticated) {
			setIsLoading(false)
			return
		}
		let cancelled = false
		setIsLoading(true)
		getMyAuthorProfile(authorizedFetch)
			.then((response) => {
				if (cancelled) return
				const next = profileToForm(response)
				setProfile(response)
				setInitial(next)
				setState(next)
				setShowCustom(next.customSocials.length > 0)
				setLoadError(null)
			})
			.catch((err) => {
				if (cancelled) return
				setLoadError(err instanceof ArticleApiError ? err.message : 'Failed to load profile')
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [authorizedFetch, isAuthenticated, loaders.userLoading])

	const dirty = useMemo(() => (state && initial ? !formsEqual(state, initial) : false), [state, initial])
	const slugError = state ? validateSlug(state.slug) : null
	const displayNameError = state && !state.displayName.trim() ? 'Display name is required' : null
	const hasError = !!slugError || !!displayNameError

	const slugChanged = !!state && !!initial && state.slug.trim() !== initial.slug.trim()

	const update = (patch: Partial<FormState>) => setState((current) => (current ? { ...current, ...patch } : current))
	const updateSocial = (key: string, value: string) =>
		setState((current) => (current ? { ...current, socials: { ...current.socials, [key]: value } } : current))
	const updateCustom = (index: number, patch: { key?: string; value?: string }) =>
		setState((current) => {
			if (!current) return current
			const next = current.customSocials.slice()
			next[index] = { ...next[index], ...patch }
			return { ...current, customSocials: next }
		})
	const addCustom = () =>
		setState((current) =>
			current ? { ...current, customSocials: [...current.customSocials, { key: '', value: '' }] } : current
		)
	const removeCustom = (index: number) =>
		setState((current) =>
			current ? { ...current, customSocials: current.customSocials.filter((_, i) => i !== index) } : current
		)

	const handleReset = () => {
		if (initial) {
			setState(initial)
			setShowCustom(initial.customSocials.length > 0)
		}
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!state || !initial || hasError || !dirty) return
		const payload = buildPayload(state, initial)
		if (Object.keys(payload).length === 0) return
		setIsSaving(true)
		try {
			const updated = await updateMyAuthorProfile(payload, authorizedFetch)
			const next = profileToForm(updated)
			setProfile(updated)
			setInitial(next)
			setState(next)
			setShowCustom(next.customSocials.length > 0)
			if (payload.slug && next.slug !== payload.slug) {
				toast.success(`Saved as @${next.slug}`)
			} else {
				toast.success('Saved')
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save')
		} finally {
			setIsSaving(false)
		}
	}

	if (loaders.userLoading || (isAuthenticated && isLoading)) {
		return (
			<div className="mx-auto flex max-w-3xl items-center justify-center py-24 text-sm text-(--text-tertiary)">
				Loading…
			</div>
		)
	}

	if (!isAuthenticated) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Sign in to edit your profile</h1>
				<p className="text-sm text-(--text-secondary)">Your author profile is tied to your DefiLlama account.</p>
				<SignInModal
					text="Sign in"
					className="mr-auto rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white"
				/>
			</div>
		)
	}

	if (loadError || !state || !profile) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load profile</h1>
				<p className="text-sm text-(--text-secondary)">{loadError || 'Unknown error'}</p>
			</div>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="mx-auto grid w-full max-w-4xl gap-0 px-1 pb-28">
			<header className="flex flex-wrap items-end justify-between gap-3 pt-2 pb-6">
				<div>
					<Link
						href="/research/mine"
						className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
					>
						<span aria-hidden>←</span> My articles
					</Link>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight text-(--text-primary)">Profile</h1>
					<p className="mt-1 text-sm text-(--text-secondary)">How readers see you on research and author pages.</p>
				</div>
				<Link
					href={`/research/authors/${profile.slug}`}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
				>
					View public page
					<span aria-hidden>↗</span>
				</Link>
			</header>

			<LivePreview state={state} createdAt={profile.createdAt} />

			<Section
				title="Identity"
				description="Photo and display name. Square avatars look best — anything else gets center-cropped."
			>
				<div className="flex flex-wrap items-start gap-5">
					<ImageUploadButton
						scope="avatar"
						currentUrl={state.avatarUrl || null}
						onUploaded={(result) => update({ avatarUrl: result.url })}
						onCleared={() => update({ avatarUrl: '' })}
						label="avatar"
						previewShape="square"
						helperText="PNG, JPEG, WebP, or GIF · up to 8 MB"
					/>
				</div>
				<label className="grid gap-1.5">
					<span className="flex items-center justify-between gap-2 text-sm font-medium text-(--text-primary)">
						Display name
						<CharCount value={state.displayName} max={DISPLAY_NAME_MAX} />
					</span>
					<input
						type="text"
						maxLength={DISPLAY_NAME_MAX}
						value={state.displayName}
						onChange={(e) => update({ displayName: e.target.value })}
						className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
					/>
					{displayNameError ? <span className="text-xs text-red-500">{displayNameError}</span> : null}
				</label>
			</Section>

			<Section
				title="Handle"
				description={
					<>
						Your public URL on DefiLlama. Lowercase letters, numbers, and dashes.{' '}
						<span className="text-(--text-tertiary)">Don't change it casually — old links break.</span>
					</>
				}
			>
				<label className="grid gap-1.5">
					<span className="text-sm font-medium text-(--text-primary)">Public URL</span>
					<div className="flex items-stretch overflow-hidden rounded-md border border-(--cards-border) bg-(--app-bg) transition-colors focus-within:border-(--link-text)/60">
						<span className="border-r border-(--cards-border) bg-(--cards-bg) px-3 py-2 font-jetbrains text-xs text-(--text-tertiary)">
							/research/authors/
						</span>
						<input
							type="text"
							maxLength={SLUG_MAX}
							value={state.slug}
							onChange={(e) => update({ slug: e.target.value })}
							className="w-full bg-transparent px-3 py-2 font-jetbrains text-sm text-(--text-primary) outline-none"
							spellCheck={false}
							autoCapitalize="none"
							autoCorrect="off"
						/>
					</div>
					{slugError ? (
						<span className="text-xs text-red-500">{slugError}</span>
					) : slugChanged ? (
						<span className="inline-flex items-center gap-1.5 text-xs text-amber-500">
							<span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
							Old links to <span className="font-jetbrains">/research/authors/{initial?.slug}</span> will 404.
						</span>
					) : null}
				</label>
			</Section>

			<Section
				title="Bio"
				description="One or two sentences. Shown at the top of your author page and in research bylines."
			>
				<label className="grid gap-1.5">
					<span className="flex items-center justify-between gap-2 text-sm font-medium text-(--text-primary)">
						About you
						<CharCount value={state.bio} max={BIO_MAX} />
					</span>
					<textarea
						rows={5}
						maxLength={BIO_MAX}
						value={state.bio}
						onChange={(e) => update({ bio: e.target.value })}
						placeholder="Researcher covering DeFi liquidity, MEV, and stablecoins."
						className="w-full resize-y rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm leading-relaxed text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
					/>
				</label>
			</Section>

			<Section title="Links" description="Shown as chips on your author page. Empty fields are dropped on save.">
				<div className="grid gap-3 sm:grid-cols-2">
					{PRESET_SOCIALS.map((kind) => (
						<label key={kind.id} className="grid gap-1.5">
							<span className="text-xs font-medium text-(--text-secondary)">{kind.label}</span>
							<input
								type="text"
								maxLength={SOCIAL_VALUE_MAX}
								value={state.socials[kind.id] || ''}
								onChange={(e) => updateSocial(kind.id, e.target.value)}
								placeholder={kind.placeholder}
								className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
							/>
						</label>
					))}
				</div>

				{showCustom ? (
					<div className="grid gap-3 border-t border-(--cards-border) pt-4">
						<div className="flex items-center justify-between gap-2">
							<h3 className="text-sm font-medium text-(--text-primary)">Custom links</h3>
							<button type="button" onClick={addCustom} className="text-xs text-(--link-text) hover:underline">
								+ add another
							</button>
						</div>
						{state.customSocials.length === 0 ? (
							<button
								type="button"
								onClick={addCustom}
								className="rounded-md border border-dashed border-(--cards-border) bg-(--app-bg) px-3 py-3 text-sm text-(--text-tertiary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
							>
								Add a custom link
							</button>
						) : (
							state.customSocials.map((entry, index) => (
								<div key={index} className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-start gap-2">
									<input
										type="text"
										value={entry.key}
										onChange={(e) => updateCustom(index, { key: e.target.value })}
										placeholder="kind"
										maxLength={40}
										className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
									/>
									<input
										type="text"
										value={entry.value}
										onChange={(e) => updateCustom(index, { value: e.target.value })}
										placeholder="https://…"
										maxLength={SOCIAL_VALUE_MAX}
										className="w-full rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors outline-none focus:border-(--link-text)/60"
									/>
									<button
										type="button"
										onClick={() => removeCustom(index)}
										aria-label="Remove"
										className="flex h-9 w-9 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-red-500/10 hover:text-red-500"
									>
										<svg
											viewBox="0 0 24 24"
											className="h-3.5 w-3.5"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.75"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<line x1="6" y1="6" x2="18" y2="18" />
											<line x1="6" y1="18" x2="18" y2="6" />
										</svg>
									</button>
								</div>
							))
						)}
					</div>
				) : (
					<button
						type="button"
						onClick={() => {
							setShowCustom(true)
							addCustom()
						}}
						className="mr-auto text-xs text-(--link-text) hover:underline"
					>
						+ add custom link
					</button>
				)}
			</Section>

			<div className="sticky bottom-0 -mx-1 mt-2 border-t border-(--cards-border) bg-(--app-bg)/90 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-(--app-bg)/70">
				<div className="flex items-center justify-between gap-3">
					<span className="inline-flex items-center gap-2 text-xs text-(--text-tertiary)">
						<span
							aria-hidden
							className={`h-1.5 w-1.5 rounded-full transition-colors ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
						/>
						{dirty ? 'Unsaved changes' : 'All changes saved'}
					</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleReset}
							disabled={!dirty || isSaving}
							className="rounded-md px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
						>
							Discard
						</button>
						<button
							type="submit"
							disabled={!dirty || hasError || isSaving}
							className="rounded-md bg-(--link-text) px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
						>
							{isSaving ? 'Saving…' : 'Save changes'}
						</button>
					</div>
				</div>
			</div>
		</form>
	)
}
