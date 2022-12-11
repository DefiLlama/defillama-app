import * as React from 'react'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import { Divider, Panel } from '~/components'
import { RowBetween } from '~/components/Row'
import Link from '~/components/Link'
import { addMaxAgeHeaderForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'
import { GetServerSideProps } from 'next'

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

const Metrics = styled.table`
	color: ${({ theme }) => theme.text1};
	border: 1px solid ${({ theme }) => theme.bg3};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	background-color: ${({ theme }) => theme.advancedBG};
	border-radius: 8px;
	border-spacing: 0;

	th,
	td {
		font-weight: 500;
		font-size: 0.875rem;
		padding: 16px;
		border-bottom: 1px solid ${({ theme }) => theme.divider};
	}

	td {
		font-weight: 400;
		text-align: center;
		border-bottom: 0;
	}

	td:first-child,
	th:first-child {
		border-right: 1px solid ${({ theme }) => theme.divider};
	}
`

function AboutPage({ chains, protocols }) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard" defaultSEO>
			<RowBetween>
				<TYPE.largeHeader>About</TYPE.largeHeader>
			</RowBetween>
			<Metrics>
				<thead>
					<tr>
						<th>Total Chains Listed</th>
						<th>Total Protocols Listed</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>{chains}</td>
						<td>{protocols}</td>
					</tr>
				</tbody>
			</Metrics>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.main area="account">Mission</TYPE.main>
					<Divider />

					<TYPE.main>
						DefiLlama is the largest TVL aggregator for DeFi (Decentralized Finance). Our data is fully{' '}
						<Link href="https://github.com/DefiLlama/DefiLlama-Adapters">open-source</Link> and maintained by a team of
						passionate individuals and{' '}
						<Link href="https://github.com/DefiLlama/DefiLlama-Adapters/graphs/contributors">contributors</Link> from
						hundreds of protocols.
					</TYPE.main>
					<TYPE.main>Our focus is on accurate data and transparent methodology.</TYPE.main>
					<TYPE.main>We track over 1955 DeFi protocols from over 145 different blockchains.</TYPE.main>
					<Divider />
					<TYPE.main>
						Contact us on <Link href="https://twitter.com/defillama">Twitter</Link> or{' '}
						<Link href="https://discord.defillama.com">Discord</Link>
					</TYPE.main>
				</DashGrid>
			</Panel>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.main area="account">Acknowledgements</TYPE.main>
					<Divider />
					<TYPE.main>
						Thanks to <Link href="https://www.coingecko.com/">CoinGecko</Link>
					</TYPE.main>
					<Divider />
					<TYPE.main>
						DeFiLlama&apos;s design is based on <Link href="https://github.com/Uniswap/uniswap-info">Uniswap.info</Link>
					</TYPE.main>
				</DashGrid>
			</Panel>
		</Layout>
	)
}

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const data = await getChainPageData()

	const chains = data?.props?.chainsSet?.length ?? null
	const protocols = data?.props?.filteredProtocols?.length ?? null

	return {
		props: {
			chains,
			protocols
		}
	}
}

export default AboutPage
