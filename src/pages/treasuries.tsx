import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { PROTOCOLS_TREASURY } from '~/constants'
import { TreasuriesTable } from '~/components/Table/Defi'
import { Header } from '~/Theme'

export async function getStaticProps() {
	const treasuries = await fetch(PROTOCOLS_TREASURY).then((res) => res.json())
	return {
		props: {
			treasuries: treasuries.map(t=>({
				...t,
				...["majors", "others", "ownTokens", "stablecoins"].reduce((acc, v)=>({
					...acc,
					[v]: t.tokenBreakdowns[v]
				}), {}),
				tvl: t.tvl + (t.chainTvls?.['OwnTokens'] ?? 0)
			})).sort((a,b)=>b.stablecoins-a.stablecoins)
		},
		revalidate: maxAgeForNext([22])
	}
}

export default function Treasuries({ treasuries }) {
	return (
		<Layout title={`Treasuries - DefiLlama`} defaultSEO>
			<Header>Protocol Treasuries</Header>

			<TreasuriesTable data={treasuries} />
		</Layout>
	)
}
