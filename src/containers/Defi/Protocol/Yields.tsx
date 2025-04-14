import * as React from 'react'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { getYieldPageData } from '~/containers/Yields/queries/index'
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
		<div className="grid grid-cols-2 p-6 xl:grid-rows-[repeat(2,auto)]">
			<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4 col-span-full xl:col-span-1">
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
					<p className="my-[180px] text-center">Loading...</p>
				) : !poolsList ? (
					<p className="my-[180px] text-center"></p>
				) : (
					<YieldsPoolsTable data={poolsList} />
				)}
			</div>
		</div>
	)
}
