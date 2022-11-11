import * as React from 'react'
import { revalidate } from '~/api'
import { getVolumesByChain } from '~/api/categories/dexs'
import VolumesByChainContainer from '~/containers/Dex/Chains'
import Layout from '~/layout'

export async function getStaticProps() {
	const data = await getVolumesByChain()

	return {
		...data,
		revalidate: revalidate()
	}
}

const AllChainsDexs = (props) => {
	return (
		<Layout title={`Volumes by Chain - DefiLlama`} defaultSEO>
			<VolumesByChainContainer {...props} />
		</Layout>
	)
}

export default AllChainsDexs
