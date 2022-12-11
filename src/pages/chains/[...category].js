import * as React from 'react'
import Layout from '~/layout'
import ChainsContainer from '~/containers/Defi/Chains'
import { addMaxAgeHeaderForNext } from '~/api'
import { getNewChainsPageData } from '~/api/categories/protocols'

export const getServerSideProps = async ({
	params: {
		category: [category]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const data = await getNewChainsPageData(category)
	return { ...data }
}

export default function Chains(props) {
	const { category } = props
	return (
		<Layout title={`${category} TVL - DefiLlama`} defaultSEO>
			<ChainsContainer {...props} />
		</Layout>
	)
}
