import { BaseSearch } from '~/components/Search/BaseSearch'
import type { IBaseSearchProps, ICommonSearchProps } from '~/components/Search/BaseSearch'

interface ILiquidationsSearchProps extends ICommonSearchProps {}

export default function LiquidationsSearch(props: ILiquidationsSearchProps) {
	// TODO: make api to aggregate a list of all tracked liquidable coins dynamically
	const loading = false
	const searchData: IBaseSearchProps['data'] = [
		{
			logo: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
			route: '/liquidations/eth',
			name: 'Ethereum (ETH)'
		},
		{
			logo: 'https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png',
			route: '/liquidations/wbtc',
			name: 'Wrapped Bitcoin (WBTC)'
		},
		{
			logo: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
			route: '/liquidations/usdc',
			name: 'USD Coin (USDC)'
		},
		{
			logo: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png',
			route: '/liquidations/dai',
			name: 'Dai (DAI)'
		},
		{
			logo: 'https://assets.coingecko.com/coins/images/11849/thumb/yfi-192x192.png',
			route: '/liquidations/yfi',
			name: 'yearn.finance (YFI)'
		},
		{
			logo: 'https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png',
			route: '/liquidations/uni',
			name: 'Uniswap (UNI)'
		}
	]

	return <BaseSearch {...props} data={searchData} loading={loading} />
}
