import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { LocalLoader } from '~/components/Loaders'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { slug } from '~/utils'
import { sluggifyProtocol } from '~/utils/cache-client'

export function ProtocolPools({ protocol, data, parentProtocol, otherProtocols }) {
	const protocolSlug = slug(protocol)
	const {
		data: poolsList,
		isLoading,
		error
	} = useQuery({
		queryKey: ['yields-pools-list', protocolSlug],
		queryFn: () =>
			getYieldPageData().then(
				(res) =>
					res?.props?.pools
						?.filter(
							(p) =>
								p.project === protocolSlug ||
								(parentProtocol ? false : otherProtocols?.map((p) => sluggifyProtocol(p)).includes(p.project))
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
		<>
			<h2 className="col-span-full flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 text-base font-semibold xl:p-4">
				Yields for {protocol}
			</h2>
			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="flex flex-1 flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<p className="flex items-center gap-2">
						<span>Number of pools tracked</span>
						<span>:</span>
						<span>{data?.noOfPoolsTracked}</span>
					</p>
					<p className="flex items-center gap-2">
						<span>Average APY</span>
						<span>:</span>
						<span>{data?.averageAPY.toFixed(2)}%</span>
					</p>

					{isLoading ? (
						<div className="flex min-h-[408px] items-center justify-center">
							<LocalLoader />
						</div>
					) : !poolsList ? (
						<div className="flex min-h-[408px] items-center justify-center">
							<p>{error instanceof Error ? error.message : 'Failed to fetch'}</p>
						</div>
					) : (
						<YieldsPoolsTable data={poolsList} />
					)}
				</div>
			</div>
		</>
	)
}
