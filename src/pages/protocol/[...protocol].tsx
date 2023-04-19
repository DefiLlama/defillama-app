import ProtocolContainer from '~/containers/Defi/Protocol'
import { deriveColors, selectColor, standardizeProtocolName, tokenIconPaletteUrl } from '~/utils'
import { getColor } from '~/utils/getColor'
import { maxAgeForNext } from '~/api'
import {
	getProtocols,
	getProtocol,
	fuseProtocolData,
	getProtocolsRaw,
	getProtocolEmissons
} from '~/api/categories/protocols'
import { IProtocolResponse } from '~/api/types'
import { DummyProtocol } from '~/containers/Defi/Protocol/Dummy'
import { fetchArticles, IArticle } from '~/api/categories/news'
import { ACTIVE_USERS_API } from '~/constants'

export const getStaticProps = async ({
	params: {
		protocol: [protocol]
	}
}) => {
	const [protocolRes, articles, emissions]: [IProtocolResponse, IArticle[], any] = await Promise.all([
		getProtocol(protocol),
		fetchArticles({ tags: protocol }),
		getProtocolEmissons(protocol)
	])

	if (protocolRes?.chainTvls) {
		Object.keys(protocolRes.chainTvls).forEach((chain) => {
			delete protocolRes.chainTvls[chain].tokensInUsd
			delete protocolRes.chainTvls[chain].tokens
		})
	}

	const protocolData = fuseProtocolData(protocolRes)

	const [backgroundColor, allProtocols, activeUsers, tokenPrice, tokenMcap, fdvData, feesAndRevenueProtocols, dexs] =
		await Promise.all([
			getColor(tokenIconPaletteUrl(protocolData.name)),
			getProtocolsRaw(),
			fetch(ACTIVE_USERS_API).then((res) => res.json()),
			fetch('https://coins.llama.fi/prices', {
				method: 'POST',
				body: JSON.stringify({
					coins: [`coingecko:${protocolData.gecko_id}`]
				})
			})
				.then((r) => r.json())
				.catch((err) => {
					console.log(err)
					return {}
				}),
			fetch('https://coins.llama.fi/mcaps', {
				method: 'POST',
				body: JSON.stringify({
					coins: [`coingecko:${protocolData.gecko_id}`]
				})
			})
				.then((r) => r.json())
				.catch((err) => {
					console.log(err)
					return {}
				}),
			fetch(
				`https://api.coingecko.com/api/v3/coins/${protocolData.gecko_id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
			)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch fdv of protocol - ${protocol}`, 'Error:', err)
					return {}
				}),
			fetch(`https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch fees and revenue protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				}),
			fetch(`https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`)
				.then((res) => res.json())
				.catch((err) => {
					console.log(`Couldn't fetch dex protocols list at path: ${protocol}`, 'Error:', err)
					return {}
				})
		])

	const feesAndRevenueData = feesAndRevenueProtocols?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.name
	)

	const volumeData = dexs?.protocols?.filter(
		(p) => p.name === protocolData.name || p.parentProtocol === protocolData.name
	)

	const chartTypes = [
		'TVL',
		'Mcap',
		'Token Price',
		'FDV',
		'Fees',
		'Revenue',
		'Volume',
		'Unlocks',
		'Active Users',
		'Transactions',
		'Gas Used'
	]

	const colorTones = Object.fromEntries(chartTypes.map((type, index) => [type, selectColor(index, backgroundColor)]))

	const similarProtocols =
		allProtocols && protocolData.category
			? allProtocols.protocols
					.filter((p) => {
						if (p.category) {
							return (
								p.category.toLowerCase() === protocolData.category.toLowerCase() &&
								p.name.toLowerCase() !== protocolData.name?.toLowerCase()
							)
						} else return false
					})
					.map((p) => {
						let commonChains = 0

						protocolData?.chains?.forEach((chain) => {
							if (p.chains.includes(chain)) {
								commonChains += 1
							}
						})

						return { name: p.name, tvl: p.tvl, commonChains }
					})
					.sort((a, b) => b.tvl - a.tvl)
			: []

	const similarProtocolsSet = new Set<string>()

	const protocolsWithCommonChains = [...similarProtocols].sort((a, b) => b.commonChains - a.commonChains).slice(0, 5)

	// first 5 are the protocols that are on same chain + same category
	protocolsWithCommonChains.forEach((p) => similarProtocolsSet.add(p.name))

	// last 5 are the protocols in same category
	similarProtocols.forEach((p) => {
		if (similarProtocolsSet.size < 10) {
			similarProtocolsSet.add(p.name)
		}
	})

	return {
		props: {
			articles,
			protocol,
			protocolData,
			backgroundColor,
			similarProtocols: Array.from(similarProtocolsSet).map((protocolName) =>
				similarProtocols.find((p) => p.name === protocolName)
			),
			emissions,
			chartColors: colorTones,
			users: activeUsers[protocolData.id] || null,
			tokenPrice: tokenPrice?.coins?.[`coingecko:${protocolData.gecko_id}`]?.price ?? null,
			tokenMcap: tokenMcap?.[`coingecko:${protocolData.gecko_id}`]?.mcap ?? null,
			tokenSupply: fdvData?.['market_data']?.['total_supply'] ?? null,
			dailyRevenue: feesAndRevenueData?.reduce((acc, curr) => (acc += curr.dailyRevenue || 0), 0) ?? null,
			dailyFees: feesAndRevenueData?.reduce((acc, curr) => (acc += curr.dailyFees || 0), 0) ?? null,
			allTimeFees: feesAndRevenueData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null,
			dailyVolume: volumeData?.reduce((acc, curr) => (acc += curr.dailyVolume || 0), 0) ?? null,
			allTimeVolume: volumeData?.reduce((acc, curr) => (acc += curr.totalAllTime || 0), 0) ?? null,
			helperTexts: {
				fees:
					volumeData.length > 1
						? 'Sum of all fees from ' +
						  (feesAndRevenueData?.reduce((acc, curr) => (acc = [...acc, curr.name] || 0), []) ?? []).join(',')
						: volumeData?.[0]?.methodology?.['Fees'] ?? null,
				revenue:
					volumeData.length > 1
						? 'Sum of all revenue from ' +
						  (feesAndRevenueData?.reduce((acc, curr) => (acc = [...acc, curr.name] || 0), []) ?? []).join(',')
						: volumeData?.[0]?.methodology?.['Revenue'] ?? null,
				users:
					'This only counts users that interact with protocol directly (so not through another contract, such as a dex aggregator), and only on arbitrum, avax, bsc, ethereum, xdai, optimism, polygon.'
			}
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	const res = await getProtocols()

	const paths: string[] = res.protocols.slice(0, 30).map(({ name }) => ({
		params: { protocol: [standardizeProtocolName(name)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols({ protocolData, ...props }) {
	if (protocolData.module === 'dummy.js') {
		return (
			<DummyProtocol
				data={protocolData}
				title={`${protocolData.name} - DefiLlama`}
				backgroundColor={props.backgroundColor}
				protocol={props.protocol}
			/>
		)
	}
	return (
		<ProtocolContainer title={`${protocolData.name} - DefiLlama`} protocolData={protocolData} {...(props as any)} />
	)
}
