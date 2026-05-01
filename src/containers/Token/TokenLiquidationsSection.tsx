import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { TokenLogo } from '~/components/TokenLogo'
import { LiquidationsTableTabs } from '~/containers/LiquidationsV2/TableTabs'
import { useAuthContext } from '~/containers/Subscription/auth'
import { SignInModal } from '~/containers/Subscription/SignInModal'
import { formattedNum } from '~/utils'
import { fetchTokenLiquidationsForAliases } from '../LiquidationsV2/api'
import type { OverviewChainRow, OverviewProtocolRow, TokenLiquidationsSectionData } from '../LiquidationsV2/api.types'

const TOKEN_LIQUIDATIONS_SECTION_ID = 'token-liquidations'
const TABS = [
	{ id: 'protocols', label: 'Protocols' },
	{ id: 'chains', label: 'Chains' }
] as const

const DeferredLiquidationsSummaryStats = dynamic(
	() => import('~/containers/LiquidationsV2/Summary').then((mod) => mod.LiquidationsSummaryStats),
	{
		loading: () => <div className="min-h-24" />
	}
)

const DeferredLiquidationsDistributionChart = dynamic(
	() =>
		import('~/containers/LiquidationsV2/LiquidationsDistributionChart').then(
			(mod) => mod.LiquidationsDistributionChart
		),
	{
		loading: () => <div className="min-h-[360px]" />
	}
)

const DeferredTableWithSearch = dynamic(
	() => import('~/components/Table/TableWithSearch').then((mod) => mod.TableWithSearch),
	{
		loading: () => <div className="min-h-[360px]" />
	}
) as typeof import('~/components/Table/TableWithSearch').TableWithSearch

const protocolColumnHelper = createColumnHelper<OverviewProtocolRow>()
const chainColumnHelper = createColumnHelper<OverviewChainRow>()

const protocolColumns = [
	protocolColumnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ row, getValue }) => {
			const protocol = getValue()

			return (
				<span className="flex items-center gap-2">
					<TokenLogo name={protocol} kind="token" data-lgonly alt={`Logo of ${protocol}`} />
					<BasicLink href={`/liquidations/${row.original.slug}`} className="text-(--link-text) hover:underline">
						{protocol}
					</BasicLink>
				</span>
			)
		}
	}),
	protocolColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.chainCount ?? undefined, {
		id: 'chainCount',
		header: 'Chains',
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: { align: 'end' }
	})
]

const chainColumns = [
	chainColumnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const chain = getValue()

			return (
				<span className="flex items-center gap-2">
					<TokenLogo name={chain} kind="chain" data-lgonly alt={`Logo of ${chain}`} />
					<span>{chain}</span>
				</span>
			)
		}
	}),
	chainColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		meta: { align: 'end' }
	}),
	chainColumnHelper.accessor((row) => row.protocolCount ?? undefined, {
		id: 'protocolCount',
		header: 'Protocols',
		meta: { align: 'end' }
	}),
	chainColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: { align: 'end' }
	})
]

async function fetchTokenLiquidationsRows(
	tokenSymbol: string,
	authorizedFetch: (url: string) => Promise<Response | null>
): Promise<TokenLiquidationsSectionData | null> {
	return fetchTokenLiquidationsForAliases(tokenSymbol, authorizedFetch)
}

export function TokenLiquidationsSection({ tokenSymbol }: { tokenSymbol: string }) {
	const router = useRouter()
	const signInDialogStore = Ariakit.useDialogStore()
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = useAuthContext()
	const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('protocols')
	const handleSetActiveTab = (tab: (typeof TABS)[number]['id']) => setActiveTab(tab)
	const { data, error, isLoading } = useQuery({
		queryKey: ['token-liquidations', tokenSymbol],
		queryFn: () => fetchTokenLiquidationsRows(tokenSymbol, authorizedFetch),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(tokenSymbol) && isAuthenticated && hasActiveSubscription && !loaders.userLoading
	})

	const sectionHeader = (
		<div className="flex items-center gap-2 border-b border-(--cards-border) p-3">
			<h2
				className="group relative flex scroll-mt-24 items-center gap-1 text-xl font-bold"
				id={TOKEN_LIQUIDATIONS_SECTION_ID}
			>
				Liquidations
				<a
					aria-hidden="true"
					tabIndex={-1}
					href={`#${TOKEN_LIQUIDATIONS_SECTION_ID}`}
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
								is required to view token liquidations.
							</p>
						) : (
							<p className="text-sm text-(--text-label)">
								An{' '}
								<BasicLink href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`} className="underline">
									active subscription
								</BasicLink>{' '}
								is required to view token liquidations.
							</p>
						)}
					</div>
				</section>
				<SignInModal store={signInDialogStore} hideWhenAuthenticated={false} />
			</>
		)
	}

	if (error != null) {
		return (
			<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{sectionHeader}
				<div className="flex min-h-[80dvh] items-center justify-center p-6 text-center sm:min-h-[572px]">
					<p className="max-w-md text-sm text-(--text-label)">
						{error instanceof Error ? error.message : 'Failed to load token liquidations.'}
					</p>
				</div>
			</section>
		)
	}

	if (!data || (data.protocolRows.length === 0 && data.chainRows.length === 0)) {
		return null
	}

	const tabs = <LiquidationsTableTabs tabs={TABS} activeTab={activeTab} setActiveTab={handleSetActiveTab} />

	return (
		<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			{sectionHeader}
			<div className="flex flex-col gap-2 p-3">
				<DeferredLiquidationsSummaryStats
					items={[
						{ label: 'Collateral USD', value: data.totalCollateralUsd, isUsd: true },
						{ label: 'Positions', value: data.positionCount },
						{ label: 'Chains', value: data.chainCount },
						{ label: 'Protocols', value: data.protocolCount }
					]}
				/>

				<DeferredLiquidationsDistributionChart
					chart={data.distributionChart}
					timestamp={data.timestamp}
					title={`${data.tokenSymbol} Liquidation Distribution`}
					defaultBreakdownMode="protocol"
					hideTokenSelector
					tokenStateMode="local"
				/>

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{activeTab === 'protocols' ? (
						<DeferredTableWithSearch
							data={data.protocolRows}
							columns={protocolColumns}
							leadingControls={tabs}
							columnToSearch="name"
							placeholder="Search protocols..."
							csvFileName={`token-liquidations-protocols-${tokenSymbol}`}
							embedded
							sortingState={[{ id: 'totalCollateralUsd', desc: true }]}
						/>
					) : (
						<DeferredTableWithSearch
							data={data.chainRows}
							columns={chainColumns}
							leadingControls={tabs}
							columnToSearch="name"
							placeholder="Search chains..."
							csvFileName={`token-liquidations-chains-${tokenSymbol}`}
							embedded
							sortingState={[{ id: 'totalCollateralUsd', desc: true }]}
						/>
					)}
				</div>
			</div>
		</section>
	)
}
