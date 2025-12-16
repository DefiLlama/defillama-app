import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import Layout from '~/layout'

const Definition = ({ header, id, children }: { header: string; id: string; children: React.ReactNode }) => {
	return (
		<section aria-labelledby={`${id}-title`} id={id} className="flex flex-col gap-4 rounded-md bg-(--cards-bg) p-3">
			<h2 className="group relative flex items-center gap-1 text-lg font-semibold" id={`${id}-title`}>
				{header}
				<a
					aria-hidden="true"
					tabIndex={-1}
					href={`#${id}`}
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			<hr className="border-black/20 dark:border-white/20" />
			{children}
		</section>
	)
}

export default function DataDefinitions() {
	return (
		<Layout
			title="DeFi Data Definitions (TVL, Fees, Revenue, DEX Volume) - DefiLlama"
			description={`Glossary of DeFi metrics: TVL, Fees, Revenue, FDV, DEX Volume, Stablecoin Market Cap, Treasuries and more.`}
			keywords={`data definitions DefiLlama, DeFi data definitions, TVL definition, crypto data definitions`}
			canonicalUrl={`/data-definitions`}
		>
			<h1 className="rounded-md bg-(--cards-bg) p-3 text-xl font-semibold">Data Definitions</h1>

			<Definition header="TVL" id="tvl">
				<p>For protocols: Value of all coins held in smart contracts of the protocol</p>
				<p>For chains: Sum of TVL of the protocols in that chain</p>
				<p>
					In traditional finance terms, TVL is similar to Assets Under Management (AUM). It represents the total value
					of assets that users deposit into a protocol. This is similar to how a fund or bank might report the total
					value of client deposits or managed assets.
				</p>
			</Definition>

			<Definition header="Fees" id="fees">
				<p>Total fees paid by users when using the protocol.</p>
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/fees">
						Fees
					</BasicLink>{' '}
					are equivalent to what would traditionally be considered Revenue in most off-chain businesses. They reflect
					the total amount paid by users for using the service, regardless of where those fees end up. This is the
					top-line number that shows how much the protocol is facilitating in economic activity.
				</p>
			</Definition>

			<Definition header="Revenue" id="revenue">
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
			</Definition>

			<Definition header="Holders Revenue" id="holders-revenue">
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
			</Definition>

			<Definition header="USD Inflows" id="usd-inflows">
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
			</Definition>

			<Definition header="Total Staked (Staked)" id="total-staked">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/total-staked">
						Staked
					</BasicLink>{' '}
					represents the value of governance coins that are staked in the protocol's staking system.
				</p>
			</Definition>

			<Definition header="Expenses" id="expenses">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/expenses">
						Expenses
					</BasicLink>{' '}
					here represent operational costs for salaries, audits... throughout the year. We collect this data mainly from
					annual protocol reports on their forums, so it's always referencing old data and will not be up-to-date in
					realtime like other DefiLlama data.
				</p>
			</Definition>

			<Definition header="Total Raised" id="total-raised">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/raises">
						Total Raised
					</BasicLink>{' '}
					includes the sum of all money raised by the protocol, including VC funding rounds, public sales and ICOs.
				</p>
			</Definition>

			<Definition header="Active Addresses" id="active-addresses">
				<p>
					Number of unique addresses that have interacted with the protocol directly. Interactions are counted as
					transactions sent directly against the protocol, thus transactions that go through an aggregator or some other
					middleman contract are not counted here.
				</p>
				<p>
					The reasoning for this is that this is meant to help measure stickiness/loyalty of users, and users that are
					interacting with the protocol through another product aren't likely to be sticky.
				</p>
			</Definition>

			<Definition header="Treasury" id="treasury">
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
			</Definition>

			<Definition header="Token Volume" id="token-volume">
				<p>Sum of value in all swaps to or from that token across all Centralized and Decentralized exchanges.</p>
				<p>Data for this metric is imported directly from CoinGecko.</p>
			</Definition>

			<Definition header="Token Liquidity" id="token-liquidity">
				<p>
					Sum of value locked in DEX pools that include that token across all DEXs for which DefiLlama tracks pool data.
				</p>
			</Definition>

			<Definition header="Fully Diluted Valuation (FDV)" id="fully-diluted-valuation">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/fdv">
						Fully Diluted Valuation
					</BasicLink>{' '}
					is calculated by taking the expected maximum supply of the token and multiplying it by the price. It's mainly
					used to calculate the hypothetical marketcap of the token if all the tokens were unlocked and circulating.
				</p>
				<p>Data for this metric is imported directly from CoinGecko.</p>
			</Definition>

			<Definition header="Outstanding Fully Diluted Valuation (oFDV)" id="outstanding-fdv">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/outstanding-fdv">
						Outstanding Fully Diluted Valuation
					</BasicLink>{' '}
					is calculated by multiplying the outstanding supply by the price. Outstanding supply is the total supply minus
					the supply that is not yet allocated to anything (e.g. coins in treasury or reserve). Outstanding FDV is
					intended to be a more accurate measurement of the market cap of coins that are already allocated.
				</p>
			</Definition>

			<Definition header="DEX Volume" id="dex-volume">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/dexs">
						Volume
					</BasicLink>{' '}
					traded on the DEX. This metric is only applicable to protocols that are exchanges, and it's just the sum of
					value of all trades that went through the DEX on a given day.
				</p>
			</Definition>

			<Definition header="Events" id="events">
				<p>
					This is a manually curated list of events that impacted the protocol. The reason why we display this is just
					to help the user understand the reason behind changes in the protocol metrics.
				</p>
				<p>
					Example: When there's a hack that causes a sudden drop in TVL we add an event at that date explaining that a
					hack was the reason why TVL dropped.
				</p>
			</Definition>

			<Definition header="Median APY" id="median-apy">
				<p>
					Median APY across DeFi pools tracked by DefiLlama on a given protocol. This is calculated by finding all pools
					for that protocol, then sorting them by APY and finding the median weighted by TVL.
				</p>
			</Definition>

			<Definition header="Total Borrowed (Borrowed)" id="total-borrowed">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/total-borrowed">
						Total funds borrowed
					</BasicLink>{' '}
					from DeFi lending protocols. Borrowed funds can also be thought of as total loans issued by a lending
					protocol. Borrowed is excluded from TVL by default to account for looping strategies which can artificially
					inflate TVL.
				</p>
			</Definition>

			<Definition header="Stablecoins Market Cap" id="stablecoins-market-cap">
				<p>The total market cap of all stablecoins on a chain.</p>
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/stablecoins/chains">
						Stablecoin market cap
					</BasicLink>{' '}
					represents the total value of stablecoins on a chain, a proxy measure for liquidity and trust, as well as a
					measure of stablecoin adoption. This metric is only available for chains.
				</p>
			</Definition>

			<Definition header="App Fees" id="app-fees">
				<p>
					App Fees represents the sum of Fees on all protocols on a chain (excluding stablecoins, liquid staking apps
					and gas fees). App Fees is a measure of economic activity on a chain and can be used to evaluate how active an
					ecosystem is.
				</p>
			</Definition>

			<Definition header="App Revenue" id="app-revenue">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/app-revenue/chains">
						App Revenue
					</BasicLink>{' '}
					represents the sum of Revenue on all protocols on a chain (excluding stablecoins, liquid staking apps and gas
					fees). App Revenue is a measure of economic activity on a chain and can be used to evaluate how active an
					ecosystem is.
				</p>
			</Definition>

			<Definition header="REV" id="rev">
				<p>
					<BasicLink className="text-(--blue) hover:underline" href="/rev/chains">
						REV
					</BasicLink>{' '}
					(Real Economic Value) is the sum of chain fees and MEV tips.
				</p>
			</Definition>

			<Definition header="Token Incentives" id="token-incentives">
				<p>
					Tokens allocated to users through liquidity mining or incentive schemes, typically as part of governance or
					reward mechanisms.
				</p>
			</Definition>
		</Layout>
	)
}
