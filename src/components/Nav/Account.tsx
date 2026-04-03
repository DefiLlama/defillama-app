import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { useIsClient } from '~/hooks/useIsClient'

export function Account({ asPath: _asPath }: { asPath: string }) {
	const { isAuthenticated, user, hasActiveSubscription, loaders } = useAuthContext()
	const isClient = useIsClient()

	if (!isClient) {
		return <div className="flex min-h-7 w-full items-center justify-center" />
	}

	if (loaders?.userLoading) {
		return (
			<div className="flex min-h-7 w-full items-center justify-center">
				<p className="flex items-center gap-1">
					Loading
					<LoadingDots />
				</p>
			</div>
		)
	}

	if (isAuthenticated && user) {
		return (
			<BasicLink href="/account" className="flex w-full items-center gap-3 rounded-lg p-1 hover:bg-white/5">
				<img src="/assets/account_avatar.png" alt="Account avatar" className="h-6 w-6 shrink-0 rounded-full" />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-xs leading-4 font-medium text-(--text1)">My Account</span>
					<span
						className={`truncate text-[10px] leading-[14px] font-medium ${hasActiveSubscription ? 'text-green-500' : 'text-(--text3)'}`}
					>
						{hasActiveSubscription ? 'Active Subscription' : 'No Subscription'}
					</span>
				</div>
				<Icon name="chevron-right" className="h-5 w-5 shrink-0 text-(--text3)" />
			</BasicLink>
		)
	}

	return (
		<SignInModal
			text="Sign In / Subscribe"
			className="flex items-center justify-center gap-2 rounded-md pro-btn-purple p-1 text-sm font-medium"
			hideWhenAuthenticated={false}
		/>
	)
}
