import * as React from 'react'
import Layout from '~/layout'
import { Panel } from '~/components'
import Link from '~/components/Link'

function PluginPage() {
	return (
		<Layout title="DefiLlama - ChatGPT Plugin" defaultSEO>
			<h1 className="text-2xl font-medium mt-2 -mb-5">DefiLlama ChatGPT Plugin</h1>
			<Panel>
				<div className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">About</h2>
					<hr className="border-black/20 dark:border-white/20" />
					<p>
						DefiLlama is the most popular DeFi (Decentralized Finance) data aggregator. The DefiLlama ChatGPT plugin
						retrieves current and historical data on blockchains, DeFi applications and bridges.
					</p>
				</div>
			</Panel>
			<Panel>
				<div className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">Best Practices</h2>
					<hr className="border-black/20 dark:border-white/20" />
					<p>To achieve the best results from the plugin, follow these steps:</p>
					<p>1. Ask "What features do you have?" to see the most recent feature list.</p>
					<p>
						2. Select a question to ask from the feature list. For instance, if you want to learn about DEX trading
						activity, the feature list will show you that the plugin can answer questions about the volume of a specific
						DEX or provide a ranking of DEXes by volume.
					</p>
					<p>
						Optional: Many of the features have filtering options that you can use to tailor your question. These
						filtering options are shared in the feature list. For example, if you ask for top yield pools, you can
						filter by chain, stablecoin usage, single-sided, and the future outlook for the yield rate (stable, up,
						down). Therefore, you could ask "Give me the top 10 stablecoin yields on Polygon that are single-sided".
					</p>
					<p>
						If you have any feedback or bug reports, please log them here:{' '}
						<Link href="https://form.typeform.com/to/tJkEGYxQ">Feedback Form</Link>
					</p>
				</div>
			</Panel>
			<Panel>
				<div className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">Legal</h2>
					<hr className="border-black/20 dark:border-white/20" />
					<p>
						The DefiLlama ChatGPT plugin does not sell user data. The plugin does not collect any identifying user data.
					</p>
					<p>
						The DefiLlama Plugin uses <Link href="https://posthog.com/">PostHog</Link> to track anonymized product
						analytics. Visit <Link href="https://posthog.com/privacy">PostHog’s Privacy Policy</Link> to learn more
						about how they handle data.
					</p>
				</div>
			</Panel>
		</Layout>
	)
}

export default PluginPage
