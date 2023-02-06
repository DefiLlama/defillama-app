import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { PROTOCOLS_TREASURY } from '~/constants'
import { TreasuriesTable } from '~/components/Table/Defi'
import { Header } from '~/Theme'

export async function getStaticProps() {
	const treasuries = await fetch(PROTOCOLS_TREASURY).then((res) => res.json())
	return {
		props: {
			treasuries
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
