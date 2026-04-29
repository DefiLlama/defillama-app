import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import { createPublicClient, http, getAddress } from 'viem'
import { bsc } from 'viem/chains'
import { fetchCoinPrices } from '~/api'
import { Icon } from '~/components/Icon'
import { LocalLoader, LoadingSpinner } from '~/components/Loaders'
import { TokenLogo } from '~/components/TokenLogo'
import { usePortfolio } from '~/containers/Portfolio/PortfolioContext'
import { useIsClient } from '~/hooks/useIsClient'
import Layout from '~/layout'

type TokenBalance = {
	symbol: string
	name: string
	address: string
	balance: number
	balanceUsd: number
	chain: string
	chainId?: string
	price: number
	priceChange24h?: number
}

type PortfolioData = { address: string; tokens: TokenBalance[]; totalValueUsd: number; debug: string[] }

const TOKENS: Record<string, { address: string; decimals: number; symbol: string; name: string }[]> = {
	bsc: [
		{ address: '0x55d398326f99059ff775485246999027b3197955', decimals: 18, symbol: 'USDT', name: 'Tether USD' },
		{ address: '0x0E09FaBBF253eED7Ef4C9cA9CAa7Cb17E7b2F6A5', decimals: 18, symbol: 'CAKE', name: 'PancakeSwap Token' }
	]
}

const WORKING_RPCS: Record<string, string[]> = {
	bsc: ['https://bsc-dataseed1.defibit.io', 'https://bsc-rpc.publicnode.com']
}

const CHAIN_MAP = {
	bsc
}

const CHAIN_ID_MAP: Record<string, string> = {
	bsc: 'bsc'
}

const CHAIN_NATIVE: Record<string, { symbol: string; name: string }> = {
	bsc: { symbol: 'BNB', name: 'BNB' }
}

const TOKEN_NAME_MAP: Record<string, string> = {
	USDT: 'tether',
	CAKE: 'pancakeswap-token'
}

const PRICE_IDS = ['coingecko:binancecoin', 'coingecko:tether', 'coingecko:pancakeswap-token']

interface PriceData {
	price: number
	change?: number
}

async function fetchPrices(): Promise<Record<string, PriceData>> {
	const result: Record<string, PriceData> = {}
	try {
		const prices = await fetchCoinPrices(PRICE_IDS)
		for (const [id, priceData] of Object.entries(prices)) {
			const sym = id.replace('coingecko:', '')
			const nameMap: Record<string, string> = {
				binancecoin: 'BNB',
				tether: 'USDT',
				'pancakeswap-token': 'CAKE'
			}
			const mappedName = nameMap[sym]
			if (mappedName) {
				result[mappedName] = { price: priceData?.price || 0 }
			}
		}
	} catch (e) {
		console.log('[fetchPrices] Exception:', e)
	}
	return result
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
	let lastError: Error | null = null
	for (let i = 0; i < retries; i++) {
		try {
			return await fn()
		} catch (e) {
			lastError = e as Error
			if (i < retries - 1) await new Promise((r) => setTimeout(r, delay * 2 ** i))
		}
	}
	throw lastError ?? new Error('Unknown error')
}

async function fetchPortfolio(address: string): Promise<PortfolioData> {
	const tokens: TokenBalance[] = []
	let totalValue = 0
	const debug: string[] = []
	const normalizedAddress = getAddress(address)

	let prices: Record<string, PriceData> = {}
	try {
		prices = await fetchPrices()
	} catch (e) {
		debug.push(`Prices fetch failed: ${e}`)
	}
	debug.push(
		`Prices: ${Object.entries(prices)
			.map(([k, v]) => `${k}=$${v.price.toFixed(2)}`)
			.join(', ')}`
	)

	for (const [chainName, rpcList] of Object.entries(WORKING_RPCS)) {
		const chain = CHAIN_MAP[chainName as keyof typeof CHAIN_MAP]
		if (!chain) {
			debug.push(`${chainName} chain mapping missing`)
			continue
		}
		let chainLoaded = false

		for (const rpc of rpcList) {
			const client = createPublicClient({ chain, transport: http(rpc, { timeout: 10_000 }) })
			const rpcTokens: TokenBalance[] = []
			let rpcTotalValue = 0
			try {
				await client.getChainId()
				debug.push(`${chainName} RPC ${rpc} selected`)

				const nativeInfo = CHAIN_NATIVE[chainName]
				try {
					const balance = await fetchWithRetry(() => client.getBalance({ address: normalizedAddress }))
					const priceInfo = prices[nativeInfo.symbol] || { price: 0 }
					const balanceNum = Number(balance) / 1e18
					const balanceUsd = balanceNum * priceInfo.price
					debug.push(`${chainName} ${nativeInfo.symbol}: ${balanceNum.toFixed(6)} @ $${priceInfo.price}`)

					if (balanceNum > 0) {
						rpcTokens.push({
							symbol: nativeInfo.symbol,
							name: nativeInfo.name,
							address: '0x0',
							balance: balanceNum,
							balanceUsd,
							chain: chainName,
							chainId: CHAIN_ID_MAP[chainName] || chainName,
							price: priceInfo.price,
							priceChange24h: priceInfo.change
						})
						rpcTotalValue += balanceUsd
					}
				} catch (e) {
					throw new Error(`${chainName} native balance error: ${String(e)}`)
				}

				for (const token of TOKENS[chainName] || []) {
					const balance = await fetchWithRetry(async () => {
						const result = await (client as any).readContract({
							address: token.address as `0x${string}`,
							abi: [
								{
									constant: true,
									inputs: [{ name: '_owner', type: 'address' }],
									name: 'balanceOf',
									outputs: [{ name: '', type: 'uint256' }],
									type: 'function'
								}
							],
							functionName: 'balanceOf',
							args: [normalizedAddress]
						})
						return result
					})

					const balanceNum = Number(balance) / Math.pow(10, token.decimals)
					if (balanceNum > 0) {
						const priceInfo = prices[token.symbol] || { price: 0 }
						const balanceUsd = balanceNum * priceInfo.price
						debug.push(`${chainName} ${token.symbol}: ${balanceNum.toFixed(6)} @ $${priceInfo.price}`)

						rpcTokens.push({
							symbol: token.symbol,
							name: token.name,
							address: token.address,
							balance: balanceNum,
							balanceUsd,
							chain: chainName,
							chainId: TOKEN_NAME_MAP[token.symbol],
							price: priceInfo.price,
							priceChange24h: priceInfo.change
						})
						rpcTotalValue += balanceUsd
					} else {
						debug.push(`${chainName} ${token.symbol}: 0`)
					}
				}

				tokens.push(...rpcTokens)
				totalValue += rpcTotalValue
				chainLoaded = true
				break
			} catch (e) {
				debug.push(`${chainName} RPC ${rpc} failed: ${String(e)}`)
			}
		}

		if (!chainLoaded) {
			debug.push(`${chainName} no RPC available`)
		}
	}

	return { address, tokens, totalValueUsd: totalValue, debug }
}

function AddressInput({ onSubmit }: { onSubmit: (address: string) => void | Promise<void> }) {
	const [val, setVal] = useState('')
	const [err, setErr] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		const a = val.trim()
		if (!a) {
			setErr('Please enter an address')
		} else if (!/^0x[a-fA-F0-9]{40}$/.test(a)) {
			setErr('Invalid address format')
		} else {
			setErr('')
			setIsLoading(true)
			try {
				await Promise.resolve(onSubmit(getAddress(a)))
			} finally {
				setIsLoading(false)
			}
		}
	}

	return (
		<form onSubmit={submit} className="flex w-full flex-col gap-3">
			<input
				type="text"
				placeholder="0x..."
				value={val}
				onChange={(e) => setVal(e.target.value)}
				className="w-full rounded-md border border-(--form-control-border) bg-white px-3 py-2 text-sm text-black dark:bg-black dark:text-white"
				disabled={isLoading}
			/>
			{err && <p className="text-xs text-red-500">{err}</p>}
			<button
				type="submit"
				disabled={isLoading}
				className="flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
			>
				{isLoading ? <LoadingSpinner size={14} /> : 'View'}
			</button>
		</form>
	)
}

function PortfolioContent() {
	const { connectedAddress, connectWallet, disconnectWallet } = usePortfolio()
	const [manual, setManual] = useState<string | null>(null)
	const addr = manual || connectedAddress
	const isClient = useIsClient()

	const queryFn = useCallback(async () => {
		if (!addr) throw new Error('No address')
		return fetchPortfolio(addr)
	}, [addr])

	const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
		queryKey: ['portfolio', addr],
		queryFn,
		enabled: !!addr,
		staleTime: 30000,
		refetchInterval: 60000,
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
	})

	const sorted = useMemo(
		() => (data?.tokens ? [...data.tokens].sort((a, b) => b.balanceUsd - a.balanceUsd) : []),
		[data]
	)

	if (!isClient) return null

	if (!addr) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<Icon name="wallet" className="h-16 w-16 text-blue-500" />
				<h2 className="text-xl font-semibold text-(--text-primary)">View Your Portfolio</h2>
				<button
					onClick={connectWallet}
					className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					<Icon name="wallet" className="h-4 w-4" />
					<span>Connect Wallet</span>
				</button>
				<div className="mt-4 w-full max-w-md rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<p className="mb-2 text-center text-xs text-[--text-disabled]">Or enter manually:</p>
					<AddressInput onSubmit={setManual} />
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<LocalLoader />
				<p className="text-sm text-[--text-disabled]">Loading portfolio...</p>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<Icon name="alert-triangle" className="h-10 w-10 text-yellow-500" />
				<p className="text-red-500">Failed to load portfolio</p>
				<p className="text-xs text-[--text-disabled]">{error instanceof Error ? error.message : 'Unknown error'}</p>
				<button
					onClick={() => refetch()}
					disabled={isLoading || isFetching}
					className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading || isFetching ? <LoadingSpinner size={12} /> : <Icon name="repeat" className="h-3 w-3" />}
					<span>{isLoading || isFetching ? 'Retrying...' : 'Try again'}</span>
				</button>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
				<div className="flex flex-wrap justify-between gap-4 border-b border-(--cards-border) pb-4 first:pt-0 last:border-none last:pb-0">
					<div>
						<p className="text-xs font-medium text-[--text-form]">Total Value</p>
						<p className="text-3xl font-bold text-(--text-primary)">
							${data?.totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
						</p>
					</div>
					<div className="flex gap-2">
						{manual && (
							<button
								onClick={() => setManual(null)}
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg)"
							>
								Clear
							</button>
						)}
						{connectedAddress && (
							<button
								onClick={disconnectWallet}
								className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg)"
							>
								Disconnect
							</button>
						)}
					</div>
				</div>
				<p className="mt-2 text-xs break-all text-[--text-disabled]">{data?.address}</p>
				<details className="mt-2 text-xs">
					<summary className="cursor-pointer text-[--text-disabled]">Debug</summary>
					<pre className="mt-1 whitespace-pre-wrap text-[--text-disabled]">{data?.debug.join('\n')}</pre>
				</details>
			</div>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="border-b border-(--cards-border) px-5 py-3">
					<h3 className="font-semibold text-(--text-primary)">Holdings</h3>
				</div>
				{sorted.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-[--text-disabled]">
						<Icon name="wallet" className="h-8 w-8 opacity-50" />
						<p>No tokens found</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-(--cards-border) text-left text-xs font-medium text-[--text-form]">
									<th className="px-5 py-3">Asset</th>
									<th className="px-5 py-3">Chain</th>
									<th className="px-5 py-3">Balance</th>
									<th className="px-5 py-3">Price</th>
									<th className="px-5 py-3">Value</th>
									<th className="px-5 py-3 text-right">24h</th>
								</tr>
							</thead>
							<tbody>
								{sorted.map((t) => {
									const hasPct = typeof t.priceChange24h === 'number'
									const pct = hasPct ? t.priceChange24h : null
									const rowKey = `${t.chain}:${t.address}:${t.symbol}`
									return (
										<tr key={rowKey} className="border-b border-(--cards-border) last:border-none">
											<td className="px-5 py-3">
												<div className="flex items-center gap-3">
													{t.address === '0x0' ? (
														<TokenLogo name={t.chainId || t.chain} kind="chain" alt={t.symbol} />
													) : (
														<TokenLogo name={t.chainId || t.symbol} kind="token" alt={t.symbol} />
													)}
													<div>
														<p className="font-medium text-(--text-primary)">{t.symbol}</p>
														<p className="text-xs text-[--text-disabled]">{t.name}</p>
													</div>
												</div>
											</td>
											<td className="px-5 py-3">
												<span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500">
													{t.chain}
												</span>
											</td>
											<td className="px-5 py-3 font-medium text-(--text-primary)">
												{t.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
											</td>
											<td className="px-5 py-3 text-(--text-primary)">
												${t.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
											</td>
											<td className="px-5 py-3 font-medium text-(--text-primary)">
												${t.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
											</td>
											<td
												className={`px-5 py-3 text-right ${
													!hasPct ? 'text-[--text-disabled]' : pct >= 0 ? 'text-green-500' : 'text-red-500'
												}`}
											>
												{hasPct ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '-'}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}

export default function Portfolio() {
	return (
		<Layout title="Portfolio - DefiLlama" description="View your DeFi portfolio" canonicalUrl="/portfolio">
			<PortfolioContent />
		</Layout>
	)
}
