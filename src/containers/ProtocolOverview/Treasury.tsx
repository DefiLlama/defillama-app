import dynamic from 'next/dynamic'
import { useFetchProtocolTreasury } from '~/api/categories/protocols/client'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'
import { buildProtocolAddlChartsData } from './utils'
import { useState, useMemo } from 'react'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export function Treasury({ protocolName }) {
	return (
		<div className="bg-[var(--cards-bg)] rounded-md p-3 flex flex-col gap-4 col-span-full xl:col-span-1" id="treasury">
			<h3>Treasury</h3>

			<TreasuryChart protocolName={protocolName} />
		</div>
	)
}

export const TreasuryChart = ({ protocolName }: { protocolName: string }) => {
	const [includeTreasury, setIncludeTreasury] = useState(true)
	const { data, isLoading } = useFetchProtocolTreasury(protocolName, includeTreasury)

	const { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury } = useMemo(() => {
		const tokens = Object.entries(data?.chainTvls ?? {})
			.filter((chain) => !chain[0].endsWith('-OwnTokens'))
			.reduce((acc, curr: [string, { tokensInUsd: Array<{ date: number; tokens: { [token: string]: number } }> }]) => {
				if (curr[1].tokensInUsd?.length > 0) {
					const tokens = curr[1].tokensInUsd.slice(-1)[0].tokens

					for (const token in tokens) {
						acc = [...acc, { name: token, value: tokens[token] }]
					}
				}

				return acc
			}, [])
			.sort((a, b) => b.value - a.value)

		const top10Tokens = tokens.slice(0, 11)

		if (tokens.length > 10) {
			top10Tokens.push({ name: 'Others', value: tokens.slice(11).reduce((acc, curr) => (acc += curr.value), 0) })
		}
		const { tokenBreakdown, tokenBreakdownUSD, tokensUnique } = buildProtocolAddlChartsData({
			protocolData: data,
			extraTvlsEnabled: {}
		})

		const historicalTreasury = {}
		for (const chain in data?.chainTvls ?? {}) {
			if (chain.includes('-')) continue

			for (const { date, totalLiquidityUSD } of data.chainTvls[chain].tvl) {
				historicalTreasury[date] = (historicalTreasury[date] || 0) + totalLiquidityUSD
			}
		}

		const finalHistoricalTreasury = []
		for (const date in historicalTreasury) {
			finalHistoricalTreasury.push([date, historicalTreasury[date]])
		}

		return { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury: finalHistoricalTreasury }
	}, [data])

	if (isLoading) {
		return <p className="my-[180px] text-center">Loading...</p>
	}

	return (
		<>
			<label className="flex flex-nowrap gap-2 items-center justify-end cursor-pointe m-4">
				<input type="checkbox" checked={includeTreasury} onChange={() => setIncludeTreasury(!includeTreasury)} />
				<span>Include own tokens</span>
			</label>

			{!isLoading && (!data || top10Tokens.length === 0) ? (
				<div className="grid grid-cols-2 rounded-md min-h-[360px]"></div>
			) : (
				<div className="grid grid-cols-2 rounded-md min-h-[384px] p-3">
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
						<PieChart chartData={top10Tokens} />
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
						<AreaChart chartData={historicalTreasury} title="Historical Treasury" valueSymbol="$" />
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
						<AreaChart chartData={tokenBreakdown} title="Tokens Breakdown" stacks={tokensUnique} />
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
						<AreaChart chartData={tokenBreakdownUSD} title="Tokens (USD)" stacks={tokensUnique} valueSymbol="$" />
					</LazyChart>
				</div>
			)}
		</>
	)
}
