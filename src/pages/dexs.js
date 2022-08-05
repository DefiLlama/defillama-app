import * as React from 'react'
import Layout from '~/layout'
import DexsContainer from '~/containers/DexsContainer'
import { revalidate } from '~/api'
import { getNewDexsPageData } from '~/api/categories/dexs'

export async function getStaticProps() {
	const data = await getNewDexsPageData('All')
	return {
		...data,
		revalidate: revalidate()
	}
}

export default function Chains(props) {
	return (
		<Layout title={`All DEX volumes - DefiLlama`} defaultSEO>
			<DexsContainer {...props} />
		</Layout>
	)
}
