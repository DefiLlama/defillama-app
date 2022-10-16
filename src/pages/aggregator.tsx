import * as React from 'react'
import { AggregatorContainer, getTokenList } from '~/components/Aggregator'
import Layout from '~/layout'

export async function getStaticProps() {
	return getTokenList()
}

export default function Aggregator(props) {
	return (
		<Layout title={`Meta-dex aggregator - DefiLlama`} defaultSEO>
			<AggregatorContainer tokenlist={props.tokenlist} />
		</Layout>
	)
}