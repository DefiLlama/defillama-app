import * as React from 'react'
import type { IFusedProtocolData } from '~/api/types'
import { ChartsWrapper } from '~/layout/ProtocolAndPool'
import { slug } from '~/utils'
import { ChartByType } from './../../DexsAndFees/charts'

export function ProtocolFeesAndRevenueCharts({ data }: { data: IFusedProtocolData }) {
	const metrics = Object.keys(data.metrics ?? {})
	return (
		<ChartsWrapper>
			<ChartByType chartType="chain" protocolName={slug(data.name)} type="dexs" />
			<ChartByType chartType="version" protocolName={slug(data.name)} type="dexs" />
			<ChartByType chartType="chain" protocolName={slug(data.name)} type="fees" breakdownChart={false} />
			<ChartByType chartType="chain" protocolName={slug(data.name)} type="fees" />
			{/* {metrics.map(([key, enabled]) => {
				if (key === 'dexs' && enabled)
					return (
						<>
							<ChartByType chartType="chain" protocolName={slug(data.name)} type="dexs" />
							<ChartByType chartType="version" protocolName={slug(data.name)} type="dexs" />
						</>
					)
				else if (key === 'fees' && enabled)
					return (
						<>
							<ChartByType chartType="chain" protocolName={slug(data.name)} type="fees" breakdownChart={false} />
							<ChartByType chartType="chain" protocolName={slug(data.name)} type="fees" />
						</>
					)
				else return null
			})} */}
		</ChartsWrapper>
	)
}
