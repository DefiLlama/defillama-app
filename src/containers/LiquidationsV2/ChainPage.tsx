import * as React from 'react'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { LiquidationsChainPageProps } from './api.types'
import { LiquidationsDistributionChart } from './LiquidationsDistributionChart'
import { LiquidationsPageHeader, LiquidationsSummaryStats } from './Summary'
import { LiquidationsPositionsTable, LiquidationsProtocolChainsTable } from './Table'
import { LiquidationsTableTabs } from './TableTabs'

const CHAIN_TABS = [
	{ id: 'chains', label: 'Chains' },
	{ id: 'positions', label: 'Positions' }
] as const

export function LiquidationsChainPage(props: LiquidationsChainPageProps) {
	const [activeTab, setActiveTab] = React.useState<(typeof CHAIN_TABS)[number]['id']>('positions')

	return (
		<>
			<RowLinksWithDropdown links={props.protocolLinks} activeLink={props.protocolName} />
			<RowLinksWithDropdown links={props.chainLinks} activeLink={props.chainName} />

			<div className="relative isolate flex flex-col gap-2">
				<LiquidationsPageHeader
					title={`${props.protocolName} on ${props.chainName}`}
					rightText={new Date(props.timestamp * 1000).toUTCString()}
					logo={{ name: props.protocolName, kind: 'token' }}
				/>
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
					title={`${props.protocolName} on ${props.chainName}`}
				/>
			</div>

			<div className="mt-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{activeTab === 'chains' ? (
					<LiquidationsProtocolChainsTable
						rows={props.chainRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={CHAIN_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				) : (
					<LiquidationsPositionsTable
						rows={props.positions}
						header="Positions"
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={CHAIN_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
						}
					/>
				)}
			</div>
		</>
	)
}
