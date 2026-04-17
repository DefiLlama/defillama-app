import * as React from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { LiquidationsProtocolPageProps } from './api.types'
import { LiquidationsDistributionChart } from './LiquidationsDistributionChart'
import { LiquidationsSummaryStats } from './Summary'
import { LiquidationsPositionsTable, LiquidationsProtocolChainsTable } from './Table'
import { LiquidationsTableTabs } from './TableTabs'

const PROTOCOL_TABS = [
	{ id: 'chains', label: 'Chains' },
	{ id: 'positions', label: 'Positions' }
] as const

export function LiquidationsProtocolPage(props: LiquidationsProtocolPageProps) {
	const [activeTab, setActiveTab] = React.useState<(typeof PROTOCOL_TABS)[number]['id']>('chains')

	return (
		<>
			<RowLinksWithDropdown links={props.protocolLinks} activeLink={props.protocolName} />
			<RowLinksWithDropdown links={props.chainLinks} activeLink="All Chains" />

			<div className="relative isolate flex flex-col gap-2">
				<LiquidationsSummaryStats
					items={[
						{ label: 'Positions', value: props.positionCount },
						{ label: 'Collateral IDs', value: props.collateralCount },
						{ label: 'Collateral USD', value: props.totalCollateralUsd, isUsd: true }
					]}
				/>
				<LiquidationsDistributionChart
					chart={props.distributionChart}
					timestamp={props.timestamp}
					title={`${props.protocolName} Liquidation Distribution`}
				/>
			</div>

			<div className="mt-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{activeTab === 'chains' ? (
					<LiquidationsProtocolChainsTable
						rows={props.chainRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={PROTOCOL_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				) : (
					<LiquidationsPositionsTable
						rows={props.positions}
						header="Positions"
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={PROTOCOL_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				)}
			</div>
		</>
	)
}
