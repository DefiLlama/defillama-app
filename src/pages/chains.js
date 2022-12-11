import * as React from 'react'
import Layout from '~/layout'
import ChainsContainer from '~/containers/Defi/Chains'
import { addMaxAgeHeaderForNext } from '~/api'
import { getNewChainsPageData } from '~/api/categories/protocols'

export const getServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const { props: data } = await getNewChainsPageData('All')
	const sampledData = []
	const dataLength = data.stackedDataset.length
	for (let i = 0; i < dataLength; i++) {
		if (i % 2 === 0 || i === dataLength - 1) {
			sampledData.push(data.stackedDataset[i])
		}
	}
	data.stackedDataset = sampledData
	return {
		props: data
	}
}

export default function Chains(props) {
	return (
		<Layout title={`All Chains TVL - DefiLlama`} defaultSEO>
			<ChainsContainer {...props} />
		</Layout>
	)
}
