import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { PROTOCOLS_API } from '~/constants'
import { CompareChains } from '~/containers/CompareChains'
import Layout from '~/layout'
import { chainIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'

export const getStaticProps = async () => {
	const chains = await fetchJson(PROTOCOLS_API).then((pData) =>
		pData?.chains?.map((val) => ({
			value: val,
			label: val,
			logo: chainIconUrl(val)
		}))
	)

	return {
		props: { chains },
		revalidate: maxAgeForNext([22])
	}
}

const pageName = ['Compare Chains']

export default function CompareChainsPage({ chains }) {
	return (
		<Layout title={`Compare Chains - DefiLlama`} includeInMetricsOptions={tvlOptions} pageName={pageName}>
			<CompareChains chains={chains} />
		</Layout>
	)
}
