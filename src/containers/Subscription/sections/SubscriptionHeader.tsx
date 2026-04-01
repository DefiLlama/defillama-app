import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ThemeSwitch } from '~/components/Nav/ThemeSwitch'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'

function AccountLink({ className }: { className?: string }) {
	const { isAuthenticated, loaders } = useAuthContext()

	if (loaders.userLoading || !isAuthenticated) return null

	return (
		<BasicLink href="/account" className={`flex items-center gap-1.5 font-medium ${className}`}>
			<img src="/assets/account_avatar.png" alt="" className="h-6 w-6 rounded-full" />
			<span>My Account</span>
			<Icon name="chevron-right" height={16} width={16} />
		</BasicLink>
	)
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
					<SignInModal
						text="Sign-in"
						className="h-10 rounded-lg bg-(--sub-brand-primary) px-4 text-[14px] leading-[17px] font-medium text-white"
					/>
					<AccountLink className="text-sm text-(--sub-ink-primary) dark:text-white" />
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
					<SignInModal text="Sign-in" className="h-8 rounded-lg bg-(--sub-brand-primary) px-3 text-xs text-white" />
					<AccountLink className="text-xs text-(--sub-ink-primary) dark:text-white" />
				</div>
			</header>
		</>
	)
}
