import * as React from 'react'
import type { IFusedProtocolData } from '~/api/types'
import { slug } from '~/utils'
import { ChartByType2 } from '~/containers/DexsAndFees/charts'

export const ProtocolFeesRevenueVolumeCharts = ({ data }: { data: IFusedProtocolData }) => {
	const metrics = Object.entries(data.metrics ?? {})
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<div className="grid grid-cols-2 rounded-xl">
			{metrics.map(([key, enabled]) => {
				return enabled && key !== 'medianApy' ? (
					<React.Fragment key={key + 'fees-revenue-volume-charts'}>
						<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={key} />
						{hasVersions ? <ChartByType2 chartType="version" protocolName={slug(data.name)} type={key} /> : null}
						{key === 'fees' ? (
							<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={key} breakdownChart={false} />
						) : null}
					</React.Fragment>
				) : null
			})}
		</div>
	)
}

export function FeesAndRevenueCharts({ data }: { data: IFusedProtocolData }) {
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<div className="grid grid-cols-2 rounded-xl">
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'fees'} breakdownChart={false} />
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'fees'} />
			{hasVersions ? <ChartByType2 chartType="version" protocolName={slug(data.name)} type={'fees'} /> : null}
		</div>
	)
}

export function VolumeCharts({
	data,
	type = 'dexs'
}: {
	data: IFusedProtocolData
	type?: 'derivatives' | 'dexs' | 'aggregators' | 'options' | 'aggregator-derivatives'
}) {
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<div className="grid grid-cols-2 rounded-xl">
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={type} breakdownChart={false} />
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={type} breakdownChart={true} />
			{hasVersions ? <ChartByType2 chartType="version" protocolName={slug(data.name)} type={type} /> : null}
		</div>
	)
}
