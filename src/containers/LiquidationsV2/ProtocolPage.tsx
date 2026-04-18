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
	const handleSetActiveTab = React.useCallback((id: (typeof PROTOCOL_TABS)[number]['id']) => setActiveTab(id), [])

	return (
		<>
			<RowLinksWithDropdown links={props.protocolLinks} activeLink={props.protocolName} />
			{(props.chainLinks?.length ?? 0) > 2 ? (
				<RowLinksWithDropdown links={props.chainLinks} activeLink="All Chains" />
			) : null}

			<div className="relative isolate flex flex-col gap-2">
				<LiquidationsSummaryStats
					items={[
						{ label: 'Collateral USD', value: props.totalCollateralUsd, isUsd: true },
						{ label: 'Positions', value: props.positionCount },
						{ label: 'Tokens', value: props.collateralCount }
					]}
				/>
				<LiquidationsDistributionChart
					chart={props.distributionChart}
					timestamp={props.timestamp}
					title={`${props.protocolName} Liquidation Distribution`}
					allowedBreakdownModes={['total', 'chain']}
					defaultBreakdownMode="chain"
				/>
			</div>

			<div className="mt-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{activeTab === 'chains' ? (
					<LiquidationsProtocolChainsTable
						rows={props.chainRows}
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={PROTOCOL_TABS} activeTab={activeTab} setActiveTab={handleSetActiveTab} />
						}
					/>
				) : (
					<LiquidationsPositionsTable
						rows={props.positions}
						ownerBlockExplorers={props.ownerBlockExplorers}
						header="Positions"
						embedded
						leadingControls={
							<LiquidationsTableTabs tabs={PROTOCOL_TABS} activeTab={activeTab} setActiveTab={handleSetActiveTab} />
						}
					/>
				)}
			</div>
		</>
	)
}
