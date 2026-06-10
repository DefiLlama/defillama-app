import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ImageUploadButton } from '~/containers/Articles/upload/ImageUploadButton'
import { useAuthContext } from '~/containers/Subscription/auth'
import { getMyDashboardAuthorProfile, updateMyDashboardAuthorProfile } from './api'
import { avatarColorStyle } from './avatarColor'
import type { AuthorProfileUpdate, PublicDashboardAuthor } from './types'

const DISPLAY_NAME_MAX = 120
const SLUG_MAX = 60
const BIO_MAX = 2000
const SOCIAL_VALUE_MAX = 300
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DEFAULT_SLUG_REGEX = /^llama-[0-9a-f]{12}$/
const DEFAULT_NAME_REGEX = /^Llama [0-9a-f]{6}$/

const SOCIALS = [
	{ id: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourhandle' },
	{ id: 'github', label: 'GitHub', placeholder: 'https://github.com/yourhandle' },
	{ id: 'farcaster', label: 'Farcaster', placeholder: 'https://warpcast.com/yourhandle' },
	{ id: 'bluesky', label: 'Bluesky', placeholder: 'https://bsky.app/profile/you.bsky.social' },
	{ id: 'mastodon', label: 'Mastodon', placeholder: 'https://mastodon.social/@you' },
	{ id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/yourhandle' },
	{ id: 'discord', label: 'Discord', placeholder: 'https://discord.gg/yourinvite' },
	{ id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/you' },
	{ id: 'website', label: 'Website', placeholder: 'https://yourdomain.com' }
] as const

type FormState = {
	displayName: string
	slug: string
	bio: string
	avatarUrl: string
	socials: Record<string, string>
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, SLUG_MAX)
}

function isHttpsUrl(value: string): boolean {
	if (!value.trim()) return true
	try {
		const url = new URL(value)
		return url.protocol === 'https:' && !url.username && !url.password
	} catch {
		return false
	}
}

function profileToForm(profile: PublicDashboardAuthor): FormState {
	const socials: Record<string, string> = {}
	for (const social of SOCIALS) {
		const value = profile.socials?.[social.id]
		if (value) socials[social.id] = value
	}
	return {
		displayName: profile.displayName || '',
		slug: profile.slug || '',
		bio: profile.bio || '',
		avatarUrl: profile.avatarUrl || '',
		socials
	}
}

function buildPayload(state: FormState, initial: FormState): AuthorProfileUpdate {
	const payload: AuthorProfileUpdate = {}
	if (state.displayName.trim() !== initial.displayName.trim()) payload.displayName = state.displayName.trim()
	if (state.slug.trim() !== initial.slug.trim()) payload.slug = state.slug.trim()
	if (state.bio.trim() !== initial.bio.trim()) payload.bio = state.bio.trim() || null
	if (state.avatarUrl.trim() !== initial.avatarUrl.trim()) payload.avatarUrl = state.avatarUrl.trim() || null

	const socials = Object.fromEntries(
		Object.entries(state.socials)
			.map(([key, value]) => [key, value.trim()])
			.filter(([, value]) => value)
	)
	const initialSocials = Object.fromEntries(
		Object.entries(initial.socials)
			.map(([key, value]) => [key, value.trim()])
			.filter(([, value]) => value)
	)
	const sameSocials =
		Object.keys(socials).length === Object.keys(initialSocials).length &&
		Object.entries(socials).every(([key, value]) => initialSocials[key] === value)
	if (!sameSocials) payload.socials = socials
	return payload
}

function formsEqual(a: FormState, b: FormState): boolean {
	return JSON.stringify(buildPayload(a, b)) === '{}'
}

type CompletenessCheck = { label: string; done: boolean }

function profileCompleteness(state: FormState): { percent: number; missing: string[] } {
	const checks: CompletenessCheck[] = [
		{ label: 'Add your name', done: !!state.displayName.trim() && !DEFAULT_NAME_REGEX.test(state.displayName.trim()) },
		{ label: 'Pick a custom handle', done: !!state.slug.trim() && !DEFAULT_SLUG_REGEX.test(state.slug.trim()) },
		{ label: 'Write a short bio', done: !!state.bio.trim() },
		{ label: 'Upload an avatar', done: !!state.avatarUrl.trim() },
		{ label: 'Link a social account', done: Object.values(state.socials).some((value) => value.trim()) }
	]
	const completed = checks.filter((check) => check.done).length
	return {
		percent: Math.round((completed / checks.length) * 100),
		missing: checks.filter((check) => !check.done).map((check) => check.label)
	}
}

function ProfileCompletenessMeter({ state }: { state: FormState }) {
	const { percent, missing } = profileCompleteness(state)
	return (
		<div className="mt-4 grid gap-2 border-t border-(--sub-border-slate-100) pt-4 dark:border-(--sub-border-strong)">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-medium text-(--sub-ink-primary) dark:text-white">Profile completeness</span>
				<span className="text-xs font-semibold text-(--sub-brand-primary) tabular-nums">{percent}%</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-(--sub-border-slate-100) dark:bg-(--sub-border-strong)">
				<div
					className="h-full rounded-full bg-(--sub-brand-primary) transition-[width] duration-300"
					style={{ width: `${percent}%` }}
				/>
			</div>
			{missing.length ? (
				<ul className="grid gap-1">
					{missing.map((label) => (
						<li key={label} className="flex items-center gap-1.5 text-xs text-(--sub-text-muted)">
							<Icon name="plus" height={12} width={12} />
							{label}
						</li>
					))}
				</ul>
			) : (
				<p className="text-xs text-(--sub-text-muted)">Your profile is complete and ready to gain followers.</p>
			)}
		</div>
	)
}

function CharCount({ value, max }: { value: string; max: number }) {
	const near = value.length >= Math.floor(max * 0.9)
	return (
		<span className={`text-[11px] tabular-nums ${near ? 'text-amber-500' : 'text-(--sub-text-muted)'}`}>
			{value.length.toLocaleString()}/{max.toLocaleString()}
		</span>
	)
}

function validateForm(state: FormState): string | null {
	if (!state.displayName.trim()) return 'Display name is required'
	if (state.displayName.trim().length > DISPLAY_NAME_MAX)
		return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer`
	if (!state.slug.trim()) return 'Handle is required'
	if (state.slug.trim().length > SLUG_MAX) return `Handle must be ${SLUG_MAX} characters or fewer`
	if (!SLUG_REGEX.test(state.slug.trim())) return 'Use lowercase letters, numbers, and dashes for the handle'
	if (state.bio.length > BIO_MAX) return `Bio must be ${BIO_MAX} characters or fewer`
	if (state.avatarUrl.trim() && !isHttpsUrl(state.avatarUrl.trim())) return 'Avatar URL must be an HTTPS URL'
	for (const social of SOCIALS) {
		const value = state.socials[social.id]?.trim() || ''
		if (value.length > SOCIAL_VALUE_MAX) return `${social.label} must be ${SOCIAL_VALUE_MAX} characters or fewer`
		if (value && !isHttpsUrl(value)) return `${social.label} must be an HTTPS URL`
	}
	return null
}

export function DashboardAuthorProfileCard() {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const queryClient = useQueryClient()
	const [profile, setProfile] = useState<PublicDashboardAuthor | null>(null)
	const [initial, setInitial] = useState<FormState | null>(null)
	const [state, setState] = useState<FormState | null>(null)
	const hydratedProfileRef = useRef<string | null>(null)
	const queryEnabled = isAuthenticated && !loaders.userLoading
	const {
		data: loadedProfile,
		isLoading: profileLoading,
		error: profileError
	} = useQuery({
		queryKey: ['dashboard-author-profile'],
		queryFn: () => getMyDashboardAuthorProfile(authorizedFetch),
		enabled: queryEnabled,
		retry: false,
		refetchOnWindowFocus: false
	})
	const updateMutation = useMutation({
		mutationFn: (payload: AuthorProfileUpdate) => updateMyDashboardAuthorProfile(payload, authorizedFetch),
		onSuccess: (nextProfile) => {
			queryClient.setQueryData(['dashboard-author-profile'], nextProfile)
		}
	})

	useEffect(() => {
		if (!loadedProfile) return
		const profileKey = `${loadedProfile.slug}:${loadedProfile.updatedAt}`
		if (hydratedProfileRef.current === profileKey) return
		hydratedProfileRef.current = profileKey
		const next = profileToForm(loadedProfile)
		setProfile(loadedProfile)
		setInitial(next)
		setState(next)
	}, [loadedProfile])

	const validationError = state ? validateForm(state) : null
	const isDirty = state && initial ? !formsEqual(state, initial) : false

	if (profileLoading || !state || !initial) {
		return (
			<div className="flex min-h-56 items-center justify-center rounded-2xl border border-(--sub-border-slate-100) bg-white dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				<div className="size-7 animate-spin rounded-full border-2 border-(--sub-brand-primary) border-t-transparent" />
			</div>
		)
	}

	if (profileError) {
		return (
			<div className="rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
				<p className="text-sm text-(--sub-text-muted)">Profile could not be loaded.</p>
			</div>
		)
	}

	const save = async () => {
		if (!state || !initial) return
		const error = validateForm(state)
		if (error) {
			toast.error(error)
			return
		}
		const payload = buildPayload(state, initial)
		try {
			const nextProfile = await toast.promise(updateMutation.mutateAsync(payload), {
				loading: 'Saving profile…',
				success: 'Profile saved',
				error: (err) => (err instanceof Error ? err.message : 'Failed to save profile')
			})
			const next = profileToForm(nextProfile)
			hydratedProfileRef.current = `${nextProfile.slug}:${nextProfile.updatedAt}`
			setProfile(nextProfile)
			setInitial(next)
			setState(next)
		} catch {}
	}

	const displayName = state.displayName.trim() || 'Your name'
	const publicHref = `/authors/${state.slug || profile?.slug || ''}`

	return (
		<div className="grid gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Icon name="users" height={24} width={24} className="text-(--sub-ink-primary) dark:text-white" />
					<span className="text-base font-medium text-(--sub-ink-primary) dark:text-white">Public Profile</span>
				</div>
				{profile?.slug ? (
					<BasicLink href={publicHref} className="text-sm font-medium text-(--link-text) hover:underline">
						View profile
					</BasicLink>
				) : null}
			</div>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
				<div className="grid gap-4">
					<ImageUploadButton
						scope="avatar"
						currentUrl={state.avatarUrl}
						label="Avatar"
						previewShape="square"
						helperText="Shown on your public dashboard profile and dashboard bylines."
						onUploaded={(result) => setState((prev) => (prev ? { ...prev, avatarUrl: result.url } : prev))}
						onCleared={() => setState((prev) => (prev ? { ...prev, avatarUrl: '' } : prev))}
					/>

					<label className="grid gap-1.5">
						<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">Display name</span>
						<input
							value={state.displayName}
							maxLength={DISPLAY_NAME_MAX}
							onChange={(e) => {
								const nextDisplayName = e.target.value
								setState((prev) =>
									prev
										? {
												...prev,
												displayName: nextDisplayName,
												slug: prev.slug === slugify(prev.displayName) ? slugify(nextDisplayName) : prev.slug
											}
										: prev
								)
							}}
							className="rounded-lg border border-(--sub-border-slate-100) bg-transparent px-3 py-2 text-sm text-(--sub-ink-primary) outline-none focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:text-white"
						/>
					</label>

					<label className="grid gap-1.5">
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">Handle</span>
							<CharCount value={state.slug} max={SLUG_MAX} />
						</div>
						<input
							value={state.slug}
							maxLength={SLUG_MAX}
							onChange={(e) => setState((prev) => (prev ? { ...prev, slug: slugify(e.target.value) } : prev))}
							className="rounded-lg border border-(--sub-border-slate-100) bg-transparent px-3 py-2 text-sm text-(--sub-ink-primary) outline-none focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:text-white"
						/>
					</label>

					<label className="grid gap-1.5">
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">Bio</span>
							<CharCount value={state.bio} max={BIO_MAX} />
						</div>
						<textarea
							value={state.bio}
							maxLength={BIO_MAX}
							rows={4}
							onChange={(e) => setState((prev) => (prev ? { ...prev, bio: e.target.value } : prev))}
							className="resize-y rounded-lg border border-(--sub-border-slate-100) bg-transparent px-3 py-2 text-sm leading-6 text-(--sub-ink-primary) outline-none focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:text-white"
						/>
					</label>

					<div className="grid gap-3">
						<span className="text-sm font-medium text-(--sub-ink-primary) dark:text-white">Links</span>
						<div className="grid gap-3 md:grid-cols-2">
							{SOCIALS.map((social) => (
								<label key={social.id} className="grid gap-1.5">
									<span className="text-xs font-medium text-(--sub-text-muted)">{social.label}</span>
									<input
										value={state.socials[social.id] || ''}
										maxLength={SOCIAL_VALUE_MAX}
										placeholder={social.placeholder}
										onChange={(e) =>
											setState((prev) =>
												prev
													? {
															...prev,
															socials: { ...prev.socials, [social.id]: e.target.value }
														}
													: prev
											)
										}
										className="rounded-lg border border-(--sub-border-slate-100) bg-transparent px-3 py-2 text-sm text-(--sub-ink-primary) outline-none placeholder:text-(--sub-text-muted) focus:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:text-white"
									/>
								</label>
							))}
						</div>
					</div>
				</div>

				<aside className="h-fit rounded-lg border border-(--sub-border-slate-100) bg-(--sub-surface-subtle) p-4 dark:border-(--sub-border-strong) dark:bg-black/10">
					<div className="flex items-start gap-3">
						{state.avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={state.avatarUrl} alt="" className="size-14 rounded-full object-cover" />
						) : (
							<div
								className="flex size-14 items-center justify-center rounded-full text-3xl"
								style={avatarColorStyle(state.slug || displayName)}
							>
								🦙
							</div>
						)}
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-(--sub-ink-primary) dark:text-white">{displayName}</p>
							<p className="truncate text-xs text-(--sub-text-muted)">@{state.slug || 'handle'}</p>
						</div>
					</div>
					{state.bio.trim() ? (
						<p className="mt-3 line-clamp-4 text-sm leading-6 text-(--sub-text-muted)">{state.bio.trim()}</p>
					) : null}
					<ProfileCompletenessMeter state={state} />
				</aside>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--sub-border-slate-100) pt-4 dark:border-(--sub-border-strong)">
				<p className={`text-xs ${validationError ? 'text-amber-500' : 'text-(--sub-text-muted)'}`}>
					{validationError || 'Profile changes appear on public dashboard pages after saving.'}
				</p>
				<button
					type="button"
					disabled={!isDirty || updateMutation.isPending || !!validationError}
					onClick={save}
					className="rounded-lg bg-(--sub-brand-primary) px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
				>
					{updateMutation.isPending ? 'Saving…' : 'Save profile'}
				</button>
			</div>
		</div>
	)
}
