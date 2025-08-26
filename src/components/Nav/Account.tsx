import { useRouter } from 'next/router'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/hooks/useSubscribe'
import { Icon } from '../Icon'
import { BasicLink } from '../Link'

export const Account = () => {
	const { asPath } = useRouter()
	const { isAuthenticated, user, logout, loaders } = useAuthContext()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const isAccountLoading = loaders?.userLoading || (isAuthenticated && isSubscriptionLoading)

	return (
		<>
			{isAccountLoading ? (
				<div className="flex min-h-7 w-full items-center justify-center">
					<p>Loading...</p>
				</div>
			) : (
				<>
					{isAuthenticated ? (
						<div className="flex flex-col gap-1.5">
							{user && (
								<BasicLink
									href="/subscription"
									className="flex items-center gap-1.5 truncate px-1 text-sm font-medium text-(--text-form) hover:text-(--link)"
								>
									<Icon name="users" className="h-4 w-4 shrink-0" />
									{user.email}
								</BasicLink>
							)}
							{subscription?.status === 'active' ? (
								<span className="flex items-center gap-1 px-1 text-xs font-medium text-green-600 dark:text-green-500">
									<Icon name="check-circle" className="h-3.5 w-3.5" />
									Subscribed
								</span>
							) : (
								user && (
									<>
										<span className="flex items-center gap-1 px-1 text-xs font-medium text-(--error)">
											Subscription inactive
										</span>
										<BasicLink
											href="/subscription"
											className="flex items-center gap-1 px-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400"
										>
											<Icon name="plus" className="h-3.5 w-3.5" />
											Upgrade
										</BasicLink>
									</>
								)
							)}
							<button
								onClick={logout}
								className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 p-1 text-sm font-medium text-red-500 transition-colors duration-200 hover:bg-red-500/20"
							>
								<Icon name="x" className="h-4 w-4" />
								Logout
							</button>
						</div>
					) : (
						<BasicLink
							href={`/subscription?returnUrl=${encodeURIComponent(asPath)}`}
							className="flex items-center justify-center gap-2 rounded-lg bg-[#e8e8f7] p-1 text-sm font-medium text-[#5959d2] transition-colors duration-200 hover:bg-[#5C5CF9]/20 dark:bg-[#111324] dark:text-[#6c6cff]"
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
