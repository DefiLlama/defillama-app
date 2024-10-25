import * as React from 'react'
import Layout from '~/layout'
import { Panel } from '~/components'
import { RowBetween } from '~/components/Row'
import Link from '~/components/Link'

function AboutPage() {
	return (
		<Layout title="DefiLlama - DeFi Dashboard" defaultSEO>
			<RowBetween>
				<h1 className="text-2xl font-medium -mb-5">About</h1>
			</RowBetween>
			<Panel>
				<div className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">About DeFiLlama</h2>
					<hr className="border-black/20 dark:border-white/20" />
					<p>
						DefiLlama is the largest TVL aggregator for DeFi (Decentralized Finance). Our data is fully{' '}
						<Link href="https://github.com/DefiLlama/DefiLlama-Adapters">open-source</Link> and maintained by a team of
						passionate individuals and{' '}
						<Link href="https://github.com/DefiLlama/DefiLlama-Adapters/graphs/contributors">contributors</Link> from
						hundreds of protocols.
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
						<Link href="https://discord.defillama.com">Discord</Link>. If you want communication to be private you can
						use <Link href="https://twitter.com/defillama">Twitter</Link> as a slower alternative, or, as an even slower
						option, you can also contact us by email at <Link href="mailto:0xngmi@llama.fi">0xngmi@llama.fi</Link> or{' '}
						<Link href="mailto:contact@llama-corp.com">contact@llama-corp.com</Link>.
					</p>
					<p>
						For questions around product, methodology, data... You'll get mych faster responses by using our priority
						support, available <Link href="/pro-api">here after subscribing</Link>
					</p>
					<p>
						DeFiLlama is a part of <Link href="https://twitter.com/llamacorporg">Llama Corp</Link>.
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
						Thanks to <Link href="https://allium.so/">Allium</Link> for their indexer service.
					</p>
				</div>
			</Panel>
		</Layout>
	)
}

export default AboutPage
