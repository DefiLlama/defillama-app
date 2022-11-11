import * as React from 'react'
import Layout from '~/layout'
import DexsContainer, { IDexsContainer } from '~/containers/Dex/DexsByChain'
import { revalidate } from '~/api'
import { getChainPageData, getDexs } from '~/api/categories/dexs'

export async function getStaticProps({ params }) {
	const chain = params.chain
	const { props } = await getChainPageData(chain)

	return {
		props: {
			...props
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const res = await getDexs()
	const paths = res.allChains.map((chain) => ({
		params: { chain: chain.toLowerCase() }
	}))

	return { paths, fallback: 'blocking' }
}

const Chains: React.FC<IDexsContainer> = (props) => {
	return (
		<Layout title={`${props.chain} Volumes - DefiLlama`} defaultSEO>
			<DexsContainer {...props} />
		</Layout>
	)
}

export default Chains
