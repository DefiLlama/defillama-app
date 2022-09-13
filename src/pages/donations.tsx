import * as React from 'react'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import { Divider, Panel } from '~/components'
import { RowBetween } from '~/components/Row'
import Link from '~/components/Link'
import { DashGrid } from './press'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { tokenIconUrl } from '~/utils'

function Section({title, children}){
	return <><TYPE.largeHeader>{title}</TYPE.largeHeader>
	<TYPE.main>{children}</TYPE.main>
	</>
}

export async function getStaticProps() {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo', 'url', 'referralUrl'])
	return {
		props: {
			protocols: protocols.filter(p=>p.referralUrl !== undefined).map((protocol) => ({
				name: protocol.name,
				logo: tokenIconUrl(protocol.name),
				url: protocol.referralUrl
			}))
		},
		revalidate: revalidate()
	}
}


function PressPage({protocols}) {
	return (
		<Layout title="Donations - DefiLlama" defaultSEO>
			<RowBetween>
				<TYPE.largeHeader>Donations</TYPE.largeHeader>
			</RowBetween>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<Section title="Why donate?">
						DefiLlama is an open-source project that runs no ads and provides all data for free. We have no revenue and are supported by donations.
					</Section>

					<Divider />

					<Section title="Gitcoin">
					Donations on gitcoin get matched with donations from a quadratic funding pool, so a small 1$ donation can get heavily amplified.
					<br /><br />
					DefiLlama has the following grants:
					<ul>
					{[
						["LlamaPay (preferred)", "https://gitcoin.co/grants/7077/llamapay"],
						["DefiLlama", "https://gitcoin.co/grants/3591/defillama"],
						["DefiLlama APIs", "https://gitcoin.co/grants/7087/defillama-apis"],
					].map(el=><li key={el[0]}><Link href={el[1]} external>{el[0]}</Link></li>)}
					</ul>
					</Section>

					<Divider />

					<Section title="Affiliate links" >
					DefiLlama has referral links for all these protocols, using them with our referral sends us some rewards:
					<ul>
					{protocols.map(p=><li key={p.name}><Link href={p.url} external>{p.name}</Link></li>)}
					</ul>
					</Section>

					<Divider />

					<Section title="Direct donation" >
					You can send us any token, on any network, to the following address: 0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437
					</Section>

					<Divider />

					<Section title="Use of funds" >
					Funds are only used for 2 purposes:
					<ul>
						<li>Pay the llamas working on DefiLlama</li>
						<li>Cover costs associated with running defillama (this is mostly server costs)</li>
					</ul>
					</Section>

				</DashGrid>
			</Panel>
		</Layout>
	)
}

export default PressPage
