import { useAuthContext } from '~/containers/Subscribtion/auth'
import { SignIn2Modal } from '~/containers/subscription/SignIn2'
import { AuthenticationCard } from './AuthenticationCard'
import { useDevOverrides } from './DevToolbar' // [DEV-TOOLBAR] remove before production
import { SettingsCard } from './SettingsCard'
import { SubscriptionSection } from './SubscriptionSection'
import { UserHeader } from './UserHeader'

export function ManageAccount() {
	const dev = useDevOverrides() // [DEV-TOOLBAR] remove before production
	const realAuth = useAuthContext()
	const { user, logout, isAuthenticated, loaders } = dev?.auth ?? realAuth // [DEV-TOOLBAR] revert to: const { user, logout, isAuthenticated, loaders } = useAuthContext()

	if (loaders.userLoading) {
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
				<SignIn2Modal
					text="Sign In"
					className="flex h-10 items-center gap-2 rounded-lg bg-(--sub-brand-primary) px-5 text-sm font-medium text-white"
				/>
			</div>
		)
	}

	const hasEmailAuth = !!user?.email
	const displayName = hasEmailAuth
		? user.email
		: user?.walletAddress
			? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
			: ''

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
