import * as React from 'react'
import Layout from '~/layout'
import DexsContainer from '~/containers/DexsContainer'
import { revalidate } from '~/api'
import { getNewDexsPageData } from '~/api/categories/dexs'
import { getProtocolsRaw } from '~/api/categories/protocols'
import { LiteProtocol } from '~/api/types'

export async function getStaticProps() {
	const dexsData = await getNewDexsPageData()
	const protocolsData = (await getProtocolsRaw()) as { protocols: LiteProtocol[] }
	const props = dexsData.props
	props['tvlData'] = protocolsData.protocols.reduce((acc, pd) => {
		acc[pd.name] = pd.tvlPrevDay
		return acc
	}, {})
	return {
		props,
		revalidate: revalidate()
	}
}

const Chains: React.FC<any> = (props) => {
	return (
		<Layout title={'All DEX volumes - DefiLlama'} defaultSEO>
			<DexsContainer {...props} />
		</Layout>
	)
}

export default Chains
