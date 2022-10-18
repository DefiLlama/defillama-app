import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useFeeData } from 'wagmi'
import { FixedSizeList as List } from 'react-window'
import { ProtocolsChainsSearch } from '~/components/Search'
import { capitalizeFirstLetter } from '~/utils'
import ReactSelect from '../MultiSelect/ReactSelect'
import { chainToCoingeckoId } from './chainToCoingeckoId'
import { getAllChains, listRoutes } from './router'
import styled from 'styled-components'
import { createFilter } from 'react-select'
import { TYPE } from '~/Theme'

/*
Integrated:
- paraswap
- 0x
- 1inch
- cowswap
- kyberswap
- firebird (https://docs.firebird.finance/developer/api-specification)
- https://openocean.finance/
- airswap
- https://app.unidex.exchange/trading
- https://twitter.com/odosprotocol
- yieldyak
- https://defi.krystal.app/

- https://twitter.com/RangoExchange - api key requested
- thorswap
- https://rubic.exchange/
- lifi
- https://twitter.com/ChainHopDEX - only has 1inch
- https://twitter.com/MayanFinance

no api:
- https://twitter.com/HeraAggregator (no api)
- slingshot (no api)
- orion protocol
- autofarm.network/swap/
- https://swapr.eth.limo/#/swap?chainId=1

non evm:
- jupiter (solana)
- openocean (solana)
- https://twitter.com/prism_ag (solana)
- coinhall (terra)
- https://twitter.com/tfm_com (terra)

cant integrate:
- https://twitter.com/UniDexFinance - api broken (seems abandoned)
- https://bebop.xyz/ - not live
- VaporDex - not live
- https://twitter.com/hippolabs__ - not live
- dexguru - no api
- https://wowmax.exchange/alpha/ - still beta + no api
- https://twitter.com/RBXtoken - doesnt work
- https://www.bungee.exchange/ - couldnt use it
- wardenswap - no api + sdk is closed source
- https://twitter.com/DexibleApp - not an aggregator, only supports exotic orders like TWAP, segmented order, stop loss...
*/

const Connect = styled.div`
	display: flex;
	width: 100%;
	& div {
		width: 100%;
		justify-content: center;
		display: table-cell;
		vertical-align: middle;
	}
	& button {
		text-align: center;
		display: table-cell;
		vertical-align: middle;
	}
`

const Body = styled.div`
	display: grid;
	grid-row-gap: 16px;
	margin: 0 auto;
	min-width: 30rem;
	max-width: 46rem;

	box-shadow: 10px 0px 50px 10px rgba(26, 26, 26, 0.9);
	padding: 16px;
	border-radius: 16px;
	text-align: left;
`

const Wrapper = styled.div`
	text-align: center;
	display: grid;
	grid-row-gap: 36px;
	margin: 0 auto;
	margin-top: 10px;
`

const chainsMap = {
	ethereum: 1,
	bsc: 56,
	polygon: 137,
	optimism: 10,
	arbitrum: 42161,
	avax: 43114,
	gnosis: 100,
	fantom: 250,
	klaytn: 8217,
	aurora: 1313161554
}

const formatOptionLabel = ({ label, ...rest }) => {
	return (
		<div style={{ display: 'flex' }}>
			<div style={{ marginLeft: '10px', color: '#ccc' }}>
				<img src={rest.logoURI} style={{ width: 20, height: 20, marginRight: 8 }} />
			</div>
			<div>{label}</div>
		</div>
	)
}

const height = 35

interface RouteProps {
	name: string
	price: {
		amountReturned: string
		estimatedGas: string
		tokenApprovalAddress: string
	}
	toToken: { address: string; logoURI: string; symbol: string; decimals: string }
	selectedChain: string
	gasTokenPrice: number
	toTokenPrice: number
	gasPrice: string
}

const RouteWrapper = styled.div`
	display: grid;
	grid-row-gap: 8px;
	margin-top: 16px;
	background-color: #2d3039;
	border: 1px solid #373944;
	padding: 8px;
	border-radius: 8px;
`

const RouteRow = styled.div`
	display: flex;
`

const GasIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		data-prefix="far"
		data-icon="gas-pump"
		role="img"
		viewBox="0 0 512 512"
		width={16}
		height={16}
	>
		<path
			fill="currentColor"
			d="M493.3 107.3l-86.6-86.6c-3.1-3.1-8.2-3.1-11.3 0l-22.6 22.6c-3.1 3.1-3.1 8.2 0 11.3L416 97.9V160c0 28.1 20.9 51.3 48 55.2V376c0 13.2-10.8 24-24 24s-24-10.8-24-24v-32c0-48.6-39.4-88-88-88h-8V48c0-26.5-21.5-48-48-48H80C53.5 0 32 21.5 32 48v416H8c-4.4 0-8 3.6-8 8v32c0 4.4 3.6 8 8 8h336c4.4 0 8-3.6 8-8v-32c0-4.4-3.6-8-8-8h-24V304h8c22.1 0 40 17.9 40 40v27.8c0 37.7 27 72 64.5 75.9 43 4.3 79.5-29.5 79.5-71.7V152.6c0-17-6.7-33.3-18.7-45.3zM272 464H80V240h192v224zm0-272H80V48h192v144z"
		/>
	</svg>
)

const Route = ({ name, price, toToken, selectedChain, toTokenPrice, gasTokenPrice, gasPrice }: RouteProps) => {
	const amount = +price.amountReturned / 10 ** +toToken.decimals
	const amountUsd = (amount * toTokenPrice).toFixed(2)
	const gasUsd = (gasTokenPrice * +price.estimatedGas * +gasPrice) / 1e18
	if (!price.amountReturned) return null

	return (
		<RouteWrapper>
			<RouteRow>
				<img src={toToken.logoURI} style={{ width: 24, height: 24, marginRight: 8 }} />
				<TYPE.heading>
					{amount.toFixed(3)} (${amountUsd})
				</TYPE.heading>
				<div style={{ marginLeft: 'auto', display: 'flex' }}>
					<GasIcon /> <div style={{ marginLeft: 8 }}>${gasUsd.toFixed(3)}</div>
				</div>
			</RouteRow>

			<RouteRow>
				{toToken.symbol} on {selectedChain} • {name}
			</RouteRow>
		</RouteWrapper>
	)
}

const MenuList = (props) => {
	const { options, children, maxHeight, getValue } = props
	const [value] = getValue()
	const initialOffset = options.indexOf(value) * height

	if (!children.length) return null

	return (
		<List height={maxHeight} itemCount={children.length} itemSize={height} initialScrollOffset={initialOffset}>
			{({ index, style }) => <div style={style}>{children[index]}</div>}
		</List>
	)
}

export async function getTokenList() {
	const uniList = await fetch('https://tokens.uniswap.org/').then((r) => r.json())
	const sushiList = await fetch('https://token-list.sushi.com/').then((r) => r.json())
	const oneInch = await Promise.all(
		Object.values(chainsMap).map(async (chainId) =>
			fetch(`https://tokens.1inch.io/v1.1/${chainId}`).then((r) => r.json())
		)
	)

	const oneInchList = Object.values(chainsMap)
		.map((chainId, i) => Object.values(oneInch[i]).map((token: { address: string }) => ({ ...token, chainId })))
		.flat()

	const oneInchMap = oneInchList.reduce((acc, token) => ({ ...acc, [token.address.toLowerCase()]: true }), {})
	const sushiMap = uniList.tokens.reduce((acc, token) => ({ ...acc, [token.address.toLowerCase()]: true }), {})
	const uniMap = uniList.tokens.reduce((acc, token) => ({ ...acc, [token.address.toLowerCase()]: true }), {})

	const tokenlist = uniList.tokens
		.concat(sushiList.tokens.filter((token) => !uniMap[token.address.toLowerCase()]))
		.concat(
			oneInchList.filter((token) => !uniMap[token.address.toLowerCase()] && !sushiMap[token.address.toLowerCase()])
		)

	return {
		props: {
			tokenlist: tokenlist.map((token) => ({ ...token, value: token.address, label: token.name }))
		},
		revalidate: 5 * 60 // 5 minutes
	}
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function AggregatorContainer({ tokenlist }) {
	const chains = getAllChains()
	const [selectedChain, setSelectedChain] = useState({ value: 'ethereum', label: 'Ethereum' })
	const [fromToken, setFromToken] = useState(null)
	const [toToken, setToToken] = useState(null)
	const [gasTokenPrice, setGasTokenPrice] = useState(0)
	const [toTokenPrice, setToTokenPrice] = useState(0)
	const [amount, setAmount] = useState('100000000000000000000') // 100 tokens

	const { data: gasPriceData } = useFeeData({ chainId: chainsMap[selectedChain.value] })

	const [routes, setRoutes] = useState(null)
	useEffect(() => {
		if (fromToken && toToken && amount) {
			listRoutes(selectedChain.value, fromToken.value, toToken.value, amount).then(setRoutes)
		}
	}, [fromToken, toToken, amount, selectedChain])

	useEffect(() => {
		if (toToken)
			fetch(
				`https://coins.llama.fi/prices/current/${selectedChain.value}:${toToken.address},${selectedChain.value}:${ZERO_ADDRESS}`
			)
				.then((r) => r.json())
				.then(({ coins }) => {
					setGasTokenPrice(coins[`${selectedChain.value}:${ZERO_ADDRESS}`]?.price)
					setToTokenPrice(coins[`${selectedChain.value}:${toToken.address}`]?.price)
				})
	}, [toToken, selectedChain])

	const tokensInChain = tokenlist.filter(({ chainId }) => chainId === chainsMap[selectedChain.value])

	return (
		<Wrapper>
			<TYPE.largeHeader>Meta-Aggregator</TYPE.largeHeader>
			<Body>
				<ProtocolsChainsSearch /> {/*Allow users to search stuff like "AVAX-DAI"*/}
				Chain:
				<ReactSelect
					options={chains.map((c) => ({ value: c, label: capitalizeFirstLetter(c) }))}
					value={selectedChain}
					onChange={setSelectedChain}
					components={{ MenuList }}
				/>
				From:
				<ReactSelect
					options={tokensInChain}
					value={fromToken}
					onChange={setFromToken}
					formatOptionLabel={formatOptionLabel}
					components={{ MenuList }}
					filterOption={createFilter({ ignoreAccents: false })}
				/>
				To:
				<ReactSelect
					options={tokensInChain}
					value={toToken}
					onChange={setToToken}
					formatOptionLabel={formatOptionLabel}
					components={{ MenuList }}
					filterOption={createFilter({ ignoreAccents: false })}
				/>
				{routes !== null && (
					<div>
						Routes:
						{[...routes]
							.sort((a, b) => b.price.amountReturned - a.price.amountReturned)
							.map((r, i) => (
								<Route
									{...r}
									toToken={toToken}
									selectedChain={selectedChain.label}
									gasTokenPrice={gasTokenPrice}
									toTokenPrice={toTokenPrice}
									gasPrice={gasPriceData?.formatted?.gasPrice}
									key={i}
								/>
							))}
					</div>
				)}
				<Connect>
					<ConnectButton />
				</Connect>
			</Body>
		</Wrapper>
	)
}
