import { Header } from '~/Theme'
import Layout from '~/layout'
import { Panel } from '~/components'
import { AreaChart } from '~/components/Charts'
import { ChainDominanceChart } from '~/components/Charts'
import { ProtocolsChainsSearch } from '~/components/Search'
import { toNiceMonthlyDate, getRandomColor } from '~/utils'
import { maxAgeForNext } from '~/api'
import { LANGS_API } from '~/constants'

function formatDataForChart(langs) {
	const langsUnique = new Set()
	const daySum = {}
	const formattedLangs = Object.entries(langs)
		.map((lang: [any, string[]]) => {
			Object.keys(lang[1]).map((l) => langsUnique.add(l))
			daySum[lang[0]] = Object.values(lang[1]).reduce((t, a) => t + a)
			return {
				...lang[1],
				date: lang[0]
			}
		})
		.sort((a, b) => a.date - b.date)
	return {
		formatted: formattedLangs,
		unique: Array.from(langsUnique),
		daySum
	}
}

export async function getStaticProps() {
	const data = await fetch(LANGS_API).then((r) => r.json())
	const { unique: langsUnique, formatted: formattedLangs, daySum: langsDaySum } = formatDataForChart(data.chart)
	const {
		unique: osUnique,
		formatted: osLangs,
		daySum: osDaySum
	} = formatDataForChart(data.sumDailySolanaOpenSourceTvls)

	return {
		props: {
			langs: formattedLangs,
			langsUnique,
			langsDaySum,
			osUnique,
			osLangs,
			osDaySum
		},
		revalidate: maxAgeForNext([22])
	}
}

function Chart({ langs, langsUnique }) {
	return (
		<Panel style={{ marginTop: '6px' }}>
			<AreaChart
				aspect={60 / 22}
				finalChartData={langs}
				tokensUnique={langsUnique}
				color={'blue'}
				moneySymbol="$"
				formatDate={toNiceMonthlyDate}
				hallmarks={[]}
			/>
		</Panel>
	)
}

export default function Protocols({ langs, langsUnique, langsDaySum, osUnique, osLangs, osDaySum }) {
	const colors = {}
	langsUnique.forEach((l) => {
		colors[l] = getRandomColor()
	})
	return (
		<Layout title={`Languages - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Languages', hideOptions: true }} />

			<Header>TVL breakdown by Smart Contract Language</Header>

			<Chart {...{ langs, langsUnique }} />

			<ChainDominanceChart
				stackOffset="expand"
				formatPercent={true}
				stackedDataset={langs}
				chainsUnique={langsUnique}
				chainColor={colors}
				daySum={langsDaySum}
			/>

			<br />

			<Header>Open/Closed Source breakdown of solana protocols</Header>

			<ChainDominanceChart
				stackOffset="expand"
				formatPercent={true}
				stackedDataset={osLangs}
				chainsUnique={osUnique}
				chainColor={{
					opensource: 'green',
					closedsource: 'red'
				}}
				daySum={osDaySum}
			/>
		</Layout>
	)
}
