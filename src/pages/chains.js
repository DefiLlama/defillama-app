import * as React from 'react'
import Layout from '~/layout'
import ChainsContainer from '~/containers/ChainsContainer'
import { revalidate } from '~/api'
import { getNewChainsPageData } from '~/api/categories/protocols'

export async function getStaticProps() {
	const data = await getNewChainsPageData('All')
	return {
		...data,
		revalidate: revalidate()
	}
}

export default function Chains(props) {
	return (
		<Layout title={`All Chains TVL - DefiLlama`} defaultSEO>
			<ChainsContainer {...props} />
		</Layout>
	)
}
