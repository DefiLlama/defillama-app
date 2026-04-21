import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { UnlocksCharts } from '~/containers/Unlocks/EmissionsByProtocol'
import type { ProtocolEmissionResult } from '~/containers/Unlocks/types'

const TOKEN_UNLOCKS_SECTION_ID = 'token-unlocks'

async function fetchTokenUnlocksClient(
	resolvedUnlocksSlug: string,
	authorizedFetch: (url: string) => Promise<Response | null>
): Promise<ProtocolEmissionResult> {
	const res = await authorizedFetch(`/api/token-unlocks/${encodeURIComponent(resolvedUnlocksSlug)}`)
	if (!res) {
		throw new Error('Authentication required')
	}
	if (!res.ok) {
		const errorData = await res.json().catch(() => null)
		throw new Error(errorData?.error ?? `Failed to fetch token unlocks: ${res.status}`)
	}
	return res.json()
}

export function TokenUnlocksSection({ resolvedUnlocksSlug }: { resolvedUnlocksSlug?: string | null }) {
	const router = useRouter()
	const signInDialogStore = Ariakit.useDialogStore()
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = useAuthContext()
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

	const sectionHeader = (
		<div className="flex items-center gap-2 border-b border-(--cards-border) p-3">
			<h2
				className="group relative flex scroll-mt-4 items-center gap-1 text-xl font-bold"
				id={TOKEN_UNLOCKS_SECTION_ID}
			>
				Unlocks
				<a
					aria-hidden="true"
					tabIndex={-1}
					href={`#${TOKEN_UNLOCKS_SECTION_ID}`}
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
		</div>
	)

	if (loaders.userLoading || isLoading) {
		return (
			<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{sectionHeader}
				<div className="flex min-h-[80dvh] items-center justify-center p-3 sm:min-h-[572px]">
					<LocalLoader />
				</div>
			</section>
		)
	}

	if (!isAuthenticated || !hasActiveSubscription) {
		return (
			<>
				<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{sectionHeader}
					<div className="flex min-h-[80dvh] items-center justify-center px-4 text-center sm:min-h-[572px]">
						{!isAuthenticated ? (
							<p className="text-sm text-(--text-label)">
								An{' '}
								<button type="button" onClick={signInDialogStore.show} className="underline">
									active subscription
								</button>{' '}
								is required to view token unlocks.
							</p>
						) : (
							<p className="text-sm text-(--text-label)">
								An{' '}
								<BasicLink href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`} className="underline">
									active subscription
								</BasicLink>{' '}
								is required to view token unlocks.
							</p>
						)}
					</div>
				</section>
				<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
			</>
		)
	}

	if (error != null || data == null) {
		return (
			<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{sectionHeader}
				<div className="flex min-h-[80dvh] items-center justify-center p-6 text-center sm:min-h-[572px]">
					<p className="max-w-md text-sm text-(--text-label)">
						{error instanceof Error ? error.message : 'Failed to load token unlocks.'}
					</p>
				</div>
			</section>
		)
	}

	return (
		<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			{sectionHeader}
			<div className="flex flex-col gap-2 p-3">
				<UnlocksCharts
					protocolName={resolvedUnlocksSlug}
					initialData={data}
					disableClientTokenStatsFetch
					hideTokenStats
					isEmissionsPage={false}
				/>
			</div>
		</section>
	)
}
