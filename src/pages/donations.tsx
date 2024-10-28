import * as React from 'react'
import Layout from '~/layout'
import { Panel } from '~/components'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

function Section({ title, children }) {
	return (
		<>
			<h1 className="text-2xl font-medium">{title}</h1>
			<p>{children}</p>
		</>
	)
}

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
			<Panel style={{ marginTop: '6px' }}>
				<div className="flex flex-col gap-4">
					<Section title="Why donate?">
						DefiLlama is an open-source project that runs no ads and provides all data for free. We have no revenue and
						are supported by donations.
					</Section>

					<hr className="border-black/20 dark:border-white/20" />

					<Section title="Affiliate links">
						DefiLlama has referral links for all these protocols, using them with our referral sends us some rewards:
						<ul>
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
					</Section>

					<hr className="border-black/20 dark:border-white/20" />

					<Section title="Direct donation">
						You can send us any token, on any network, to the following address:
						0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437
					</Section>

					<hr className="border-black/20 dark:border-white/20" />

					<Section title="Use of funds">
						Funds are only used for 2 purposes:
						<ul>
							<li>Pay the llamas working on DefiLlama</li>
							<li>Cover costs associated with running defillama (this is mostly server costs)</li>
						</ul>
					</Section>
				</div>
			</Panel>
		</Layout>
	)
}

export default PressPage
