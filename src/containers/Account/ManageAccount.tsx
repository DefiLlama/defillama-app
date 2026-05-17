import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { useIsClient } from '~/hooks/useIsClient'
import { AuthenticationCard } from './AuthenticationCard'
import { SettingsCard } from './SettingsCard'
import { SubscriptionSection } from './SubscriptionSection'
import { TeamTab } from './Team/TeamTab'
import { UserHeader } from './UserHeader'
import { isWalletEmail, truncateAddress } from './utils'

export function ManageAccount() {
	const isClient = useIsClient()
	const router = useRouter()
	const { user, logout, isAuthenticated, loaders } = useAuthContext()

	const queryTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab
	const [selectedTabId, setSelectedTabId] = useState<string>('account')

	// Sync tab state from URL (handles initial load + back/forward navigation)
	useEffect(() => {
		setSelectedTabId(queryTab === 'team' ? 'team' : 'account')
	}, [queryTab])

	const tabStore = Ariakit.useTabStore({
		selectedId: selectedTabId,
		setSelectedId: (id) => {
			if (!id) return
			setSelectedTabId(id)
			const { tab: _ignored, ...rest } = router.query
			const nextQuery = id === 'account' ? rest : { ...rest, tab: id }
			void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		}
	})

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

			<Ariakit.TabProvider store={tabStore}>
				<Ariakit.TabList className="flex gap-4 border-b border-(--sub-border-slate-100) dark:border-(--sub-border-strong)">
					<Ariakit.Tab
						id="account"
						className={`pb-2.5 text-sm font-semibold transition-colors ${
							selectedTabId === 'account'
								? 'border-b-2 border-(--sub-brand-primary) text-(--sub-brand-primary)'
								: 'text-(--sub-text-muted) hover:text-(--sub-ink-primary) dark:hover:text-white'
						}`}
					>
						Account
					</Ariakit.Tab>
					<Ariakit.Tab
						id="team"
						className={`pb-2.5 text-sm font-semibold transition-colors ${
							selectedTabId === 'team'
								? 'border-b-2 border-(--sub-brand-primary) text-(--sub-brand-primary)'
								: 'text-(--sub-text-muted) hover:text-(--sub-ink-primary) dark:hover:text-white'
						}`}
					>
						Team
					</Ariakit.Tab>
				</Ariakit.TabList>

				<Ariakit.TabPanel tabId="account">
					<div className="flex flex-col gap-3">
						<AuthenticationCard />
						<SettingsCard />
						<SubscriptionSection />
					</div>
				</Ariakit.TabPanel>

				<Ariakit.TabPanel tabId="team">
					<TeamTab />
				</Ariakit.TabPanel>
			</Ariakit.TabProvider>
		</div>
	)
}
