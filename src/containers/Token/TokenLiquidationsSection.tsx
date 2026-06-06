import { useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { LiquidationsTableTabs } from '~/containers/LiquidationsV2/TableTabs'
import { formattedNum } from '~/utils'
import { fetchTokenLiquidationsForAliases } from '../LiquidationsV2/api'
import type { OverviewChainRow, OverviewProtocolRow, TokenLiquidationsSectionData } from '../LiquidationsV2/api.types'
import { TokenPrivateSectionGate, useTokenPrivateSectionAccess } from './TokenPrivateSectionGate'

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
		},
		meta: {
			headerClassName: 'w-[min(220px,40vw)]'
		}
	}),
	protocolColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	}),
	protocolColumnHelper.accessor((row) => row.chainCount ?? undefined, {
		id: 'chainCount',
		header: 'Chains',
		meta: {
			headerClassName: 'w-[90px]',
			align: 'end'
		}
	}),
	protocolColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: {
			headerClassName: 'w-[145px]',
			align: 'end'
		}
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
		},
		meta: {
			headerClassName: 'w-[min(180px,40vw)]'
		}
	}),
	chainColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	}),
	chainColumnHelper.accessor((row) => row.protocolCount ?? undefined, {
		id: 'protocolCount',
		header: 'Protocols',
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	}),
	chainColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: {
			headerClassName: 'w-[145px]',
			align: 'end'
		}
	})
]

async function fetchTokenLiquidationsRows(
	tokenSymbol: string,
	authorizedFetch: (url: string) => Promise<Response | null>
): Promise<TokenLiquidationsSectionData | null> {
	return fetchTokenLiquidationsForAliases(tokenSymbol, authorizedFetch)
}

export function TokenLiquidationsSection({ tokenSymbol }: { tokenSymbol: string }) {
	const access = useTokenPrivateSectionAccess()
	const { authorizedFetch, hasActiveSubscription, isAuthenticated, loaders } = access
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

	const canReadPrivateSection = isAuthenticated && hasActiveSubscription && !loaders.userLoading
	if (
		canReadPrivateSection &&
		!isLoading &&
		error == null &&
		(!data || (data.protocolRows.length === 0 && data.chainRows.length === 0))
	) {
		return null
	}

	const tabs = <LiquidationsTableTabs tabs={TABS} activeTab={activeTab} setActiveTab={handleSetActiveTab} />

	return (
		<TokenPrivateSectionGate
			access={access}
			title="Liquidations"
			sectionId={TOKEN_LIQUIDATIONS_SECTION_ID}
			contentLabel="token liquidations"
			isLoading={isLoading}
			error={error}
			errorMessage="Failed to load token liquidations."
			bodyClassName="flex flex-col gap-2 p-3"
		>
			{data ? (
				<>
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
				</>
			) : null}
		</TokenPrivateSectionGate>
	)
}
