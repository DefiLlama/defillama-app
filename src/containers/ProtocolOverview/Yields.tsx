import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { LocalLoader } from '~/components/Loaders'
import { useVolatility } from '~/containers/Yields/queries/client'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { slug } from '~/utils'
import { sluggifyProtocol } from '~/utils/cache-client'

export function ProtocolPools({
	protocol,
	data,
	parentProtocol,
	otherProtocols
}: {
	protocol: string
	data: { noOfPoolsTracked: number | null; averageAPY: number | null } | null
	parentProtocol?: string
	otherProtocols?: Array<string>
}) {
	const protocolSlug = slug(protocol)
	const { data: volatility } = useVolatility()

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
								(parentProtocol ? false : otherProtocols?.map((op) => sluggifyProtocol(op)).includes(p.project))
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
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const poolsWithVolatility = React.useMemo(() => {
		if (!poolsList) return poolsList
		return poolsList.map((pool) => ({
			...pool,
			apyMedian30d: volatility?.[pool.configID]?.[1] ?? null,
			apyStd30d: volatility?.[pool.configID]?.[2] ?? null,
			cv30d: volatility?.[pool.configID]?.[3] ?? null
		}))
	}, [poolsList, volatility])

	return (
		<>
			<div className="flex flex-1 flex-col gap-1 xl:flex-row">
				<div className="flex flex-1 flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<p className="flex items-center gap-2">
						<span>Number of pools tracked</span>
						<span>:</span>
						<span>{data?.noOfPoolsTracked}</span>
					</p>
					<p className="flex items-center gap-2">
						<span>Average APY</span>
						<span>:</span>
						<span>
							{data?.averageAPY != null && Number.isFinite(data.averageAPY) ? `${data.averageAPY.toFixed(2)}%` : 'N/A'}
						</span>
					</p>

					{isLoading ? (
						<div className="flex flex-1 flex-col items-center justify-center">
							<LocalLoader />
						</div>
					) : !poolsList ? (
						<div className="flex flex-1 flex-col items-center justify-center">
							<p className="p-2">{error instanceof Error ? error.message : 'Failed to fetch'}</p>
						</div>
					) : (
						<YieldsPoolsTable data={poolsWithVolatility ?? []} />
					)}
				</div>
			</div>
		</>
	)
}
