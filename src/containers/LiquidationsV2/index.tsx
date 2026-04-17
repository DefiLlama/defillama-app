import * as React from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { LiquidationsOverviewPageProps } from './api.types'
import { LiquidationsDistributionChart } from './LiquidationsDistributionChart'
import { LiquidationsSummaryStats } from './Summary'
import { LiquidationsOverviewChainsTable, LiquidationsProtocolsTable } from './Table'
import { LiquidationsTableTabs } from './TableTabs'

const OVERVIEW_TABS = [
	{ id: 'protocols', label: 'Protocols' },
	{ id: 'chains', label: 'Chains' }
] as const

export function LiquidationsOverview(props: LiquidationsOverviewPageProps) {
	const [activeTab, setActiveTab] = React.useState<(typeof OVERVIEW_TABS)[number]['id']>('protocols')

	return (
		<>
			<RowLinksWithDropdown links={props.protocolLinks} activeLink="Overview" />

			<div className="relative isolate flex flex-col gap-2">
				<LiquidationsSummaryStats
					items={[
						{ label: 'Collateral USD', value: props.totalCollateralUsd, isUsd: true },
						{ label: 'Positions', value: props.positionCount },
						{ label: 'Chains', value: props.chainCount },
						{ label: 'Protocols', value: props.protocolCount }
					]}
				/>
				<LiquidationsDistributionChart
					chart={props.distributionChart}
					timestamp={props.timestamp}
					title="Liquidation Distribution"
					defaultBreakdownMode="protocol"
				/>
			</div>

			<div className="mt-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{activeTab === 'protocols' ? (
					<LiquidationsProtocolsTable
						rows={props.protocolRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={OVERVIEW_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				) : (
					<LiquidationsOverviewChainsTable
						rows={props.chainRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={OVERVIEW_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				)}
			</div>
		</>
	)
}
