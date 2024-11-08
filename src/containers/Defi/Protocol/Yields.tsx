import * as React from 'react'
import { Section } from '~/layout/ProtocolAndPool'
import { GridContent } from './Common'
import { YieldsPoolsTable } from '~/components/Table/Yields/Pools'
import { getYieldPageData } from '~/api/categories/yield'
import { sluggify } from '~/utils/cache-client'
import { useQuery } from '@tanstack/react-query'

export function ProtocolPools({ protocol, data, protocolData }) {
	const { data: poolsList, isLoading } = useQuery({
		queryKey: ['yields-pools-list', protocol],
		queryFn: () =>
			getYieldPageData().then(
				(res) =>
					res?.props?.pools
						?.filter(
							(p) =>
								p.project === protocol ||
								(protocolData?.parentProtocol
									? false
									: protocolData?.otherProtocols?.map((p) => sluggify(p)).includes(p.project))
						)
						.map((i) => ({
							...i,
							tvl: i.tvlUsd,
							pool: i.symbol,
							configID: i.pool,
							chains: [i.chain],
							project: i.projectName,
							projectslug: i.project
						})) ?? null
			),
		staleTime: 60 * 60 * 1000
	})

	return (
		<GridContent>
			<Section>
				<p className="flex items-center gap-2">
					<span>Number of pools tracked</span>
					<span>:</span>
					<span>{data.noOfPoolsTracked}</span>
				</p>
				<p className="flex items-center gap-2">
					<span>Average APY</span>
					<span>:</span>
					<span>{data.averageAPY.toFixed(2)}%</span>
				</p>

				{isLoading ? (
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
