import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'

export function useTokenPrivateSectionAccess() {
	const signInDialogStore = Ariakit.useDialogStore()
	const auth = useAuthContext()

	return {
		...auth,
		signInDialogStore
	}
}

type TokenPrivateSectionAccess = ReturnType<typeof useTokenPrivateSectionAccess>

export function TokenPrivateSectionGate({
	access,
	title,
	sectionId,
	contentLabel,
	isLoading,
	error,
	errorMessage,
	emptyMessage,
	headerActions,
	bodyClassName = 'flex flex-1 flex-col p-3',
	children
}: {
	access: TokenPrivateSectionAccess
	title: string
	sectionId: string
	contentLabel: string
	isLoading?: boolean
	error?: Error | null
	errorMessage: string
	emptyMessage?: string | null
	headerActions?: ReactNode
	bodyClassName?: string
	children: ReactNode
}) {
	const router = useRouter()
	const { hasActiveSubscription, isAuthenticated, loaders, signInDialogStore } = access
	const isGateLoading = loaders.userLoading || Boolean(isLoading)
	const hasPlaceholderState =
		isGateLoading || !isAuthenticated || !hasActiveSubscription || error != null || emptyMessage != null
	const sectionBodyClassName = hasPlaceholderState ? `${bodyClassName} flex-1` : bodyClassName

	return (
		<>
			<section
				className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
					hasPlaceholderState ? ' min-h-[80dvh] sm:min-h-[572px]' : ''
				}`}
			>
				<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
					<h2 className="group relative flex scroll-mt-24 items-center gap-1 text-xl font-bold" id={sectionId}>
						{title}
						<a
							aria-hidden="true"
							tabIndex={-1}
							href={`#${sectionId}`}
							className="absolute top-0 right-0 z-10 flex size-full items-center"
						/>
						<Icon name="link" className="invisible size-3.5 group-hover:visible group-focus-visible:visible" />
					</h2>

					{headerActions}
				</div>

				<div className={sectionBodyClassName}>
					{isGateLoading ? (
						<div className="flex flex-1 items-center justify-center">
							<LocalLoader />
						</div>
					) : !isAuthenticated || !hasActiveSubscription ? (
						<div className="flex flex-1 items-center justify-center px-4 text-center">
							{!isAuthenticated ? (
								<p className="text-sm text-(--text-label)">
									An{' '}
									<button type="button" onClick={signInDialogStore.show} className="underline">
										active subscription
									</button>{' '}
									is required to view {contentLabel}.
								</p>
							) : (
								<p className="text-sm text-(--text-label)">
									An{' '}
									<BasicLink
										href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}
										className="underline"
									>
										active subscription
									</BasicLink>{' '}
									is required to view {contentLabel}.
								</p>
							)}
						</div>
					) : error != null ? (
						<div className="flex flex-1 items-center justify-center px-4 text-center">
							<p className="max-w-md text-sm text-(--text-label)">{error.message || errorMessage}</p>
						</div>
					) : emptyMessage != null ? (
						<div className="flex flex-1 items-center justify-center px-4 text-center">
							<p className="text-sm text-(--text-label)">{emptyMessage}</p>
						</div>
					) : (
						children
					)}
				</div>
			</section>

			<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
		</>
	)
}
