import * as React from 'react'
import Layout from '~/layout'
import DexsContainer, { IDexsContainer } from '~/containers/DexsContainer'
import { revalidate } from '~/api'
import { getNewDexsPageData } from '~/api/categories/dexs'

export async function getStaticProps() {
	const { props } = await getNewDexsPageData()

	return {
		props,
		revalidate: revalidate()
	}
}

const Chains: React.FC<IDexsContainer> = (props) => {
	return (
		<Layout title={'All DEX volumes - DefiLlama'} defaultSEO>
			<DexsContainer {...props} />
		</Layout>
	)
}

export default Chains
