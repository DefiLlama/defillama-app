import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import type { NavLink } from './api.types'

interface LiquidationsShellChromeProps {
	protocolLinks?: NavLink[]
	chainLinks?: NavLink[]
	activeProtocolLink?: string
	activeChainLink?: string
}

interface LiquidationsShellCardProps extends LiquidationsShellChromeProps {
	children: React.ReactNode
}

function LiquidationsShellChrome({
	protocolLinks,
	chainLinks,
	activeProtocolLink,
	activeChainLink
}: LiquidationsShellChromeProps) {
	return (
		<>
			{protocolLinks?.length ? <RowLinksWithDropdown links={protocolLinks} activeLink={activeProtocolLink} /> : null}
			{(chainLinks?.length ?? 0) > 2 ? <RowLinksWithDropdown links={chainLinks} activeLink={activeChainLink} /> : null}
		</>
	)
}

function LiquidationsShellCard({
	children,
	protocolLinks,
	chainLinks,
	activeProtocolLink,
	activeChainLink
}: LiquidationsShellCardProps) {
	return (
		<>
			<LiquidationsShellChrome
				protocolLinks={protocolLinks}
				chainLinks={chainLinks}
				activeProtocolLink={activeProtocolLink}
				activeChainLink={activeChainLink}
			/>

			<div className="flex min-h-[380px] w-full flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex max-w-xl flex-col items-center gap-3 px-6 py-8 text-center">{children}</div>
			</div>
		</>
	)
}

export function LiquidationsShellLoader(props: LiquidationsShellChromeProps) {
	return (
		<LiquidationsShellCard {...props}>
			<LocalLoader />
			<p className="text-sm text-(--text-label)">Loading liquidations data...</p>
		</LiquidationsShellCard>
	)
}

export function LiquidationsShellError({
	errorMessage,
	...props
}: LiquidationsShellChromeProps & { errorMessage: string }) {
	return (
		<LiquidationsShellCard {...props}>
			<p className="text-sm text-(--text-label)">{errorMessage}</p>
		</LiquidationsShellCard>
	)
}

export function LiquidationsAccessGate(props: LiquidationsShellChromeProps) {
	const router = useRouter()
	const signInDialogStore = Ariakit.useDialogStore()
	const { isAuthenticated, loaders } = useAuthContext()

	if (loaders.userLoading) {
		return <LiquidationsShellLoader {...props} />
	}

	return (
		<>
			<LiquidationsShellCard {...props}>
				{!isAuthenticated ? (
					<p className="text-sm text-(--text-label)">
						An{' '}
						<button type="button" onClick={signInDialogStore.show} className="underline">
							active subscription
						</button>{' '}
						is required to view liquidations data.
					</p>
				) : (
					<p className="text-sm text-(--text-label)">
						An{' '}
						<BasicLink href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`} className="underline">
							active subscription
						</BasicLink>{' '}
						is required to view liquidations data.
					</p>
				)}
			</LiquidationsShellCard>

			<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
		</>
	)
}
