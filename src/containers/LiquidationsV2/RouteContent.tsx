import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '~/containers/Subscription/auth'
import { LiquidationsAccessGate, LiquidationsShellError, LiquidationsShellLoader } from './AccessGate'
import { fetchLiquidationsChainClient, fetchLiquidationsOverviewClient, fetchLiquidationsProtocolClient } from './api'
import type { LiquidationsChainShell, LiquidationsOverviewShell, LiquidationsProtocolShell } from './api.types'
import { LiquidationsChainPage } from './ChainPage'
import { LiquidationsOverview } from './index'
import { LiquidationsProtocolPage } from './ProtocolPage'

const LIQUIDATIONS_STALE_TIME = 60 * 60 * 1000

export function LiquidationsOverviewRouteContent({ shell }: { shell: LiquidationsOverviewShell }) {
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = useAuthContext()
	const canFetch = isAuthenticated && Boolean(hasActiveSubscription)
	const query = useQuery({
		queryKey: ['liquidations-v2', 'overview'],
		queryFn: () => fetchLiquidationsOverviewClient(authorizedFetch),
		staleTime: LIQUIDATIONS_STALE_TIME,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: canFetch && !loaders.userLoading
	})

	if (loaders.userLoading || (canFetch && query.isLoading)) {
		return <LiquidationsShellLoader protocolLinks={shell.protocolLinks} activeProtocolLink="Overview" />
	}

	if (!canFetch) {
		return <LiquidationsAccessGate protocolLinks={shell.protocolLinks} activeProtocolLink="Overview" />
	}

	if (query.error) {
		return (
			<LiquidationsShellError
				protocolLinks={shell.protocolLinks}
				activeProtocolLink="Overview"
				errorMessage={query.error.message}
			/>
		)
	}

	if (!query.data) {
		return <LiquidationsShellLoader protocolLinks={shell.protocolLinks} activeProtocolLink="Overview" />
	}

	return <LiquidationsOverview {...query.data} />
}

export function LiquidationsProtocolRouteContent({ shell }: { shell: LiquidationsProtocolShell }) {
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = useAuthContext()
	const canFetch = isAuthenticated && Boolean(hasActiveSubscription)
	const query = useQuery({
		queryKey: ['liquidations-v2', 'protocol', shell.protocolSlug],
		queryFn: () => fetchLiquidationsProtocolClient(shell.protocolSlug, authorizedFetch),
		staleTime: LIQUIDATIONS_STALE_TIME,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: canFetch && !loaders.userLoading
	})

	if (loaders.userLoading || (canFetch && query.isLoading)) {
		return (
			<LiquidationsShellLoader
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink="All Chains"
			/>
		)
	}

	if (!canFetch) {
		return (
			<LiquidationsAccessGate
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink="All Chains"
			/>
		)
	}

	if (query.error) {
		return (
			<LiquidationsShellError
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink="All Chains"
				errorMessage={query.error.message}
			/>
		)
	}

	if (!query.data) {
		return (
			<LiquidationsShellLoader
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink="All Chains"
			/>
		)
	}

	return <LiquidationsProtocolPage {...query.data} />
}

export function LiquidationsChainRouteContent({ shell }: { shell: LiquidationsChainShell }) {
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = useAuthContext()
	const canFetch = isAuthenticated && Boolean(hasActiveSubscription)
	const query = useQuery({
		queryKey: ['liquidations-v2', 'chain', shell.protocolSlug, shell.chainSlug],
		queryFn: () => fetchLiquidationsChainClient(shell.protocolSlug, shell.chainSlug, authorizedFetch),
		staleTime: LIQUIDATIONS_STALE_TIME,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: canFetch && !loaders.userLoading
	})

	if (loaders.userLoading || (canFetch && query.isLoading)) {
		return (
			<LiquidationsShellLoader
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink={shell.chainName}
			/>
		)
	}

	if (!canFetch) {
		return (
			<LiquidationsAccessGate
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink={shell.chainName}
			/>
		)
	}

	if (query.error) {
		return (
			<LiquidationsShellError
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink={shell.chainName}
				errorMessage={query.error.message}
			/>
		)
	}

	if (!query.data) {
		return (
			<LiquidationsShellLoader
				protocolLinks={shell.protocolLinks}
				activeProtocolLink={shell.protocolName}
				chainLinks={shell.chainLinks}
				activeChainLink={shell.chainName}
			/>
		)
	}

	return <LiquidationsChainPage {...query.data} />
}
