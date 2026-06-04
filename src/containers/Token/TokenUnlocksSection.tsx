import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import type { ProtocolEmissionResult } from '~/containers/Unlocks/types'
import { handleSimpleFetchResponse } from '~/utils/async'
import { TokenPrivateSectionGate, useTokenPrivateSectionAccess } from './TokenPrivateSectionGate'

const TOKEN_UNLOCKS_SECTION_ID = 'token-unlocks'

const DeferredUnlocksCharts = dynamic(
	() => import('~/containers/Unlocks/EmissionsByProtocol').then((mod) => mod.UnlocksCharts),
	{
		loading: () => <div className="min-h-[572px]" />
	}
)

async function fetchTokenUnlocksClient(
	resolvedUnlocksSlug: string,
	authorizedFetch: (url: string) => Promise<Response | null>
): Promise<ProtocolEmissionResult> {
	const res = await authorizedFetch(`/api/private/token-unlocks/${encodeURIComponent(resolvedUnlocksSlug)}`)
	if (!res) throw new Error('Authentication required')
	return handleSimpleFetchResponse(res).then((response) => response.json() as Promise<ProtocolEmissionResult>)
}

export function TokenUnlocksSection({ resolvedUnlocksSlug }: { resolvedUnlocksSlug?: string | null }) {
	const access = useTokenPrivateSectionAccess()
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = access
	const isEnabled = Boolean(resolvedUnlocksSlug)
	const { data, error, isLoading } = useQuery<ProtocolEmissionResult>({
		queryKey: ['token-unlocks', resolvedUnlocksSlug],
		queryFn: () => fetchTokenUnlocksClient(resolvedUnlocksSlug!, authorizedFetch),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		refetchOnWindowFocus: false,
		throwOnError: false,
		enabled: isEnabled && isAuthenticated && hasActiveSubscription && !loaders.userLoading
	})

	if (!resolvedUnlocksSlug) {
		return null
	}

	const canReadPrivateSection = isAuthenticated && hasActiveSubscription && !loaders.userLoading
	const unlocksError =
		error ?? (canReadPrivateSection && !isLoading && data == null ? new Error('Failed to load token unlocks.') : null)

	return (
		<TokenPrivateSectionGate
			access={access}
			title="Unlocks"
			sectionId={TOKEN_UNLOCKS_SECTION_ID}
			contentLabel="token unlocks"
			isLoading={isLoading}
			error={unlocksError}
			errorMessage="Failed to load token unlocks."
			bodyClassName="flex flex-col gap-2 p-3"
		>
			{data ? (
				<DeferredUnlocksCharts
					protocolName={resolvedUnlocksSlug}
					initialData={data}
					disableClientTokenStatsFetch
					hideTokenStats
					isEmissionsPage={false}
				/>
			) : null}
		</TokenPrivateSectionGate>
	)
}
