import * as React from 'react'
import Layout from '~/layout'
import { Panel } from '~/components'

function AboutPage() {
	return (
		<Layout title="DefiLlama - DeFi Dashboard" defaultSEO>
			<h1 className="text-2xl font-medium mt-2 -mb-5">About</h1>
			<Panel>
				<div className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">About DeFiLlama</h2>
					<hr className="border-black/20 dark:border-white/20" />
					<p>
						DefiLlama is the largest TVL aggregator for DeFi (Decentralized Finance). Our data is fully{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="https://github.com/DefiLlama/DefiLlama-Adapters"
						>
							open-source
						</a>{' '}
						and maintained by a team of passionate individuals and{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="https://github.com/DefiLlama/DefiLlama-Adapters/graphs/contributors"
						>
							contributors
						</a>{' '}
						from hundreds of protocols.
					</p>
					<p>Our focus is on accurate data and transparent methodology.</p>
				</div>
			</Panel>
			<Panel>
				<div className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">Contact</h2>
					<hr className="border-black/20 dark:border-white/20" />
					<p>
						The best way to contact us and the one in which you'll get a reply the fastest is through our{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="https://discord.defillama.com"
						>
							Discord
						</a>
						. If you want communication to be private you can use{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="https://twitter.com/defillama"
						>
							Twitter
						</a>{' '}
						as a slower alternative, or, as an even slower option, you can also contact us by email at{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="mailto:0xngmi@llama.fi"
						>
							0xngmi@llama.fi
						</a>{' '}
						or{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="mailto:contact@llama-corp.com"
						>
							contact@llama-corp.com
						</a>
						.
					</p>
					<p>
						For questions around product, methodology, data... You'll get mych faster responses by using our priority
						support, available{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="https://defillama.com/pro-api"
						>
							here after subscribing
						</a>
					</p>
					<p>
						DeFiLlama is a part of{' '}
						<a
							className="text-[var(--blue)] hover:underline"
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
			</Panel>
			<Panel>
				<div className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">Acknowledgements</h2>
					<hr className="border-black/20 dark:border-white/20" />
					<p>
						Thanks to{' '}
						<a
							className="text-[var(--blue)] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href="https://allium.so/"
						>
							Allium
						</a>{' '}
						for their indexer service.
					</p>
				</div>
			</Panel>
		</Layout>
	)
}

export default AboutPage
