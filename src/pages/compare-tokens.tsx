import Layout from '~/layout'
import { QueryClient, QueryClientProvider } from 'react-query'
import { withPerformanceLogging } from '~/utils/perf'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import CompareTokens from '~/components/CompareTokens'
import { getProtocols } from '~/api/categories/protocols'

const queryClient = new QueryClient()

export const getStaticProps = withPerformanceLogging('correlation', async () => {
	const [coinsData, tvlProtocols, feesProtocols, revenueProtocols, volumeProtocols] = await Promise.all([
		getAllCGTokensList(),
		getProtocols(),
		fetch(`https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch fees protocols list at path: compare-tokens`, 'Error:', err)
				return {}
			}),
		fetch(
			`https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true&dataType=dailyRevenue`
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(`Couldn't fetch revenue protocols list at path: compare-tokens`, 'Error:', err)
				return {}
			}),
		fetch(`https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
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
		<QueryClientProvider client={queryClient}>
			<Layout title={`Price with FDV of - DefiLlama`}>
				<CompareTokens {...props} />
			</Layout>
		</QueryClientProvider>
	)
}
