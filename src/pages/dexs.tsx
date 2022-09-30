import * as React from 'react'
import Layout from '~/layout'
import DexsContainer, { IDexsContainer } from '~/containers/Dex/DexsByChain'
import { revalidate } from '~/api'
import { getChainPageData } from '~/api/categories/dexs'
import SEO from '~/components/SEO'

export async function getStaticProps() {
	const { props } = await getChainPageData()

	return {
		props,
		revalidate: revalidate()
	}
}

const Chains: React.FC<IDexsContainer> = (props) => {
	return (
		<Layout title={`${props.chain} Volumes - DefiLlama`} defaultSEO>
			<SEO dexsPage />
			<DexsContainer {...props} />
		</Layout>
	)
}

export default Chains
