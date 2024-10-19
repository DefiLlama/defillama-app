import * as React from 'react'
import type { IFusedProtocolData } from '~/api/types'
import { ChartsWrapper } from '~/layout/ProtocolAndPool'
import { slug } from '~/utils'
import { ChartByType2 } from './../../DexsAndFees/charts'

export const ProtocolFeesRevenueVolumeCharts = ({ data }: { data: IFusedProtocolData }) => {
	const metrics = Object.entries(data.metrics ?? {})
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<ChartsWrapper style={{ background: 'none', border: 'none' }}>
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
		</ChartsWrapper>
	)
}

export function FeesAndRevenueCharts({ data }: { data: IFusedProtocolData }) {
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<ChartsWrapper style={{ background: 'none', border: 'none' }}>
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'fees'} breakdownChart={false} />
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'fees'} />
			{hasVersions ? <ChartByType2 chartType="version" protocolName={slug(data.name)} type={'fees'} /> : null}
		</ChartsWrapper>
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
		<ChartsWrapper style={{ background: 'none', border: 'none' }}>
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'dexs'} breakdownChart={false} />
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={type} breakdownChart={false} />
			{hasVersions ? <ChartByType2 chartType="version" protocolName={slug(data.name)} type={type} /> : null}
		</ChartsWrapper>
	)
}
