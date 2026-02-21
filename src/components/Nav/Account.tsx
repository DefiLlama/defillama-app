import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks/useIsClient'

interface AuthUser {
	authMethod?: string
	ethereum_email?: string
	email?: string
	walletAddress?: string
}

export const resolveUserEmail = (user: AuthUser | null | undefined): string | null => {
	if (!user) return null
	if (user.authMethod === 'ethereum') {
		return user.ethereum_email || null
	}
	return user.email || null
}

export function Account() {
	const { asPath } = useRouter()
	const { isAuthenticated, user, logout, loaders, hasActiveSubscription } = useAuthContext()
	const isClient = useIsClient()

	if (!isClient) {
		return <div className="flex min-h-7 w-full items-center justify-center" />
	}

	return (
		<>
			{loaders?.userLoading ? (
				<div className="flex min-h-7 w-full items-center justify-center">
					<p className="flex items-center gap-1">
						Loading
						<LoadingDots />
					</p>
				</div>
			) : (
				<>
					{isAuthenticated && user ? (
						<div className="flex flex-col gap-1.5">
							<BasicLink
								href="/account"
								className="flex items-center gap-1.5 truncate text-sm font-medium text-(--text-label) hover:text-(--link-text) hover:underline"
							>
								<Icon name="users" className="h-4 w-4 shrink-0" />
								Manage account
							</BasicLink>
							{hasActiveSubscription ? (
								<span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-500">
									<Icon name="check-circle" className="h-3.5 w-3.5" />
									Subscribed
								</span>
							) : (
								<>
									<span className="flex items-center gap-1 text-xs font-medium text-(--error)">
										Subscription inactive
									</span>
									<BasicLink
										href="/subscription"
										className="flex items-center gap-1 text-xs font-medium text-(--link) hover:underline"
									>
										<Icon name="plus" className="h-3.5 w-3.5" />
										Upgrade
									</BasicLink>
								</>
							)}
							<button
								onClick={logout}
								className="flex items-center justify-center gap-2 rounded-md bg-red-500/10 p-1 text-sm font-medium text-(--error)"
							>
								<Icon name="x" className="h-4 w-4" />
								Logout
							</button>
						</div>
					) : (
						<BasicLink
							href={`/subscription?returnUrl=${encodeURIComponent(asPath)}`}
							className="flex items-center justify-center gap-2 rounded-md pro-btn-purple p-1 text-sm font-medium"
						>
							<Icon name="users" className="h-4 w-4" />
							Sign In / Subscribe
						</BasicLink>
					)}
				</>
			)}
		</>
	)
}
