import * as React from 'react'
import { FlexRow, Section } from '~/layout/ProtocolAndPool'
import { GridContent } from './Common'
import useSWR from 'swr'
import { YieldsPoolsTable } from '~/components/Table'
import { getYieldPageData } from '~/api/categories/yield'

export function ProtocolPools({ protocol, data }) {
	const { data: poolsList, error } = useSWR(`yields-pools-list-${protocol}`, () =>
		getYieldPageData().then(
			(res) =>
				res?.props?.pools
					?.filter((p) => p.project === protocol)
					.map((i) => ({
						...i,
						tvl: i.tvlUsd,
						pool: i.symbol,
						configID: i.pool,
						chains: [i.chain],
						project: i.projectName,
						projectslug: i.project
					})) ?? null
		)
	)

	return (
		<GridContent>
			<Section>
				<FlexRow>
					<span>Number of pools tracked</span>
					<span>:</span>
					<span>{data.noOfPoolsTracked}</span>
				</FlexRow>
				<FlexRow>
					<span>Average APY</span>
					<span>:</span>
					<span>{data.averageAPY.toFixed(2)}%</span>
				</FlexRow>

				{!poolsList && poolsList !== null && !error ? (
					<p style={{ margin: '180px 0', textAlign: 'center' }}>Loading...</p>
				) : !poolsList ? (
					<p style={{ margin: '180px 0', textAlign: 'center' }}></p>
				) : (
					<YieldsPoolsTable data={poolsList} />
				)}
			</Section>
		</GridContent>
	)
}
