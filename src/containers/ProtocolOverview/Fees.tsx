import * as React from 'react'
import type { IFusedProtocolData } from '~/api/types'
import { slug } from '~/utils'
import { DimensionProtocolChartByType } from '../DimensionAdapters/charts/ProtocolChart'

export function FeesAndRevenueCharts({ data }: { data: IFusedProtocolData }) {
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<div className="grid grid-cols-2 rounded-md">
			<DimensionProtocolChartByType
				chartType="chain"
				protocolName={slug(data.name)}
				type={'fees'}
				breakdownChart={false}
			/>
			<DimensionProtocolChartByType chartType="chain" protocolName={slug(data.name)} type={'fees'} />
			{hasVersions ? (
				<DimensionProtocolChartByType chartType="version" protocolName={slug(data.name)} type={'fees'} />
			) : null}
		</div>
	)
}

export function VolumeCharts({
	data,
	type = 'dexs'
}: {
	data: IFusedProtocolData
	type?: 'derivatives' | 'dexs' | 'aggregators' | 'options' | 'aggregator-derivatives' | 'bridge-aggregators'
}) {
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<div className="grid grid-cols-2 rounded-md">
			<DimensionProtocolChartByType
				chartType="chain"
				protocolName={slug(data.name)}
				type={type}
				breakdownChart={false}
			/>
			<DimensionProtocolChartByType
				chartType="chain"
				protocolName={slug(data.name)}
				type={type}
				breakdownChart={true}
			/>
			{hasVersions ? (
				<DimensionProtocolChartByType chartType="version" protocolName={slug(data.name)} type={type} />
			) : null}
		</div>
	)
}
