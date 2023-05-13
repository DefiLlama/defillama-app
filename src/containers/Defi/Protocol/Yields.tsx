import * as React from 'react'
import { FlexRow, Section } from '~/layout/ProtocolAndPool'
import { GridContent } from './Common'
import useSWR from 'swr'
import { YieldsPoolsTable } from '~/components/Table'
import { getYieldPageData } from '~/api/categories/yield'

export function ProtocolPools({ protocol, data }) {
	const { data: poolsListt, error } = useSWR('yields-pools-list', () =>
		getYieldPageData().then((res) => res?.props?.pools?.filter((p) => p.project === protocol && p.apy > 0) ?? null)
	)

	const poolsList = []
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
					<p style={{ height: '360px', textAlign: 'center' }}>Loading...</p>
				) : !poolsList ? (
					<p style={{ height: '360px', textAlign: 'center' }}></p>
				) : (
					<YieldsPoolsTable data={poolsList} />
				)}
			</Section>
		</GridContent>
	)
}
