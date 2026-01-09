import { memo } from 'react'
import { useRouter } from 'next/router'
import { LoadingDots } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks/useIsClient'
import { formatEthAddress } from '~/utils'
import { Icon } from '../Icon'
import { BasicLink } from '../Link'
import { Tooltip } from '../Tooltip'

export const resolveUserEmail = (user: any): string | null => {
	if (!user) return null
	if (user.authMethod === 'ethereum') {
		return user.ethereum_email || null
	}
	return user.email || null
}

const resolveUserHandle = (user: any): string => {
	return resolveUserEmail(user) || formatEthAddress(user?.walletAddress) || ''
}

export const Account = memo(function Account({ isCollapsed = false }: { isCollapsed?: boolean }) {
	const { asPath } = useRouter()
	const { isAuthenticated, user, logout, loaders, hasActiveSubscription } = useAuthContext()
	const isClient = useIsClient()

	const userHandle = resolveUserHandle(user)

	if (!isClient) {
		return <div className="flex min-h-7 w-full items-center justify-center" />
	}

	if (isCollapsed) {
		if (loaders?.userLoading) {
			return (
				<div className="flex min-h-10 w-10 items-center justify-center">
					<LoadingDots />
				</div>
			)
		}

		if (isAuthenticated && user) {
			return (
				<div className="flex flex-col gap-2">
					<Tooltip content={userHandle} placement="right">
						<BasicLink
							href="/account"
							className="bg-pro-purple-100 text-pro-purple-400 hover:bg-pro-purple-300/20 dark:bg-pro-purple-300/20 dark:text-pro-purple-200 hover:dark:bg-pro-purple-300/30 relative flex h-10 w-10 items-center justify-center rounded-md"
						>
							<Icon name="users" className="h-5 w-5 shrink-0" />
							{hasActiveSubscription ? (
								<span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-(--app-bg) bg-green-600 dark:bg-green-500">
									<Icon name="check-circle" className="h-2.5 w-2.5 text-white" />
								</span>
							) : (
								<span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-(--app-bg) bg-(--error)">
									<Icon name="x" className="h-2 w-2 text-white" />
								</span>
							)}
						</BasicLink>
					</Tooltip>
					<Tooltip content="Logout" placement="right">
						<button
							onClick={logout}
							className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500/10 hover:bg-red-500/20"
						>
							<Icon name="x" className="h-5 w-5 shrink-0 text-(--error)" />
						</button>
					</Tooltip>
				</div>
			)
		}

		// Signed out - show icon with purple background and tooltip
		return (
			<Tooltip content="Sign In / Subscribe" placement="right">
				<BasicLink
					href={`/subscription?returnUrl=${encodeURIComponent(asPath)}`}
					className="bg-pro-purple-100 text-pro-purple-400 hover:bg-pro-purple-300/20 dark:bg-pro-purple-300/20 dark:text-pro-purple-200 hover:dark:bg-pro-purple-300/30 flex h-10 w-10 items-center justify-center rounded-md"
				>
					<Icon name="users" className="h-5 w-5 shrink-0" />
				</BasicLink>
			</Tooltip>
		)
	}

	// Expanded state
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
								{userHandle}
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
							className="pro-btn-purple flex items-center justify-center gap-2 rounded-md p-1 text-sm font-medium"
						>
							<Icon name="users" className="h-4 w-4" />
							Sign In / Subscribe
						</BasicLink>
					)}
				</>
			)}
		</>
	)
})
