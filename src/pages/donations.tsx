import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { PROTOCOLS_API } from '~/constants'
import Layout from '~/layout'
import { tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const hideProtocols = ['Mycelium', 'Hubble Exchange', 'NEX']

export const getStaticProps = withPerformanceLogging('donations', async () => {
	const { protocols, parentProtocols } = await fetchJson(PROTOCOLS_API)

	const protocolsWithReferralurl: Record<string, { name: string; logo: string; url: string; tvl: number }> = {}

	for (const parent of parentProtocols) {
		if (parent.referralUrl == null) continue
		protocolsWithReferralurl[parent.id] = {
			name: parent.name,
			logo: tokenIconUrl(parent.name),
			url: parent.referralUrl,
			tvl: 0
		}
	}

	for (const protocol of protocols) {
		if (protocolsWithReferralurl[protocol.parentProtocol]) {
			protocolsWithReferralurl[protocol.parentProtocol].tvl =
				(protocolsWithReferralurl[protocol.parentProtocol].tvl ?? 0) + (protocol.tvl ?? 0)
		}
		if (protocol.referralUrl == null) continue

		if (
			protocol.parentProtocol
				? protocolsWithReferralurl[protocol.parentProtocol] &&
					protocolsWithReferralurl[protocol.parentProtocol].url !== protocol.referralUrl
				: true
		) {
			protocolsWithReferralurl[protocol.defillamaId] = {
				name: protocol.name,
				logo: tokenIconUrl(protocol.name),
				url: protocol.referralUrl,
				tvl: protocol.tvl ?? 0
			}
		}
	}

	const finalProtocols = []
	for (const protocol in protocolsWithReferralurl) {
		if (hideProtocols.includes(protocolsWithReferralurl[protocol].name)) continue
		finalProtocols.push(protocolsWithReferralurl[protocol])
	}

	return {
		props: {
			protocols: finalProtocols.sort((a, b) => b.tvl - a.tvl)
		},
		revalidate: maxAgeForNext([22])
	}
})

function DonationsPage({ protocols }) {
	return (
		<Layout
			title="Donations - DefiLlama"
			description={`Donate to DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`donations, defi donations`}
			canonicalUrl={`/donations`}
		>
			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h1 className="text-lg font-semibold">Why donate?</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					DefiLlama is an open-source project that runs no ads and provides all data for free. We have no revenue and
					are supported by donations.
				</p>
			</div>
			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h1 className="text-lg font-semibold">Direct donation</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<div className="flex flex-col gap-2">
					<p>You can send us any token, on any network, to the following address:</p>
					<ul className="flex flex-col gap-1">
						<li>0x08a3c2A819E3de7ACa384c798269B3Ce1CD0e437</li>
					</ul>
				</div>
			</div>
			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h1 className="text-lg font-semibold">Affiliate links</h1>
				<hr className="border-black/20 dark:border-white/20" />
				<div className="flex flex-col gap-3">
					<p>
						DefiLlama has referral links for all these protocols, using them with our referral sends us some rewards:
					</p>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
						{protocols.map((p) => (
							<a
								key={p.name}
								className="flex items-center gap-2 rounded-lg bg-black/5 p-2 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
								target="_blank"
								rel="noopener noreferrer"
								href={p.url}
							>
								<img src={p.logo} alt={`${p.name} logo`} className="h-6 w-6 flex-shrink-0 rounded-full" />
								<span className="truncate text-sm text-(--blue)">{p.name}</span>
							</a>
						))}
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
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

export default DonationsPage
