import * as React from 'react'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import { Divider, Panel } from '~/components'
import { RowBetween } from '~/components/Row'
import Link from '~/components/Link'

const DashGrid = styled.div`
	display: grid;
	grid-gap: 1em;
	grid-template-columns: 1fr;
	grid-template-areas: 'account';
	padding: 0 4px;

	> * {
		justify-content: flex-end;
	}
`

function PluginPage() {
	return (
		<Layout title="DefiLlama - ChatGPT Plugin" defaultSEO>
			<RowBetween>
				<TYPE.largeHeader>DefiLlama ChatGPT Plugin</TYPE.largeHeader>
			</RowBetween>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.heading>Legal</TYPE.heading>
					<Divider />
					<TYPE.main>The DefiLlama ChatGPT plugin does not sell user data. The plugin does not collect any identifying user data.</TYPE.main>					
					<TYPE.main>
						The DefiLlama Plugin uses{' '}
						<Link href="https://mixpanel.com/">Mixpanel</Link> to track anonymized product analytics. Visit {' '}
						<Link href="https://mixpanel.com/legal/privacy-policy/">Mixpanel’s Privacy Policy</Link> to learn more about how they handle data.
					</TYPE.main>
				</DashGrid>			
			</Panel>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
						<TYPE.heading>About</TYPE.heading>
						<Divider />			
						<TYPE.main>
							DefiLlama is the most popular DeFi (Decentralized Finance) data aggregator.
							The DefiLlama ChatGPT plugin retrieves current and historical data on blockchains, DeFi applications and bridges.
						</TYPE.main>
					</DashGrid>	
			</Panel>
		</Layout>
	)
}



export default PluginPage
