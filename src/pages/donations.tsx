import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('donations', async () => {
	const { protocols } = await getSimpleProtocolsPageData(['name', 'logo', 'url', 'referralUrl'])
	return {
		props: {
			protocols: protocols
				.filter((p) => p.referralUrl !== undefined)
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
			<h1 className="text-2xl font-medium mt-2 -mb-5">Donations</h1>

			<div className="flex flex-col gap-4 border border-black/10 dark:border-white/10 p-5 rounded-md mt-2">
				<h1 className="text-2xl font-medium">Why donate?</h1>

				<p>
					DefiLlama is an open-source project that runs no ads and provides all data for free. We have no revenue and
					are supported by donations.
				</p>

				<hr className="border-black/20 dark:border-white/20" />

				<h1 className="text-2xl font-medium">Affiliate links</h1>
				<div className="flex flex-col gap-2">
					<p>
						DefiLlama has referral links for all these protocols, using them with our referral sends us some rewards:
					</p>
					<ul className="flex flex-col gap-1">
						{protocols.map((p) => (
							<li key={p.name}>
								<a
									className="text-[var(--blue)] hover:underline"
									target="_blank"
									rel="noopener noreferrer"
									href={p.url}
								>
									{p.name}
								</a>
							</li>
						))}
					</ul>
				</div>

				<hr className="border-black/20 dark:border-white/20" />

				<h1 className="text-2xl font-medium">Direct donation</h1>
				<div className="flex flex-col gap-2">
					<p>You can send us any token, on any network, to the following address:</p>
					<ul className="flex flex-col gap-1">
						<li>0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437</li>
					</ul>
				</div>

				<hr className="border-black/20 dark:border-white/20" />

				<h1 className="text-2xl font-medium">Use of funds</h1>
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
