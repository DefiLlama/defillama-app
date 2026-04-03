import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '~/components/Nav/ThemeSwitch'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { useIsClient } from '~/hooks/useIsClient'

function AuthActions({
	skeletonClassName,
	signInClassName,
	accountClassName
}: {
	skeletonClassName: string
	signInClassName: string
	accountClassName: string
}) {
	const isClient = useIsClient()
	const { isAuthenticated, loaders } = useAuthContext()

	if (!isClient || loaders.userLoading) {
		return (
			<div
				className={`animate-pulse rounded-lg bg-(--sub-border-slate-100) dark:bg-(--sub-border-strong) ${skeletonClassName}`}
			/>
		)
	}

	if (isAuthenticated) {
		return (
			<BasicLink href="/account" className={`flex items-center gap-1.5 font-medium ${accountClassName}`}>
				<img src="/assets/account_avatar.png" alt="" className="h-6 w-6 rounded-full" />
				<span>My Account</span>
				<Icon name="chevron-right" height={16} width={16} />
			</BasicLink>
		)
	}

	return <SignInModal text="Sign-in" className={signInClassName} />
}

export function SubscriptionHeader() {
	return (
		<>
			{/* Mobile */}
			<header className="relative z-20 flex h-16 items-center justify-between bg-(--sub-overlay-light) px-4 backdrop-blur-[12px] md:hidden dark:bg-(--sub-overlay-dark)">
				<BasicLink
					href="/"
					aria-label="Back to home"
					className="flex h-10 w-10 items-center justify-center rounded-full"
				>
					<Icon name="chevron-left" height={28} width={28} />
				</BasicLink>
				<div className="flex items-center gap-4">
					<ThemeSwitch variant="pill" />
					<AuthActions
						skeletonClassName="h-10 w-[88px]"
						signInClassName="h-10 rounded-lg bg-(--sub-brand-primary) px-4 text-[14px] leading-[17px] font-medium text-white"
						accountClassName="text-sm text-(--sub-ink-primary) dark:text-white"
					/>
				</div>
			</header>

			{/* Desktop */}
			<header className="relative z-20 hidden h-12 items-center justify-between bg-(--sub-overlay-light) px-[42px] backdrop-blur-[12px] md:flex dark:bg-(--sub-overlay-dark)">
				<BasicLink href="/" className="flex items-center gap-2 text-xs text-(--sub-ink-primary) dark:text-white">
					<Icon name="chevron-left" height={16} width={16} />
					Back
				</BasicLink>
				<div className="flex items-center gap-5">
					<ThemeSwitch variant="pill" size="sm" />
					<AuthActions
						skeletonClassName="h-8 w-[72px]"
						signInClassName="h-8 rounded-lg bg-(--sub-brand-primary) px-3 text-xs text-white"
						accountClassName="text-xs text-(--sub-ink-primary) dark:text-white"
					/>
				</div>
			</header>
		</>
	)
}
