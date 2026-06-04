import { type ChangeEvent, type FormEvent, useId, useState, useSyncExternalStore } from 'react'
import { Icon } from '~/components/Icon'
import { ToggleSwitch } from '~/containers/Account/ToggleSwitch'
import { isWalletEmail } from '~/containers/Account/utils'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useIsClient } from '~/hooks/useIsClient'
import {
	NEWSLETTERS,
	type NewsletterKey,
	shouldShowNewsletterSignup,
	useNewsletterSubscription
} from '~/hooks/useNewsletterSubscription'
interface NewsletterSignupProps {
	layout: 'card' | 'strip'
	className?: string
}

const NEWSLETTER_DISMISSED_KEY = 'newsletter-signup-dismissed'

const readNewsletterDismissed = (): boolean => {
	if (typeof window === 'undefined') return false
	try {
		return window.localStorage.getItem(NEWSLETTER_DISMISSED_KEY) != null
	} catch {
		return false
	}
}

const persistNewsletterDismissed = (): void => {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.setItem(NEWSLETTER_DISMISSED_KEY, '1')
	} catch {}
}

const subscribeToStorage = (onChange: () => void) => {
	if (typeof window === 'undefined') return () => {}
	window.addEventListener('storage', onChange)
	return () => window.removeEventListener('storage', onChange)
}

export function NewsletterSignup({ layout, className }: NewsletterSignupProps) {
	const isClient = useIsClient()
	const { user } = useAuthContext()
	const mutation = useNewsletterSubscription()
	const helperId = useId()
	const persistedDismissed = useSyncExternalStore(subscribeToStorage, readNewsletterDismissed, () => false)

	const accountEmail =
		user?.email && isWalletEmail(user.email) ? ((user.ethereum_email as string | undefined) ?? '') : (user?.email ?? '')

	const [email, setEmail] = useState(accountEmail)
	const [prevAccountEmail, setPrevAccountEmail] = useState(accountEmail)
	const [touched, setTouched] = useState(false)
	const [selected, setSelected] = useState<Record<NewsletterKey, boolean>>({ newsletter: true, research: true })
	const [succeeded, setSucceeded] = useState(false)
	const [dismissed, setDismissed] = useState(false)

	if (accountEmail !== prevAccountEmail) {
		setPrevAccountEmail(accountEmail)
		if (!touched) setEmail(accountEmail)
	}

	const isPending = mutation.isPending
	const selectedKeys = NEWSLETTERS.map((n) => n.key).filter((key) => selected[key])
	const noneSelected = selectedKeys.length === 0
	const canSubmit = !isPending && !noneSelected && email.trim().length > 0

	const toggle = (key: NewsletterKey) => setSelected((s) => ({ ...s, [key]: !s[key] }))
	const onEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
		setEmail(e.target.value)
		setTouched(true)
	}
	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		if (!canSubmit) return
		mutation.mutate(
			{ email: email.trim(), newsletters: selectedKeys },
			{
				onSuccess: (data) => {
					if (selectedKeys.every((key) => data.result?.[key] === 'ok')) {
						setSucceeded(true)
						persistNewsletterDismissed()
					}
				}
			}
		)
	}
	const handleDismiss = () => {
		persistNewsletterDismissed()
		setDismissed(true)
	}

	if (!isClient || !shouldShowNewsletterSignup(user)) return null

	const spinner = <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

	if (layout === 'strip') {
		if (persistedDismissed || dismissed) return null
		return (
			<div
				className={`@container relative shrink-0 overflow-hidden rounded-xl border border-(--cards-border) bg-(--cards-bg) py-4 pr-10 pl-6 @5xl:py-5 @5xl:pr-12${
					className ? ` ${className}` : ''
				}`}
			>
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 bottom-0 left-0 w-[3px] bg-(--sub-brand-primary)"
				/>
				<button
					type="button"
					onClick={handleDismiss}
					aria-label="Dismiss newsletter signup"
					className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--bg-input)"
				>
					<Icon name="x" height={16} width={16} />
				</button>
				{succeeded ? (
					<NewsletterSuccess layout="strip" email={email} onReset={() => setSucceeded(false)} />
				) : (
					<div className="flex flex-col gap-4 @5xl:flex-row @5xl:items-center @5xl:justify-between @5xl:gap-8">
						<div className="flex flex-col gap-1">
							<span className="flex items-center gap-2 text-base font-bold tracking-tight whitespace-nowrap text-(--text-primary) @sm:text-lg">
								<Icon name="mail-rounded" height={20} width={20} className="shrink-0 text-(--sub-brand-primary)" />
								Subscribe to the DefiLlama Newsletter
							</span>
							<span className="max-w-md text-sm text-(--text-primary)/55">
								Get DefiLlama's newsletter, Research updates, or both, delivered to your inbox.
							</span>
						</div>
						<form
							onSubmit={handleSubmit}
							className="flex flex-col gap-3 @sm:flex-row @sm:flex-wrap @sm:items-center @5xl:shrink-0 @5xl:justify-end"
						>
							<div className="flex flex-wrap items-center gap-2" role="group" aria-label="Newsletters">
								{NEWSLETTERS.map(({ key, label }) => {
									const on = selected[key]
									return (
										<button
											key={key}
											type="button"
											aria-pressed={on}
											aria-label={`Subscribe to ${label}`}
											onClick={() => toggle(key)}
											disabled={isPending}
											className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
												on
													? 'border-(--sub-brand-primary) bg-(--sub-brand-primary)/10 text-(--sub-brand-primary)'
													: 'border-(--cards-border) text-(--text-secondary) hover:border-(--sub-brand-primary)/50'
											}`}
										>
											{on ? <Icon name="check" height={14} width={14} /> : null}
											{label.replace('DefiLlama ', '')}
										</button>
									)
								})}
							</div>
							<div className="flex flex-col gap-2 @sm:flex-row @sm:items-center">
								<input
									type="email"
									required
									aria-label="Email address"
									value={email}
									onChange={onEmailChange}
									placeholder="you@example.com"
									className="h-10 min-w-0 rounded-lg border border-(--cards-border) bg-(--bg-input) px-3 text-sm text-(--text-primary) outline-none focus-visible:border-(--sub-brand-primary) @sm:w-56"
								/>
								<button
									type="submit"
									aria-busy={isPending}
									disabled={!canSubmit}
									className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-(--sub-brand-primary) px-5 text-sm font-medium text-white transition-colors hover:bg-(--sub-brand-primary)/90 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isPending ? (
										spinner
									) : (
										<>
											Subscribe
											<Icon name="arrow-right" height={16} width={16} />
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-(--sub-border-slate-100) bg-white p-4 dark:border-(--sub-border-strong) dark:bg-(--sub-surface-dark)">
			<div className="flex items-center gap-2">
				<Icon name="mail-rounded" height={28} width={28} className="text-(--sub-ink-primary) dark:text-white" />
				<span className="text-base font-medium text-(--sub-ink-primary) dark:text-white">Newsletters</span>
			</div>

			{succeeded ? (
				<NewsletterSuccess layout="card" email={email} onReset={() => setSucceeded(false)} />
			) : (
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<label className="flex flex-col gap-1">
						<span className="text-xs text-(--sub-text-muted)">Subscribing as</span>
						<input
							type="email"
							required
							value={email}
							onChange={onEmailChange}
							placeholder="you@example.com"
							className="rounded-lg border border-(--sub-border-slate-100) bg-(--bg-input) px-3 py-2 text-sm text-(--sub-ink-primary) outline-none focus-visible:border-(--sub-brand-primary) dark:border-(--sub-border-strong) dark:text-white"
						/>
					</label>

					<div className="flex flex-col gap-4" role="group" aria-label="Newsletters">
						{NEWSLETTERS.map(({ key, label, description }) => (
							<div key={key} className="flex flex-col gap-1">
								<div className="flex items-center justify-between gap-4">
									<span className="text-sm text-(--sub-ink-primary) dark:text-white">{label}</span>
									<ToggleSwitch
										checked={selected[key]}
										onClick={() => toggle(key)}
										disabled={isPending}
										aria-label={`Subscribe to ${label}`}
									/>
								</div>
								<p className="max-w-[400px] text-xs leading-4 text-(--sub-text-muted)">{description}</p>
							</div>
						))}
					</div>

					<div className="flex flex-col gap-2">
						<button
							type="submit"
							aria-busy={isPending}
							aria-describedby={noneSelected ? helperId : undefined}
							disabled={!canSubmit}
							className="flex h-10 w-fit items-center gap-2 rounded-lg bg-(--sub-brand-primary) px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isPending ? (
								<>
									{spinner}
									Subscribing...
								</>
							) : (
								'Subscribe'
							)}
						</button>
						{noneSelected ? (
							<p id={helperId} className="text-xs text-(--sub-text-muted)">
								Select at least one newsletter.
							</p>
						) : null}
					</div>
				</form>
			)}
		</div>
	)
}

function NewsletterSuccess({
	layout,
	email,
	onReset
}: {
	layout: 'card' | 'strip'
	email: string
	onReset: () => void
}) {
	if (layout === 'strip') {
		return (
			<div role="status" className="flex items-center gap-2 text-sm text-(--text-primary)">
				<Icon name="check-circle" height={20} width={20} className="shrink-0 text-(--sub-brand-primary)" />
				<span>Subscribed — check your inbox to confirm.</span>
			</div>
		)
	}

	return (
		<div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-(--sub-brand-primary-alpha-8)">
				<Icon name="check-circle" height={28} width={28} className="text-(--sub-brand-primary)" />
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-base font-medium text-(--sub-ink-primary) dark:text-white">You're subscribed</span>
				<p className="max-w-[360px] text-xs leading-4 text-(--sub-text-muted)">
					Confirmation sent to <span className="font-medium">{email}</span>. Check your inbox to confirm.
				</p>
			</div>
			<button
				type="button"
				onClick={onReset}
				className="text-xs font-medium text-(--sub-brand-primary) hover:underline"
			>
				Manage newsletters
			</button>
		</div>
	)
}
