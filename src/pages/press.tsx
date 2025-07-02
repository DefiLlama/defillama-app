import * as React from 'react'
import Layout from '~/layout'
import { TokenLogo } from '~/components/TokenLogo'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

const PressPanel = ({ imageFilename }) => (
	<div className="border border-(--form-control-border) rounded-md text-center p-4">
		<TokenLogo logo={`/press/${imageFilename}`} size={150} />
	</div>
)

const pressList = [
	['us-treasury.png', 'https://home.treasury.gov/system/files/221/TBACCharge2Q22025.pdf'],
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

function PressPage() {
	return (
		<Layout title="Press - DefiLlama" defaultSEO>
			<ProtocolsChainsSearch />
			<h1 className="text-xl font-semibold bg-(--cards-bg) rounded-md p-3">Press & Media</h1>

			<div className="flex flex-col gap-4 bg-(--cards-bg) p-3 rounded-md">
				<h2 className="font-semibold text-lg">About DefiLlama</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					DefiLlama is the largest data aggregator for DeFi (Decentralized Finance). Our data is fully open-source and
					maintained by a team of passionate individuals and contributors from thousands of protocols.
				</p>
				<p>
					As a comprehensive DeFi data analysis platform, DefiLlama provides data across a wide variety of fundamentals,
					including TVL, Fees, Revenue, Volume, Stablecoins, Governance, Unlocks, and Yields.
				</p>
				<p>
					DefiLlama’s vision is to aggregate the most accurate, transparent, and neutral data for all blockhains and
					cryptocurrency applications.
				</p>
			</div>

			<div className="flex flex-col gap-4 bg-(--cards-bg) p-3 rounded-md">
				<h2 className="font-semibold text-lg">Contact</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					The best way to contact us and the one in which you'll get a reply the fastest is through our{' '}
					<a
						className="text-(--blue) hover:underline"
						target="_blank"
						rel="noopener noreferrer"
						href="https://discord.defillama.com"
					>
						Discord
					</a>
					. If you want communication to be private you can use{' '}
					<a
						className="text-(--blue) hover:underline"
						target="_blank"
						rel="noopener noreferrer"
						href="https://twitter.com/defillama"
					>
						Twitter
					</a>{' '}
					as a slower alternative, or, as an even slower option, you can also contact us by email at{' '}
					<a
						className="text-(--blue) hover:underline"
						target="_blank"
						rel="noopener noreferrer"
						href="mailto:support@defillama.com"
					>
						support@defillama.com
					</a>
				</p>
				<p>
					DefiLlama is a part of{' '}
					<a
						className="text-(--blue) hover:underline"
						target="_blank"
						rel="noopener noreferrer"
						href="https://twitter.com/llamacorporg"
					>
						Llama Corp
					</a>
					.
				</p>
				<p>
					Llama Corp is a collective building out the decentralized future with data analytics, infrastructure,
					payments, cross-chain and media solutions used by more than 10M monthly users.
				</p>
			</div>

			<div className="flex flex-col gap-4 bg-(--cards-bg) p-3 rounded-md">
				<h2 className="font-semibold text-lg">Press</h2>
				<hr className="border-black/20 dark:border-white/20" />

				<p>DefiLlama Data is free to use by anyone for press usage. Attribution is always appreciated.</p>
				<hr className="border-black/20 dark:border-white/20" />
				<p>DefiLlama is used across a large number of media organisations, governments, and financial institutions.</p>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(100px,200px))] place-content-center w-full gap-2 mt-4">
					{pressList.map((imageFilename) => (
						<a
							className="text-(--blue) hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href={imageFilename[1]}
							key={imageFilename[0]}
						>
							<PressPanel imageFilename={imageFilename[0]} />
						</a>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-4 bg-(--cards-bg) p-3 rounded-md">
				<h2 className="font-semibold text-lg">Branding Assets</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					We have a few guidelines for using our brand resources. These ensure that our brand is always recognizable and
					consistent.
				</p>
				<p>
					<a
						className="text-(--blue) hover:underline"
						target="_blank"
						rel="noopener noreferrer"
						href="/defillama-press-kit.zip"
					>
						Download branding assets
					</a>
				</p>
				<p>“DefiLlama” is one word, with a capital D and capital L The F is not capitalized.</p>
				<p>
					We always pair our name with the llama icon. We prefer to use the full DefiLlama name and icon when possible,
					but in situations where the association with DefiLlama is clear, the icon may be used on its own.
				</p>
				<p>The primary color used on DefiLlama is #2172E5.</p>
			</div>
		</Layout>
	)
}

export default PressPage
