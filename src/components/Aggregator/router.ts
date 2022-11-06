import * as matcha from './adapters/0x'
import * as inch from './adapters/1inch'
import * as cowswap from './adapters/cowswap'
import * as firebird from './adapters/firebird'
import * as kyberswap from './adapters/kyberswap'
import * as openocean from './adapters/openocean'
import * as paraswap from './adapters/paraswap'
// import * as unidex from "./adapters/unidex" - disabled, their api is broken
// import * as airswap from './adapters/airswap' cors
// import * as odos from './adapters/odos' cors
import * as yieldyak from './adapters/yieldyak'
// import * as krystal from './adapters/krystal'

const adapters = [matcha, inch, cowswap, firebird, kyberswap, openocean, paraswap, yieldyak]
const adaptersMap = adapters.reduce((acc, adapter) => ({ ...acc, [adapter.name]: adapter }), {}) as Record<
	string,
	typeof inch
>

export function getAllChains() {
	const chains = new Set<string>()
	for (const adapter of adapters) {
		Object.keys(adapter.chainToId).forEach((chain) => chains.add(chain))
	}
	return Array.from(chains)
}

export function listRoutes(chain: string, from: string, to: string, amount: string, extra) {
	return Promise.all(
		adapters
			.filter((adap) => adap.chainToId[chain] !== undefined)
			.map(async (adapter) => {
				let price = 'failure' as any
				try {
					price = await adapter.getQuote(chain, from, to, amount, {
						...extra
					})
				} catch (e) {
					console.error(e)
				}
				return {
					price,
					name: adapter.name
				}
			})
	)
}

export async function swap({ chain, from, to, amount, signer, slippage = 1, adapter, rawQuote }) {
	const aggregator = adaptersMap[adapter]

	const res = await aggregator.swap({ chain, from, to, amount, signer, slippage, rawQuote })

	return res
}
