import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'
import { buildProtocolAddlChartsData } from './utils'
import { useState, useMemo, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import { PROTOCOL_TREASURY_API } from '~/constants'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export function Treasury({ protocolName }) {
	return (
		<div
			className="bg-(--cards-bg) border border-(--cards-border) rounded-md p-3 flex flex-col gap-4 col-span-full xl:col-span-1"
			id="treasury"
		>
			<h3>Treasury</h3>

			<TreasuryChart protocolName={protocolName} />
		</div>
	)
}

export const TreasuryChart = ({ protocolName }: { protocolName: string }) => {
	const [includeOwnTokens, setIncludeOwnTokens] = useState(true)
	const isEnabled = !!protocolName
	const { data, isLoading } = useQuery({
		queryKey: ['treasury', protocolName, isEnabled],
		queryFn: isEnabled ? () => fetchJson(`${PROTOCOL_TREASURY_API}/${protocolName}`) : () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isEnabled
	})

	const { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury } = useMemo(() => {
		const chartData = {}
		const allLatestTokensInUsd = {}
		for (const chain in data?.chainTvls ?? {}) {
			if (chain.includes('-')) continue
			if (!includeOwnTokens && chain.endsWith('OwnTokens')) continue
			chartData[chain] = data.chainTvls[chain]
			const latestTokensInUsd = data.chainTvls[chain].tokensInUsd.slice(-1)[0].tokens
			for (const token in latestTokensInUsd) {
				allLatestTokensInUsd[token] = (allLatestTokensInUsd[token] || 0) + latestTokensInUsd[token]
			}
		}

		const [topTokens, others] = Object.entries(allLatestTokensInUsd)
			.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
			.map(([token, value]) => ({ name: token, value: value as number }))
			.reduce(
				(acc, curr) => {
					if (acc[0].length < 9) {
						acc[0].push(curr)
					} else {
						acc[1] += curr.value
					}

					return acc
				},
				[[] as { name: string; value: number }[], 0]
			)

		const top10Tokens = [...topTokens, { name: 'Others', value: others }]

		const { tokenBreakdown, tokenBreakdownUSD, tokensUnique } = buildProtocolAddlChartsData({
			protocolData: { name: protocolName, chainTvls: chartData },
			extraTvlsEnabled: {}
		})

		const historicalTreasury = {}
		for (const chain in chartData) {
			for (const { date, totalLiquidityUSD } of chartData[chain].tvl) {
				historicalTreasury[date] = (historicalTreasury[date] || 0) + totalLiquidityUSD
			}
		}

		const finalHistoricalTreasury = []
		for (const date in historicalTreasury) {
			finalHistoricalTreasury.push([date, historicalTreasury[date]])
		}

		return { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury: finalHistoricalTreasury }
	}, [data, includeOwnTokens])

	if (isLoading) {
		return <p className="my-[180px] text-center">Loading...</p>
	}

	return (
		<>
			<label className="flex flex-nowrap gap-2 items-center justify-end cursor-pointe m-4">
				<input type="checkbox" checked={includeOwnTokens} onChange={() => setIncludeOwnTokens(!includeOwnTokens)} />
				<span>Include own tokens</span>
			</label>

			{!isLoading && (!data || top10Tokens.length === 0) ? (
				<div className="grid grid-cols-2 rounded-md min-h-[360px]"></div>
			) : (
				<div className="grid grid-cols-2 rounded-md min-h-[384px] p-3">
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<PieChart chartData={top10Tokens} />
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart chartData={historicalTreasury} title="Historical Treasury" valueSymbol="$" />
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart chartData={tokenBreakdown} title="Tokens Breakdown" stacks={tokensUnique} />
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart chartData={tokenBreakdownUSD} title="Tokens (USD)" stacks={tokensUnique} valueSymbol="$" />
						</Suspense>
					</LazyChart>
				</div>
			)}
		</>
	)
}
