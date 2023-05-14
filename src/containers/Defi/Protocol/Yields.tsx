import * as React from 'react'
import { FlexRow, Section } from '~/layout/ProtocolAndPool'
import { GridContent } from './Common'
import useSWR from 'swr'
import { YieldsPoolsTable } from '~/components/Table'
import { getYieldPageData } from '~/api/categories/yield'

export function ProtocolPools({ protocol, data }) {
	const { data: poolsList, error } = useSWR('yields-pools-list', () =>
		getYieldPageData().then((res) => res?.props?.pools?.filter((p) => p.project === protocol && p.apy > 0) ?? null)
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
