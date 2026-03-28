import { useAuthContext } from '~/containers/Subscribtion/auth'
import { AuthenticationCard } from './AuthenticationCard'
import { useDevOverrides } from './DevToolbar' // [DEV-TOOLBAR] remove before production
import { SettingsCard } from './SettingsCard'
import { SubscriptionSection } from './SubscriptionSection'
import { UserHeader } from './UserHeader'

export function ManageAccount() {
	const dev = useDevOverrides() // [DEV-TOOLBAR] remove before production
	const realAuth = useAuthContext()
	const { user, logout } = dev?.auth ?? realAuth // [DEV-TOOLBAR] revert to: const { user, logout } = useAuthContext()

	const hasEmailAuth = !!user?.email
	const displayName = hasEmailAuth
		? user.email
		: user?.walletAddress
			? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
			: ''

	return (
		<div className="flex flex-col gap-8">
			<h1 className="text-xl font-semibold text-(--sub-c-090b0c) dark:text-white">Manage Account</h1>
			<UserHeader displayName={displayName} onLogout={logout} />
			<div className="flex flex-col gap-3">
				<AuthenticationCard />
				<SettingsCard />
				<SubscriptionSection />
			</div>
		</div>
	)
}
