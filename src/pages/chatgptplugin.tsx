import * as React from 'react'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
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
				<Header>DefiLlama ChatGPT Plugin</Header>
			</RowBetween>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.heading>About</TYPE.heading>
					<Divider />
					<TYPE.main>
						DefiLlama is the most popular DeFi (Decentralized Finance) data aggregator. The DefiLlama ChatGPT plugin
						retrieves current and historical data on blockchains, DeFi applications and bridges.
					</TYPE.main>
				</DashGrid>
			</Panel>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.heading>Best Practices</TYPE.heading>
					<Divider />
					<TYPE.main>
						To achieve the best results from the plugin, follow these steps:
					</TYPE.main>
					<TYPE.main>
						1. Ask "What features do you have?" to see the most recent feature list.
					</TYPE.main>
					<TYPE.main>
						2. Select a question to ask from the feature list. For instance, if you want to learn about DEX trading activity, the feature list will show you that the plugin can answer questions about the volume of a specific DEX or provide a ranking of DEXes by volume.
					</TYPE.main>
					<TYPE.main>
						Optional: Many of the features have filtering options that you can use to tailor your question. These filtering options are shared in the feature list. For example, if you ask for top yield pools, you can filter by chain, stablecoin usage, single-sided, and the future outlook for the yield rate (stable, up, down). Therefore, you could ask "Give me the top 10 stablecoin yields on Polygon that are single-sided".
					</TYPE.main>
					<TYPE.main>
						If you have any feedback or bug reports, please log them here: <Link href="https://form.typeform.com/to/tJkEGYxQ">Feedback Form</Link>
					</TYPE.main>
				</DashGrid>
			</Panel>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.heading>Legal</TYPE.heading>
					<Divider />
					<TYPE.main>
						The DefiLlama ChatGPT plugin does not sell user data. The plugin does not collect any identifying user data.
					</TYPE.main>
					<TYPE.main>
						The DefiLlama Plugin uses <Link href="https://posthog.com/">PostHog</Link> to track anonymized product
						analytics. Visit <Link href="https://posthog.com/privacy">PostHog’s Privacy Policy</Link> to
						learn more about how they handle data.
					</TYPE.main>
				</DashGrid>
			</Panel>
		</Layout>
	)
}

export default PluginPage
