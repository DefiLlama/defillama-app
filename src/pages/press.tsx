import * as React from 'react'
import styled from 'styled-components'
import { Box } from 'rebass'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import { Divider, Panel } from '~/components'
import { RowBetween } from '~/components/Row'
import Link from '~/components/Link'
import PressLogo from '~/components/TokenLogo'
import { AutoColumn } from '~/components/Column'

const PressPanel = ({ imageFilename }) => (
	<Panel style={{ padding: '18px 25px' }}>
		<AutoColumn gap="4px">
			<PressLogo logo={`/press/${imageFilename}`} size={150} />
		</AutoColumn>
	</Panel>
)

const pressList = [
	['us-treasury.png', 'https://home.treasury.gov/system/files/261/FSOC-Digital-Assets-Report-2022.pdf'],
	['ft.png', 'https://www.ft.com/content/b0c581c8-96b2-4c34-abcc-5189d7283891'],
	[
		'ecb.png',
		'https://www.ecb.europa.eu/pub/financial-stability/macroprudential-bulletin/focus/2022/html/ecb.mpbu202207_focus1.en.html'
	],
	[
		'bloomberg.png',
		'https://www.bloomberg.com/news/articles/2022-09-07/the-blockchain-trilemma-that-s-holding-back-crypto-quicktake'
	],
	[
		'gs.png',
		'https://www.gspublishing.com/content/research/en/reports/2021/10/22/3094e0f0-379e-4f11-8dce-7f74a7718eb7.html'
	],
	[
		'boa.png',
		'https://business.bofa.com/content/dam/flagship/bank-of-america-institute/transformation/web3-only-the-first-inning-may-2022.pdf'
	],
	['ms.png', 'https://advisor.morganstanley.com/scott.altemose/documents/field/s/sc/scott-a--altemose/DeFi_Apr.pdf'],
	['nasdaq.png', 'https://www.nasdaq.com/articles/is-all-defi-doomed'],
	['wsj.png', 'https://www.wsj.com/articles/why-the-worlds-biggest-traders-are-betting-on-blockchain-data-11638803023'],
	//['yahoo.png', 'https://finance.yahoo.com/news/defi-total-value-locked-reaches-092546041.html'],
	[
		'techcrunch.png',
		'https://techcrunch.com/2022/03/23/despite-declines-the-value-of-crypto-assets-in-defi-protocols-is-up-3x-from-a-year-ago/'
	],
	[
		'bi.png',
		'https://www.businessinsider.com/free-crypto-airdrops-experts-risks-rewards-defi-dydx-ens-paraswap-2021-11'
	],
	['coindesk.png', 'https://www.coindesk.com/learn/why-tvl-matters-in-defi-total-value-locked-explained/'],
	['ct.png', 'https://decrypt.co/94370/terra-defis-network-choice-ethereum']
]

export const DashGrid = styled.div`
	display: grid;
	grid-gap: 1em;
	grid-template-columns: 1fr;
	grid-template-areas: 'account';
	padding: 0 4px;

	> * {
		justify-content: flex-end;
	}
`

const PanelWrapper = styled(Box)`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(100px, 200px));
	place-content: center;
	gap: 6px;
	width: 100%;
`

function PressPage() {
	return (
		<Layout title="Press - DefiLlama" defaultSEO>
			<RowBetween>
				<TYPE.largeHeader>Press & Media</TYPE.largeHeader>
			</RowBetween>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.heading>About DeFiLlama</TYPE.heading>
					<Divider />
					<TYPE.main>
						DefiLlama is the largest TVL aggregator for DeFi (Decentralized Finance). Our data is fully{' '}
						<Link href="https://github.com/DefiLlama/DefiLlama-Adapters">open-source</Link> and maintained by a team of
						passionate individuals and{' '}
						<Link href="https://github.com/DefiLlama/DefiLlama-Adapters/graphs/contributors">contributors</Link> from
						hundreds of protocols.
					</TYPE.main>
					<TYPE.main>Our focus is on accurate data and transparent methodology.</TYPE.main>
				</DashGrid>
			</Panel>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.main area="account">Contact</TYPE.main>
					<Divider />
					<TYPE.main>
						Contact us on <Link href="https://twitter.com/defillama">Twitter</Link> or{' '}
						<Link href="https://discord.defillama.com">Discord</Link> or {' '} by email <Link href="mailto:contact@llama-corp.com">contact@llama-corp.com</Link>
					</TYPE.main>
					<TYPE.main>DeFiLlama is a part of <Link href="https://twitter.com/llamacorporg">Llama Corp</Link>.
					</TYPE.main>
					<TYPE.main>
					Llama Corp is a collective building out the decentralized future with data analytics, infrastructure, payments, cross-chain and media solutions used by more than 10M monthly users.
					</TYPE.main>
				</DashGrid>
			</Panel>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.heading>Press</TYPE.heading>
					<Divider />

					<TYPE.main>DL Data is free to use by anyone. Attribution is always appreciated.</TYPE.main>
					<Divider />
					<TYPE.main>
						DeFiLlama is used across a large number of media organisations and financial institutions.
					</TYPE.main>
					<PanelWrapper mt={[0, 0, '1rem']}>
						{pressList.map((imageFilename) => (
							<Link href={imageFilename[1]} key={imageFilename[0]}>
								<PressPanel imageFilename={imageFilename[0]} />
							</Link>
						))}
					</PanelWrapper>
				</DashGrid>
			</Panel>
			<Panel style={{ marginTop: '6px' }}>
				<DashGrid style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
					<TYPE.heading>Branding Assets</TYPE.heading>
					<Divider />
					<TYPE.main>
						You can download all our branding assets from <Link href="/defillama-press-kit.zip">here</Link>.
					</TYPE.main>
				</DashGrid>
			</Panel>
		</Layout>
	)
}

export default PressPage
