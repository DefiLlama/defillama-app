import * as React from 'react'
import { maxAgeForNext } from '~/api'
import type {
	IMultiSeriesChart2Props,
	MultiSeriesChart2Dataset,
	MultiSeriesChart2SeriesConfig
} from '~/components/ECharts/types'
import { LANGS_API } from '~/constants'
import Layout from '~/layout'
import { getDominancePercent, getNDistinctColors } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

function buildDataset(
	langs: Record<string, Record<string, number>>,
	mode: 'absolute' | 'dominance'
): { dataset: MultiSeriesChart2Dataset; keys: string[] } {
	const keysSet = new Set<string>()
	const entries: [string, Record<string, number>][] = []
	for (const date in langs) {
		entries.push([date, langs[date]])
	}
	entries.sort((a, b) => Number(a[0]) - Number(b[0]))

	const source: MultiSeriesChart2Dataset['source'] = []
	for (const [date, tvlByLang] of entries) {
		for (const l in tvlByLang) keysSet.add(l)

		if (mode === 'dominance') {
			let daySum = 0
			for (const lang in tvlByLang) daySum += tvlByLang[lang]
			const row: Record<string, number> = { timestamp: +date * 1e3 }
			for (const lang in tvlByLang) {
				row[lang] = getDominancePercent(tvlByLang[lang], daySum)
			}
			source.push(row)
		} else {
			source.push({ timestamp: +date * 1e3, ...tvlByLang })
		}
	}

	const keys = Array.from(keysSet)
	return { dataset: { source, dimensions: ['timestamp', ...keys] }, keys }
}

function buildCharts(keys: string[], colors: Record<string, string>, stack?: string): MultiSeriesChart2SeriesConfig[] {
	return keys.map((name) => ({
		type: 'line' as const,
		name,
		encode: { x: 'timestamp', y: name },
		color: colors[name],
		...(stack ? { stack } : {})
	}))
}

export const getStaticProps = withPerformanceLogging('languages', async () => {
	const data = await fetchJson(LANGS_API)

	const { dataset: tvlDataset, keys: langsUnique } = buildDataset(data.chart, 'absolute')
	const { dataset: dominanceDataset } = buildDataset(data.chart, 'dominance')
	const { dataset: osDataset, keys: osUnique } = buildDataset(data.sumDailySolanaOpenSourceTvls, 'dominance')

	const allColors = getNDistinctColors(langsUnique.length)
	const colors: Record<string, string> = {}
	for (let i = 0; i < langsUnique.length; i++) {
		colors[langsUnique[i]] = allColors[i]
	}

	const tvlCharts = buildCharts(langsUnique, colors, 'A')
	const dominanceCharts = buildCharts(langsUnique, colors, 'A')
	const osCharts = buildCharts(osUnique, sourceTypeColor, 'A')

	return {
		props: {
			tvlDataset,
			tvlCharts,
			dominanceDataset,
			dominanceCharts,
			osDataset,
			osCharts
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['TVL', 'by', 'Smart Contract Languages']

export default function Protocols({ tvlDataset, tvlCharts, dominanceDataset, dominanceCharts, osDataset, osCharts }) {
	return (
		<Layout
			title={`Languages - DefiLlama`}
			description={`TVL breakdown by smart contract languages that the protocols smart contracts are written in. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`languages, smart contract languages, tvl by language`}
			canonicalUrl={`/languages`}
			pageName={pageName}
		>
			<h1 className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-xl font-semibold">
				Breakdown by Smart Contract Languages
			</h1>

			<div className="relative rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<React.Suspense fallback={<></>}>
					<MultiSeriesChart2
						dataset={tvlDataset}
						charts={tvlCharts}
						title="TVL"
						valueSymbol="$"
						stacked
						hideDefaultLegend={false}
					/>
				</React.Suspense>
			</div>
			<div className="relative rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<React.Suspense fallback={<div className="h-[398px]" />}>
					<MultiSeriesChart2
						dataset={dominanceDataset}
						charts={dominanceCharts}
						title="TVL Dominance"
						valueSymbol="%"
						expandTo100Percent
						hideDefaultLegend={false}
					/>
				</React.Suspense>
			</div>

			<div className="relative rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<React.Suspense fallback={<div className="h-[398px]" />}>
					<MultiSeriesChart2
						dataset={osDataset}
						charts={osCharts}
						valueSymbol="%"
						expandTo100Percent
						title="Open/Closed Source breakdown of solana protocols"
					/>
				</React.Suspense>
			</div>
		</Layout>
	)
}

const sourceTypeColor: Record<string, string> = {
	opensource: '#3fb950',
	closedsource: '#f85149'
}
