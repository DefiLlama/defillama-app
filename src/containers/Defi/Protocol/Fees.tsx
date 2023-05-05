import * as React from 'react'
import type { IFusedProtocolData } from '~/api/types'
import { ChartsWrapper } from '~/layout/ProtocolAndPool'
import { slug } from '~/utils'
import { ChartByType, ChartByType2 } from './../../DexsAndFees/charts'

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
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'fees'} />
			{hasVersions ? <ChartByType2 chartType="version" protocolName={slug(data.name)} type={'fees'} /> : null}
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'fees'} breakdownChart={false} />
		</ChartsWrapper>
	)
}

export function VolumeCharts({ data }: { data: IFusedProtocolData }) {
	const hasVersions = (data.otherProtocols ?? []).length > 0

	return (
		<ChartsWrapper style={{ background: 'none', border: 'none' }}>
			<ChartByType2 chartType="chain" protocolName={slug(data.name)} type={'dexs'} />
			{hasVersions ? <ChartByType2 chartType="version" protocolName={slug(data.name)} type={'dexs'} /> : null}
		</ChartsWrapper>
	)
}
