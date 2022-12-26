import * as React from 'react'
import Layout from '~/layout'
import ChainsContainer from '~/containers/Defi/Chains'
import { maxAgeForNext } from '~/api'
import { getNewChainsPageData } from '~/api/categories/protocols'
import { CONFIG_API } from '~/constants/index'

export async function getStaticProps({
	params: {
		category: [category]
	}
}) {
	const data = await getNewChainsPageData(category)
	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	const { chainCoingeckoIds = {} } = await fetch(CONFIG_API).then((res) => res.json())

	const categories = ['All', 'Non-EVM']
	for (const chain in chainCoingeckoIds) {
		chainCoingeckoIds[chain].categories?.forEach((category) => {
			if (!categories.includes(category)) {
				categories.push(category)
			}
		})

		const parentChain = chainCoingeckoIds[chain].parent?.chain

		if (parentChain && !categories.includes(parentChain)) {
			categories.push(parentChain)
		}
	}

	const paths = categories.map((category) => ({
		params: { category: [category] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Chains(props) {
	const { category } = props
	return (
		<Layout title={`${category} TVL - DefiLlama`} defaultSEO>
			<ChainsContainer {...props} />
		</Layout>
	)
}
