import * as React from 'react'
import { AggregatorContainer, getTokenList } from '~/components/Aggregator'
import ConnectButton from '~/components/Aggregator/ConnectButton'
import { WalletWrapper } from '~/components/WalletProvider'
import Layout from '~/layout'

export async function getStaticProps() {
	return getTokenList()
}

export default function Aggregator(props) {
	return (
		<WalletWrapper>
			<Layout title={`Meta-dex aggregator - DefiLlama`} defaultSEO>
				<ConnectButton />
				<AggregatorContainer tokenlist={props.tokenlist} />
			</Layout>
		</WalletWrapper>
	)
}
