import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { useIsClient } from '~/hooks/useIsClient'
import { AuthenticationCard } from './AuthenticationCard'
import { SettingsCard } from './SettingsCard'
import { SubscriptionSection } from './SubscriptionSection'
import { UserHeader } from './UserHeader'
import { isWalletEmail, truncateAddress } from './utils'

export function ManageAccount() {
	const isClient = useIsClient()
	const { user, logout, isAuthenticated, loaders } = useAuthContext()

	if (!isClient || loaders.userLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--sub-brand-primary) border-t-transparent" />
			</div>
		)
	}

	if (!isAuthenticated || !user) {
		return (
			<div className="flex flex-col items-center gap-6 py-16">
				<img src="/assets/account_avatar.png" alt="" className="h-16 w-16 rounded-full" />
				<div className="flex flex-col gap-2 text-center">
					<h2 className="text-xl font-semibold text-(--sub-ink-primary) dark:text-white">Account Access Required</h2>
					<p className="max-w-md text-sm text-(--sub-text-muted)">
						Please sign in to view and manage your account information and subscription details.
					</p>
				</div>
				<SignInModal
					text="Sign In"
					className="flex h-10 items-center gap-2 rounded-lg bg-(--sub-brand-primary) px-5 text-sm font-medium text-white"
				/>
			</div>
		)
	}

	const displayName = isWalletEmail(user.email) ? truncateAddress(user.walletAddress) : user.email

	return (
		<div className="flex flex-col gap-8">
			<h1 className="text-xl font-semibold text-(--sub-ink-primary) dark:text-white">Manage Account</h1>
			<UserHeader displayName={displayName} onLogout={logout} />
			<div className="flex flex-col gap-3">
				<AuthenticationCard />
				<SettingsCard />
				<SubscriptionSection />
			</div>
		</div>
	)
}
