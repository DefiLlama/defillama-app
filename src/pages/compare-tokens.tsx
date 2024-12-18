import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import CompareTokens from '~/containers/CompareTokens'
import { getProtocols } from '~/api/categories/protocols'
import { DIMENISIONS_OVERVIEW_API } from '~/constants'
import { fetchWithErrorLogging } from '~/utils/async'

export const getStaticProps = withPerformanceLogging('compare-tokens', async () => {
	const [coinsData, tvlProtocols, feesProtocols, revenueProtocols, volumeProtocols] = await Promise.all([
		getAllCGTokensList(),
		getProtocols(),
		fetchWithErrorLogging(
			`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch fees protocols list at path: compare-tokens`, 'Error:', err)
				return {}
			}),
		fetchWithErrorLogging(
			`${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch revenue protocols list at path: compare-tokens`, 'Error:', err)
				return {}
			}),
		fetchWithErrorLogging(
			`${DIMENISIONS_OVERVIEW_API}/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch dex protocols list at path: compare-tokens`, 'Error:', err)
				return {}
			})
	])
	const parentProtocols = Object.fromEntries(
		tvlProtocols.parentProtocols.map((protocol) => [
			protocol.id,
			{ name: protocol.name, geckoId: protocol.gecko_id ?? null, tvl: null, fees: null, revenue: null }
		])
	)
	const llamaProtocols = tvlProtocols.protocols.map((protocol) => {
		const fees = feesProtocols.protocols.find((fp) => fp.defillamaId === protocol.defillamaId)?.total24h ?? null
		const revenue = revenueProtocols.protocols.find((fp) => fp.defillamaId === protocol.defillamaId)?.total24h ?? null
		if (protocol.parentProtocol && parentProtocols[protocol.parentProtocol]) {
			if (protocol.tvl) {
				parentProtocols[protocol.parentProtocol].tvl =
					(parentProtocols[protocol.parentProtocol].tvl ?? 0) + protocol.tvl
			}
			if (fees) {
				parentProtocols[protocol.parentProtocol].fees = (parentProtocols[protocol.parentProtocol].fees ?? 0) + fees
			}
			if (revenue) {
				parentProtocols[protocol.parentProtocol].revenue =
					(parentProtocols[protocol.parentProtocol].revenue ?? 0) + revenue
			}
		}
		return {
			name: protocol.name,
			mcap: protocol.mcap ?? null,
			tvl: protocol.tvl ?? null,
			geckoId: protocol.geckoId ?? null,
			fees,
			revenue
		}
	})
	return {
		props: {
			coinsData: coinsData.map((coin) => ({ ...coin, label: coin.symbol.toUpperCase(), value: coin.id })),
			protocols: [...Object.values(parentProtocols), ...llamaProtocols]
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Compare(props) {
	return (
		<Layout title={`Price with FDV of - DefiLlama`}>
			<CompareTokens {...props} />
		</Layout>
	)
}
