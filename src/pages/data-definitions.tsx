import * as React from 'react'
import { BasicLink } from '~/components/Link'
import Layout from '~/layout'

export default function DataDefinitions() {
	return (
		<Layout
			title="DeFi Data Definitions (TVL, Fees, Revenue, DEX Volume) - DefiLlama"
			description={`Glossary of DeFi metrics: TVL, Fees, Revenue, FDV, DEX Volume, Stablecoin Market Cap, Treasuries and more.`}
			keywords={`data definitions DefiLlama, DeFi data definitions, TVL definition, crypto data definitions`}
			canonicalUrl={`/data-definitions`}
		>
			<h1 className="rounded-md bg-(--cards-bg) p-3 text-xl font-semibold">Data Definitions</h1>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">TVL</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>For protocols: Value of all coins held in smart contracts of the protocol</p>
				<p>For chains: Sum of TVL of the protocols in that chain</p>
				<p>
					In traditional finance terms, TVL is similar to Assets Under Management (AUM). It represents the total value
					of assets that users deposit into a protocol. This is similar to how a fund or bank might report the total
					value of client deposits or managed assets.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Fees</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>Total fees paid by users when using the protocol.</p>
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/fees">
						Fees
					</BasicLink>{' '}
					are equivalent to what would traditionally be considered Revenue in most off-chain businesses. They reflect
					the total amount paid by users for using the service, regardless of where those fees end up. This is the
					top-line number that shows how much the protocol is facilitating in economic activity.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Revenue</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					Subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or
					distributed among token holders. This doesn't include any fees distributed to Liquidity Providers.
				</p>
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/revenue">
						Revenue
					</BasicLink>{' '}
					, in the way defined here, is closer to Gross Income in traditional accounting. It's the portion of fees that
					the protocol keeps for itself after paying out costs to actors like liquidity providers. This is what goes to
					the team, the treasury, or tokenholders.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Holders Revenue</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					Subset of revenue that is distributed to tokenholders by means of buyback and burn, burning fees or direct
					distribution to stakers. Holders Revenue can also be called Tokenholder Revenue.
				</p>
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/holders-revenue">
						Holders Revenue
					</BasicLink>{' '}
					is similar to Dividends and Buybacks in traditional finance terms. It's the part of protocol revenue that is
					returned to tokenholders through staking rewards, fee burns, or direct payouts. Like dividends, this shows how
					much value the protocol is distributing back to its investors.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">USD Inflows</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					A protocol's TVL might go down even if more assets are deposited in the scenario where the prices of assets
					comprising TVL go down, so just looking at the TVL chart is not the best way to see if a protocol is receiving
					deposits or money is exiting, as that info gets mixed with price movements.
				</p>
				<p>USD Inflows is a metric that fixes that by representing the net asset inflows into a protocol's TVL.</p>
				<p>
					It's calculated by taking the balance difference for each asset between two consecutive days, multiplying that
					difference by asset price and then summing that for all assets.
				</p>
				<p>
					If a protocol has all of its TVL in ETH and one day ETH price drops 20% while there are no new deposits or
					withdrawals, TVL will drop by 20% while USD inflows will be $0.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Total Staked (Staked)</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/total-staked">
						Staked
					</BasicLink>{' '}
					represents the value of governance coins that are staked in the protocol's staking system.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Expenses</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/expenses">
						Expenses
					</BasicLink>{' '}
					here represent operational costs for salaries, audits... throughout the year. We collect this data mainly from
					annual protocol reports on their forums, so it's always referencing old data and will not be up-to-date in
					realtime like other DefiLlama data.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Total Raised</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/raises">
						Total Raised
					</BasicLink>{' '}
					includes the sum of all money raised by the protocol, including VC funding rounds, public sales and ICOs.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Active Addresses</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					Number of unique addresses that have interacted with the protocol directly. Interactions are counted as
					transactions sent directly against the protocol, thus transactions that go through an aggregator or some other
					middleman contract are not counted here.
				</p>
				<p>
					The reasoning for this is that this is meant to help measure stickiness/loyalty of users, and users that are
					interacting with the protocol through another product aren't likely to be sticky.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Treasury</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/treasuries">
						Treasury
					</BasicLink>{' '}
					represents the value of coins held in ownership by the protocol. By default this excludes coins created by the
					protocol itself.
				</p>
				<p>
					In traditional finance, terms, the Treasury is the protocol's Total Assets. This is what the protocol controls
					directly, and is often used to fund operations, growth initiatives, or serve as a reserve.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Token Volume</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>Sum of value in all swaps to or from that token across all Centralized and Decentralized exchanges.</p>
				<p>Data for this metric is imported directly from CoinGecko.</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Token Liquidity</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Fully Diluted Valuation (FDV)</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/fdv">
						Fully Diluted Valuation
					</BasicLink>{' '}
					is calculated by taking the expected maximum supply of the token and multiplying it by the price. It's mainly
					used to calculate the hypothetical marketcap of the token if all the tokens were unlocked and circulating.
				</p>
				<p>Data for this metric is imported directly from CoinGecko.</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Outstanding Fully Diluted Valuation (oFDV)</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/outstanding-fdv">
						Outstanding Fully Diluted Valuation
					</BasicLink>{' '}
					is calculated by multiplying the outstanding supply by the price. Outstanding supply is the total supply minus
					the supply that is not yet allocated to anything (e.g. coins in treasury or reserve). Outstanding FDV is
					intended to be a more accurate measurement of the market cap of coins that are already allocated.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">DEX Volume</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/dexs">
						Volume
					</BasicLink>{' '}
					traded on the DEX. This metric is only applicable to protocols that are exchanges, and it's just the sum of
					value of all trades that went through the DEX on a given day.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Events</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					This is a manually curated list of events that impacted the protocol. The reason why we display this is just
					to help the user understand the reason behind changes in the protocol metrics.
				</p>
				<p>
					Example: When there's a hack that causes a sudden drop in TVL we add an event at that date explaining that a
					hack was the reason why TVL dropped.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Median APY</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					Median APY across DeFi pools tracked by DefiLlama on a given protocol. This is calculated by finding all pools
					for that protocol, then sorting them by APY and finding the median weighted by TVL.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Total Borrowed (Borrowed)</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/total-borrowed">
						Total funds borrowed
					</BasicLink>{' '}
					from DeFi lending protocols. Borrowed funds can also be thought of as total loans issued by a lending
					protocol. Borrowed is excluded from TVL by default to account for looping strategies which can artificially
					inflate TVL.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">Stablecoins Market Cap</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>The total market cap of all stablecoins on a chain.</p>
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/stablecoins/chains">
						Stablecoin market cap
					</BasicLink>{' '}
					represents the total value of stablecoins on a chain, a proxy measure for liquidity and trust, as well as a
					measure of stablecoin adoption. This metric is only available for chains.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">App Fees</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					App Fees represents the sum of Fees on all protocols on a chain (excluding stablecoins and liquid staking
					protocols). App Fees is a measure of economic activity on a chain and can be used to evaluate how active an
					ecosystem is.
				</p>
			</div>

			<div className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
				<h2 className="text-lg font-semibold">App Revenue</h2>
				<hr className="border-black/20 dark:border-white/20" />
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/app-revenue/chains">
						App Revenue
					</BasicLink>{' '}
					represents the sum of Revenue on all protocols on a chain (excluding stablecoins and liquid staking
					protocols). App Revenue is a measure of economic activity on a chain and can be used to evaluate how active an
					ecosystem is.
				</p>
			</div>
		</Layout>
	)
}
