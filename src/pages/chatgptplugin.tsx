import * as React from 'react'
import Layout from '~/layout'

function PluginPage() {
	return (
		<Layout
			title="DefiLlama - ChatGPT Plugin"
			description={`DefiLlama ChatGPT plugin. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`defillama chatgpt plugin, defillama chatgpt`}
			canonicalUrl={`/chatgptplugin`}
		>
			<h1 className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-xl font-semibold">
				DefiLlama ChatGPT Plugin
			</h1>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">About</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					DefiLlama is the most popular DeFi (Decentralized Finance) data aggregator. The DefiLlama ChatGPT plugin
					retrieves current and historical data on blockchains, DeFi applications and bridges.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Best Practices</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>To achieve the best results from the plugin, follow these steps:</p>
				<p>1. Ask "What features do you have?" to see the most recent feature list.</p>
				<p>
					2. Select a question to ask from the feature list. For instance, if you want to learn about DEX trading
					activity, the feature list will show you that the plugin can answer questions about the volume of a specific
					DEX or provide a ranking of DEXs by volume.
				</p>
				<p>
					Optional: Many of the features have filtering options that you can use to tailor your question. These
					filtering options are shared in the feature list. For example, if you ask for top yield pools, you can filter
					by chain, stablecoin usage, single-sided, and the future outlook for the yield rate (stable, up, down).
					Therefore, you could ask "Give me the top 10 stablecoin yields on Polygon that are single-sided".
				</p>
				<p>
					If you have any feedback or bug reports, please log them here:{' '}
					<a
						className="text-(--blue) hover:underline"
						target="_blank"
						rel="noopener noreferrer"
						href="https://form.typeform.com/to/tJkEGYxQ"
					>
						Feedback Form
					</a>
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Legal</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					The DefiLlama ChatGPT plugin does not sell user data. The plugin does not collect any identifying user data.
				</p>
				<p>
					The DefiLlama Plugin uses{' '}
					<a target="_blank" rel="noopener noreferrer" href="https://posthog.com/">
						PostHog
					</a>{' '}
					to track anonymized product analytics. Visit{' '}
					<a target="_blank" rel="noopener noreferrer" href="https://posthog.com/privacy">
						PostHog’s Privacy Policy
					</a>{' '}
					to learn more about how they handle data.
				</p>
			</div>
		</Layout>
	)
}

export default PluginPage
