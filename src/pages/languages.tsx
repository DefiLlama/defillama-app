import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { getColorFromNumber, getDominancePercent } from '~/utils'
import { maxAgeForNext } from '~/api'
import { LANGS_API } from '~/constants'
import { ChartsWrapper, LazyChart, SectionHeader } from '~/layout/ProtocolAndPool'
import type { IChartProps } from '~/components/ECharts/types'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

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

export async function getStaticProps() {
	const data = await fetch(LANGS_API).then((r) => r.json())

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
}

export default function Protocols({ langs, langsUnique, langsDominance, osUnique, osLangs, osDominance, colors }) {
	return (
		<Layout title={`Languages - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Languages', hideOptions: true }} />

			<SectionHeader>Breakdown by Smart Contract Languages</SectionHeader>

			<ChartsWrapper>
				<LazyChart>
					<AreaChart
						chartData={langs}
						title="TVL"
						customLegendName="Language"
						customLegendOptions={langsUnique}
						valueSymbol="$"
						stacks={langsUnique}
						stackColors={colors}
					/>
				</LazyChart>
				<LazyChart>
					<AreaChart
						chartData={langsDominance}
						title="TVL Dominance"
						customLegendName="Language"
						customLegendOptions={langsUnique}
						valueSymbol="%"
						stacks={langsUnique}
						stackColors={colors}
					/>
				</LazyChart>
			</ChartsWrapper>

			<SectionHeader>Open/Closed Source breakdown of solana protocols</SectionHeader>
			<ChartsWrapper>
				<LazyChart>
					<AreaChart
						chartData={osDominance}
						title=""
						valueSymbol="%"
						stacks={osUnique}
						stackColors={sourceTypeColor}
						hidedefaultlegend
					/>
				</LazyChart>
			</ChartsWrapper>
		</Layout>
	)
}

const sourceTypeColor = {
	opensource: 'red',
	closedsource: 'green'
}
