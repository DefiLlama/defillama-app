import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import Layout from '~/layout'
import { tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('donations', async () => {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo', 'url', 'referralUrl'])
	return {
		props: {
			protocols: protocols
				.filter(
					(p) => p.referralUrl != null && !['Mycelium Perpetual Swaps', 'Hubble Exchange', 'NEX'].includes(p.name)
				)
				.map((protocol) => ({
					name: protocol.name,
					logo: tokenIconUrl(protocol.name),
					url: protocol.referralUrl
				}))
		},
		revalidate: maxAgeForNext([22])
	}
})

function PressPage({ protocols }) {
	return (
		<Layout title="Donations - DefiLlama" defaultSEO>
			<ProtocolsChainsSearch />
			<div className="bg-(--cards-bg) p-3 rounded-md flex flex-col gap-4">
				<h1 className="text-lg font-semibold">Why donate?</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					DefiLlama is an open-source project that runs no ads and provides all data for free. We have no revenue and
					are supported by donations.
				</p>
			</div>
			<div className="bg-(--cards-bg) p-3 rounded-md flex flex-col gap-4">
				<h1 className="text-lg font-semibold">Affiliate links</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<div className="flex flex-col gap-2">
					<p>
						DefiLlama has referral links for all these protocols, using them with our referral sends us some rewards:
					</p>
					<ul className="flex flex-col gap-1">
						{protocols.map((p) => (
							<li key={p.name}>
								<a className="text-(--blue) hover:underline" target="_blank" rel="noopener noreferrer" href={p.url}>
									{p.name}
								</a>
							</li>
						))}
					</ul>
				</div>
			</div>
			<div className="bg-(--cards-bg) p-3 rounded-md flex flex-col gap-4">
				<h1 className="text-lg font-semibold">Direct donation</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<div className="flex flex-col gap-2">
					<p>You can send us any token, on any network, to the following address:</p>
					<ul className="flex flex-col gap-1">
						<li>0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437</li>
					</ul>
				</div>
			</div>
			<div className="bg-(--cards-bg) p-3 rounded-md flex flex-col gap-4">
				<h1 className="text-lg font-semibold">Use of funds</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<div className="flex flex-col gap-2">
					<p>Funds are only used for 2 purposes:</p>
					<ul className="flex flex-col gap-1">
						<li>Pay the llamas working on DefiLlama</li>
						<li>Cover costs associated with running defillama (this is mostly server costs)</li>
					</ul>
				</div>
			</div>
		</Layout>
	)
}

export default PressPage
