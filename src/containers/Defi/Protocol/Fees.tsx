import * as React from 'react'
import type { IFusedProtocolData } from '~/api/types'
import { ChartsWrapper } from '~/layout/ProtocolAndPool'
import { slug } from '~/utils'
import { ChartByType } from './../../DexsAndFees/charts'

export function ProtocolFeesAndRevenueCharts({ data }: { data: IFusedProtocolData }) {
	const metrics = Object.entries(data.metrics ?? {})
	const hasVersions = (data.otherProtocols ?? []).length > 0
	return (
		<ChartsWrapper>
			{/* <ChartByType chartType="chain" protocolName={slug(data.name)} type="dexs" />
			<ChartByType chartType="version" protocolName={slug(data.name)} type="dexs" />
			<ChartByType chartType="chain" protocolName={slug(data.name)} type="fees" breakdownChart={false} />
			<ChartByType chartType="chain" protocolName={slug(data.name)} type="fees" /> */}
			{metrics.map(([key, enabled], i) => {
				return enabled && key !== 'medianApy' ? (
					<React.Fragment key={i}>
						<ChartByType chartType="chain" protocolName={slug(data.name)} type={key} />
						{hasVersions ? <ChartByType chartType="version" protocolName={slug(data.name)} type={key} /> : null}
						{key === 'fees' ? (
							<ChartByType chartType="chain" protocolName={slug(data.name)} type={key} breakdownChart={false} />
						) : null}
					</React.Fragment>
				) : null
			})}
		</ChartsWrapper>
	)
}
