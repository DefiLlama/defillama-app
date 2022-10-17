import { useEffect, useState } from 'react'
import { ProtocolsChainsSearch } from '~/components/Search'
import { capitalizeFirstLetter } from '~/utils'
import ReactSelect from '../MultiSelect/ReactSelect'
import { chainToCoingeckoId } from './chainToCoingeckoId'
import { getAllChains, listRoutes } from './router'

/*
- paraswap
- 0x
- 1inch
- cowswap
- kyberswap
- firebird (https://docs.firebird.finance/developer/api-specification)
- https://openocean.finance/

- yieldyak
- https://twitter.com/UniDexFinance
- wardenswap
- https://twitter.com/odosprotocol
- https://twitter.com/RangoExchange
- thorswap
- airswap
- https://defi.krystal.app/
- https://app.unidex.exchange/trading
- https://rubic.exchange/
- https://bebop.xyz/
- https://twitter.com/tfm_com
- lifi
- https://twitter.com/ChainHopDEX

no api:
- https://twitter.com/HeraAggregator (no api)
- slingshot (no api)
- orion protocol
- autofarm.network/swap/
- https://swapr.eth.limo/#/swap?chainId=1
*/

export async function getTokenList() {
	const tokenlist = await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=true").then(r=>r.json())
	return {
		props: {
      tokenlist: tokenlist.filter(t=>t.platforms.ethereum && t.platforms.ethereum !== "")
    },
		revalidate: 5*60, // 5 minutes
	}
}

function WalletSelector(){
  return <></>
}


export function AggregatorContainer(props) {
	const chains = getAllChains()
	const [selectedChain, setSelectedChain] = useState("ethereum")
	const [fromToken, setFromToken] = useState(null)
	const [toToken, setToToken] = useState(null)
	const [amount, setAmount] = useState("100000000000000000000") // 100 tokens
	const [routes, setRoutes] = useState(null)
	useEffect(()=>{
		if(fromToken && toToken && amount){
			listRoutes(selectedChain, fromToken.value, toToken.value, amount).then(setRoutes)
		}
	}, [fromToken, toToken, amount, selectedChain])

	const geckoChainId = chainToCoingeckoId[selectedChain]
	const tokensInChain = props.tokenlist.filter(token=>token.platforms[geckoChainId] !== undefined).map(t=>({
		label: t.symbol.toUpperCase(),
		value: t.platforms[geckoChainId]
	})).slice(100, 200) // slicing it otherwise it lags
	return (
		<>
			<ProtocolsChainsSearch /> {/*Allow users to search stuff like "AVAX-DAI"*/ }
			Chain:
      <ReactSelect
				options={chains.map(c=>({ value: c, label: capitalizeFirstLetter(c) }))}
				value={selectedChain}
				onChange={setSelectedChain}
      />
      <WalletSelector />
			From:
			<ReactSelect
				options={tokensInChain}
				value={fromToken}
				onChange={setFromToken}
      />
			To:
			<ReactSelect
				options={tokensInChain}
				value={toToken}
				onChange={setToToken}
      />
			{routes !== null && <>
			Routes:
			<ul>{routes.map(r=><li key={r.name}>{JSON.stringify(r)}</li>)}</ul>
			</>}
		</>
	)
}