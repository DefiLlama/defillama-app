import { useEffect, useState } from 'react'
import { useAccount, useBalance, useFeeData, useSigner } from 'wagmi'
import { FixedSizeList as List } from 'react-window'
import { capitalizeFirstLetter } from '~/utils'
import ReactSelect from '../MultiSelect/ReactSelect'
import { getAllChains, listRoutes, swap } from './router'
import styled from 'styled-components'
import { createFilter } from 'react-select'
import { TYPE } from '~/Theme'
import Input from './TokenInput'
import { CrossIcon, GasIcon } from './Icons'
import Loader from './Loader'
import Search from './Search'
import { Button } from '~/layout/ProtocolAndPool'
import { ButtonDark } from '../ButtonStyled'
import { useTokenApprove } from './hooks'

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

- rook
- https://rubic.exchange/ - aggregates aggregators
- https://twitter.com/RangoExchange - api key requested, bridge aggregator, aggregates aggregators on same chain
- thorswap - aggregates aggregators that we already have
- lifi
- https://twitter.com/ChainHopDEX - only has 1inch
- https://twitter.com/MayanFinance

no api:
- https://twitter.com/HeraAggregator (no api)
- slingshot (no api)
- orion protocol
- autofarm.network/swap/
- https://swapr.eth.limo/#/swap?chainId=1 - aggregates aggregators + swapr

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

const Body = styled.div<{ showRoutes: boolean }>`
	display: grid;
	grid-row-gap: 16px;
	margin: 0 auto;
	transform: translateX(180px);
	padding-bottom: 4px;

	min-width: 30rem;
	max-width: 46rem;

	box-shadow: ${({ theme }) =>
		theme.mode === 'dark'
			? '10px 0px 50px 10px rgba(26, 26, 26, 0.9);'
			: '10px 0px 50px 10px rgba(211, 211, 211, 0.9);;'};
	padding: 16px;
	border-radius: 16px;
	text-align: left;
	transition: all 0.66s ease-out;
	animation: ${(props) =>
		props.showRoutes === true ? 'slide-left 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both' : 'none'};

	@keyframes slide-left {
		0% {
			transform: translateX(180px);
		}
		100% {
			transform: translateX(0);
		}
	}
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
				<img src={rest.logoURI} style={{ width: 20, height: 20, marginRight: 8, borderRadius: '50%' }} />
			</div>
			<div>{label}</div>
		</div>
	)
}

const height = 35

interface Route {
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
	setRoute: () => void
}

const RouteWrapper = styled.div`
	display: grid;
	grid-row-gap: 8px;
	margin-top: 16px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? ' #2d3039;' : ' #dde3f3;')};
	border: ${({ theme }) => (theme.mode === 'dark' ? '1px solid #373944;' : '1px solid #c6cae0;')};
	padding: 8px;
	border-radius: 8px;

	animation: swing-in-left-fwd 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
	@keyframes swing-in-left-fwd {
		0% {
			transform: rotateX(100deg);
			transform-origin: left;
			opacity: 0;
		}
		100% {
			transform: rotateX(0);
			transform-origin: left;
			opacity: 1;
		}
	}
`

const RouteRow = styled.div`
	display: flex;
`

const Route = ({ name, price, toToken, toTokenPrice, gasTokenPrice, gasPrice, setRoute }: Route) => {
	if (!price.amountReturned) return null

	const amount = +price.amountReturned / 10 ** +toToken?.decimals
	const amountUsd = (amount * toTokenPrice).toFixed(2)
	const gasUsd = (gasTokenPrice * +price?.estimatedGas * +gasPrice) / 1e18

	return (
		<RouteWrapper onClick={setRoute}>
			<RouteRow>
				<img src={toToken.logoURI} style={{ width: 24, height: 24, marginRight: 8, borderRadius: '50%' }} />
				<TYPE.heading>
					{amount.toFixed(3)} {amountUsd ? `($${amountUsd})` : null}
				</TYPE.heading>
				<div style={{ marginLeft: 'auto', display: 'flex' }}>
					<GasIcon /> <div style={{ marginLeft: 8 }}>${gasUsd.toFixed(3)}</div>
				</div>
			</RouteRow>

			<RouteRow>
				{toToken.symbol} • {name}
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

const Routes = styled.div<{ show: boolean; isFirstRender: boolean }>`
	padding: 16px;
	border-radius: 16px;
	text-align: left;
	overflow-y: scroll;
	min-width: 360px;
	max-height: 416px;

	box-shadow: ${({ theme }) =>
		theme.mode === 'dark'
			? '10px 0px 50px 10px rgba(26, 26, 26, 0.9);'
			: '10px 0px 50px 10px rgba(211, 211, 211, 0.9);'};
	animation: ${(props) =>
		props.show === true
			? 'tilt-in-fwd-in 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;'
			: props.isFirstRender
			? 'tilt-in-fwd-out 0.001s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both;'
			: 'tilt-in-fwd-out 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both;'};

	@keyframes tilt-in-fwd-in {
		0% {
			transform: rotateY(-20deg) rotateX(35deg) translate(-300px, -300px) skew(35deg, -10deg);
			opacity: 0;
		}
		100% {
			transform: rotateY(0) rotateX(0deg) translate(0, 0) skew(0deg, 0deg);
			opacity: 1;
		}
	}

	@keyframes tilt-in-fwd-out {
		0% {
			transform: rotateY(-20deg) rotateX(35deg) translate(-1000px, -1000px) skew(35deg, -10deg);
			opacity: 0;
		}
		100% {
			transform: rotateY(0) rotateX(0deg) translate(0, 0) skew(0deg, 0deg);
			opacity: 1;
		}
	}
`
const BodyWrapper = styled.div`
	display: flex;
	gap: 16px;
`

export const CloseBtn = ({ onClick }) => {
	return (
		<Close onClick={onClick}>
			<CrossIcon />
		</Close>
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

const FormHeader = styled.div`
	font-weight: bold;
	font-size: 16px;
	margin-bottom: 4px;
	padding-left: 4px;
`

const Close = styled.span`
	position: absolute;
	right: 16px;
	cursor: pointer;
`

const SwapBtn = styled.button`
	display: flex;
	text-align: center;
	border-radius: 16px;
	color: white;
	background-color: black;
	height: 48px;
	width: 100%;
`

export function AggregatorContainer({ tokenlist }) {
	const chains = getAllChains()
	const { data: signer } = useSigner()
	const [selectedChain, setSelectedChain] = useState({ value: 'ethereum', label: 'Ethereum' })
	const [fromToken, setFromToken] = useState(null)
	const [toToken, setToToken] = useState(null)
	const [gasTokenPrice, setGasTokenPrice] = useState(0)
	const [toTokenPrice, setToTokenPrice] = useState(0)
	const [amount, setAmount] = useState('10') // 100 tokens
	const { address } = useAccount()
	const balance = useBalance({
		addressOrName: address,
		token: fromToken?.address
	})

	const [isLoading, setLoading] = useState(false)

	const [renderNumber, setRenderNumber] = useState(1)

	const { data: gasPriceData } = useFeeData({ chainId: chainsMap[selectedChain.value] })

	const setTokens = (tokens) => {
		setFromToken(tokens.token0)
		setToToken(tokens.token1)
	}

	const [route, setRoute] = useState(null)
	const [routes, setRoutes] = useState(null)

	const handleSwap = () => {
		swap({
			chain: selectedChain.value,
			from: fromToken.value,
			to: toToken.value,
			amount: String(+amount * 10 ** fromToken.decimals),
			signer,
			slippage: 1,
			adapter: route.name,
			rawQuote: route?.price?.rawQuote
		})
	}

	useEffect(() => {
		if (fromToken && toToken && amount) {
			setRoutes(null)
			setLoading(true)
			setRenderNumber((num) => num + 1)
			listRoutes(selectedChain.value, fromToken.value, toToken.value, String(+amount * 10 ** fromToken.decimals))
				.then(setRoutes)
				.finally(() => setLoading(false))
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

	const cleanState = () => {
		setRenderNumber(0)
		setFromToken(null)
		setToToken(null)
		setRoutes(null)
	}
	const { isApproved, approve } = useTokenApprove(fromToken?.address, route?.price?.tokenApprovalAddress)

	const onMaxClick = () => {
		if (balance?.data?.formatted) setAmount(balance?.data?.formatted)
	}

	const onChainChange = (newChain) => {
		cleanState()
		setSelectedChain(newChain)
	}

	const tokensInChain = tokenlist.filter(({ chainId }) => chainId === chainsMap[selectedChain.value])
	const normalizedRoutes = [...(routes || [])]
		?.map((route) => {
			const gasUsd = (gasTokenPrice * +route.price.estimatedGas * +gasPriceData?.formatted?.gasPrice) / 1e18
			const amount = +route.price.amountReturned / 10 ** +toToken?.decimals
			const amountUsd = (amount * toTokenPrice).toFixed(2)
			return { route, gasUsd, amountUsd, ...route }
		})
		.sort((a, b) => +b.amountUsd - b.gasUsd - (+a.amountUsd - a.gasUsd))

	return (
		<Wrapper>
			<TYPE.largeHeader>Meta-Aggregator</TYPE.largeHeader>

			<BodyWrapper>
				<Body showRoutes={!!routes?.length || isLoading}>
					<Search tokens={tokensInChain} setTokens={setTokens} onClick={() => setRoutes(null)} />
					<div>
						<FormHeader>Chain</FormHeader>
						<ReactSelect
							options={chains.map((c) => ({ value: c, label: capitalizeFirstLetter(c) }))}
							value={selectedChain}
							onChange={onChainChange}
							components={{ MenuList }}
						/>
					</div>
					<div>
						<FormHeader>From</FormHeader>
						<ReactSelect
							options={tokensInChain}
							value={fromToken}
							onChange={setFromToken}
							formatOptionLabel={formatOptionLabel}
							components={{ MenuList }}
							filterOption={createFilter({ ignoreAccents: false })}
						/>
					</div>
					<div>
						<FormHeader>To</FormHeader>
						<ReactSelect
							options={tokensInChain}
							value={toToken}
							onChange={setToToken}
							formatOptionLabel={formatOptionLabel}
							components={{ MenuList }}
							filterOption={createFilter({ ignoreAccents: false })}
						/>
					</div>
					<div>
						<FormHeader>Amount In</FormHeader>
						<Input setAmount={setAmount} amount={amount} onMaxClick={onMaxClick} />
					</div>
					<ButtonDark
						onClick={() => {
							if (approve) approve()
							if (isApproved) handleSwap()
						}}
					>
						{isApproved ? 'Swap' : 'Approve'}
					</ButtonDark>
				</Body>
				<Routes show={!!routes?.length || isLoading} isFirstRender={renderNumber === 1}>
					<FormHeader>
						Routes
						<CloseBtn onClick={cleanState} />{' '}
					</FormHeader>
					{!routes?.length ? <Loader loaded={!isLoading} /> : null}
					{renderNumber !== 0
						? normalizedRoutes.map((r, i) => (
								<Route
									{...r}
									setRoute={() => setRoute(r.route)}
									toToken={toToken}
									selectedChain={selectedChain.label}
									gasTokenPrice={gasTokenPrice}
									toTokenPrice={toTokenPrice}
									gasPrice={gasPriceData?.formatted?.gasPrice}
									key={i}
								/>
						  ))
						: null}
				</Routes>
			</BodyWrapper>
		</Wrapper>
	)
}
