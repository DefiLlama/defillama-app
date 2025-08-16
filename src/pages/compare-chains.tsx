import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { PROTOCOLS_API } from '~/constants'
import { CompareChains } from '~/containers/CompareChains'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'

export const getStaticProps = async () => {
	const chains = await fetchJson(PROTOCOLS_API).then((pData) =>
		pData?.chains?.map((val) => ({ value: val, label: val }))
	)

	return {
		props: { chains },
		revalidate: maxAgeForNext([22])
	}
}

export default function Compare({ chains }) {
	return (
		<Layout title={`Compare Chains - DefiLlama`} includeInMetricsOptions={tvlOptions}>
			<CompareChains chains={chains} />
		</Layout>
	)
}
