import * as React from 'react'
import Layout from '~/layout'
import { getColorFromNumber, getDominancePercent } from '~/utils'
import { maxAgeForNext } from '~/api'
import { LANGS_API } from '~/constants'
import { LazyChart } from '~/components/LazyChart'
import type { IChartProps } from '~/components/ECharts/types'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchJson } from '~/utils/async'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

function formatDataForChart(langs) {
	const langsUnique = new Set<string>()

	const dominance = []

	const formattedLangs = Object.entries(langs)
		.sort((a, b) => Number(a[0]) - Number(b[0]))
		.map(([date, tvlByLang]: [string, { [lang: string]: number }]) => {
			Object.keys(tvlByLang).map((l) => langsUnique.add(l))

			const daySum = Object.values(tvlByLang).reduce((t, a) => t + a, 0)

			const shares = {}

			for (const lang in tvlByLang) {
				shares[lang] = getDominancePercent(tvlByLang[lang], daySum)
			}

			dominance.push({ date, ...shares })

			return {
				...tvlByLang,
				date
			}
		})

	return {
		formatted: formattedLangs,
		unique: Array.from(langsUnique),
		dominance
	}
}

export const getStaticProps = withPerformanceLogging('languages', async () => {
	const data = await fetchJson(LANGS_API)

	const { unique: langsUnique, formatted: formattedLangs, dominance: langsDominance } = formatDataForChart(data.chart)

	const {
		unique: osUnique,
		formatted: osLangs,
		dominance: osDominance
	} = formatDataForChart(data.sumDailySolanaOpenSourceTvls)

	const colors = {}

	langsUnique.forEach((l, index) => {
		colors[l] = getColorFromNumber(index, 6)
	})

	return {
		props: {
			langs: formattedLangs,
			langsUnique,
			langsDominance,
			osUnique,
			osLangs,
			osDominance,
			colors
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ langs, langsUnique, langsDominance, osUnique, osLangs, osDominance, colors }) {
	return (
		<Layout title={`Languages - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />

			<h1 className="text-xl font-semibold bg-(--cards-bg) border border-(--cards-border) rounded-md p-3">
				Breakdown by Smart Contract Languages
			</h1>

			<div className="flex flex-col gap-2 pt-3 bg-(--cards-bg) border border-(--cards-border) rounded-md *:*:*:[&[role='combobox']]:-mb-9">
				<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={langs}
							title="TVL"
							customLegendName="Language"
							customLegendOptions={langsUnique}
							valueSymbol="$"
							stacks={langsUnique}
							stackColors={colors}
						/>
					</React.Suspense>
				</LazyChart>
				<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={langsDominance}
							title="TVL Dominance"
							customLegendName="Language"
							customLegendOptions={langsUnique}
							valueSymbol="%"
							stacks={langsUnique}
							stackColors={colors}
						/>
					</React.Suspense>
				</LazyChart>
			</div>

			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md relative">
				<h2 className="font-semibold text-xl p-3">Open/Closed Source breakdown of solana protocols</h2>

				<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={osDominance}
							title=""
							valueSymbol="%"
							stacks={osUnique}
							stackColors={sourceTypeColor}
							hideDefaultLegend
						/>
					</React.Suspense>
				</LazyChart>
			</div>
		</Layout>
	)
}

const sourceTypeColor = {
	opensource: '#3fb950',
	closedsource: '#f85149'
}
