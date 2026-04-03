import { describe, expect, it } from 'vitest'
import type { CoinGeckoCoinTickerWithDepth } from '~/api/coingecko.types'
import { getLlamaswapChainByGeckoPlatform } from '~/constants/chains'
import {
	getSupportedCoinGeckoPlatformsForLlamaswap,
	mapSupportedCoinGeckoPlatformsToLlamaswapChains,
	normalizeEvmContractAddress,
	parseCoinGeckoLlamaswapChainsByTickerVolume
} from './llamaswapCoingecko'

describe('getLlamaswapChainByGeckoPlatform', () => {
	it('resolves Hyperliquid aliases to the hyperevm LlamaSwap chain', () => {
		expect(getLlamaswapChainByGeckoPlatform('hyperliquid')).toMatchObject({
			llamaswap: 'hyperevm',
			displayName: 'Hyperliquid'
		})
		expect(getLlamaswapChainByGeckoPlatform('hyperevm')).toMatchObject({
			llamaswap: 'hyperevm',
			displayName: 'Hyperliquid'
		})
	})

	it('keeps existing direct platform mappings intact', () => {
		expect(getLlamaswapChainByGeckoPlatform('arbitrum-one')?.llamaswap).toBe('arbitrum')
		expect(getLlamaswapChainByGeckoPlatform('polygon-pos')?.llamaswap).toBe('polygon')
		expect(getLlamaswapChainByGeckoPlatform('base')?.llamaswap).toBe('base')
	})
})

describe('normalizeEvmContractAddress', () => {
	it('normalizes EVM addresses to lowercase', () => {
		expect(normalizeEvmContractAddress(' 0xAbC123 ')).toBe('0xabc123')
	})

	it('rejects symbol-style and non-EVM values', () => {
		expect(normalizeEvmContractAddress('HYPE')).toBeNull()
		expect(normalizeEvmContractAddress('sei1abcd')).toBeNull()
		expect(normalizeEvmContractAddress('')).toBeNull()
	})
})

describe('getSupportedCoinGeckoPlatformsForLlamaswap', () => {
	it('filters to supported LlamaSwap platforms with EVM addresses only', () => {
		expect(
			getSupportedCoinGeckoPlatformsForLlamaswap({
				hyperliquid: '0x0D01DC56DCAACA66AD901C959B4011EC',
				base: '0x4200000000000000000000000000000000000006',
				solana: 'So11111111111111111111111111111111111111112',
				unknown: '0x1111111111111111111111111111111111111111'
			})
		).toEqual({
			hyperliquid: '0x0d01dc56dcaaca66ad901c959b4011ec',
			base: '0x4200000000000000000000000000000000000006'
		})
	})
})

describe('mapSupportedCoinGeckoPlatformsToLlamaswapChains', () => {
	it('maps supported platform addresses without needing ticker data', () => {
		expect(
			mapSupportedCoinGeckoPlatformsToLlamaswapChains({
				hyperliquid: '0x0D01DC56DCAACA66AD901C959B4011EC',
				base: '0x4200000000000000000000000000000000000006',
				solana: 'So11111111111111111111111111111111111111112'
			})
		).toEqual([
			{
				chain: 'hyperevm',
				address: '0x0d01dc56dcaaca66ad901c959b4011ec',
				displayName: 'Hyperliquid'
			},
			{
				chain: 'base',
				address: '0x4200000000000000000000000000000000000006',
				displayName: 'Base'
			}
		])
	})
})

describe('parseCoinGeckoLlamaswapChainsByTickerVolume', () => {
	const hyperliquidAddress = '0x0d01dc56dcaaca66ad901c959b4011ec'
	const baseAddress = '0x4200000000000000000000000000000000000006'

	const tickers: CoinGeckoCoinTickerWithDepth[] = [
		{
			base: hyperliquidAddress,
			target: '0x0000000000000000000000000000000000000000',
			converted_volume: { usd: 50 }
		},
		{
			base: '0x0000000000000000000000000000000000000000',
			target: baseAddress,
			converted_volume: { usd: 20 }
		},
		{
			base: 'HYPE',
			target: 'USDC',
			converted_volume: { usd: 999999 }
		},
		{
			base: '0x9999999999999999999999999999999999999999',
			target: 'USDC',
			converted_volume: { usd: 5 }
		}
	]

	it('maps supported addresses to LlamaSwap chains and sorts by matched volume', () => {
		expect(
			parseCoinGeckoLlamaswapChainsByTickerVolume({
				platforms: {
					hyperliquid: hyperliquidAddress.toUpperCase(),
					base: baseAddress
				},
				tickers
			})
		).toEqual([
			{
				chain: 'hyperevm',
				address: hyperliquidAddress,
				displayName: 'Hyperliquid'
			},
			{
				chain: 'base',
				address: baseAddress,
				displayName: 'Base'
			}
		])
	})

	it('ignores symbol-only ticker rows and unsupported platform addresses', () => {
		expect(
			parseCoinGeckoLlamaswapChainsByTickerVolume({
				platforms: {
					hyperliquid: hyperliquidAddress,
					solana: 'So11111111111111111111111111111111111111112'
				},
				tickers: [
					{
						base: 'HYPE',
						target: 'USDC',
						converted_volume: { usd: 999999 }
					}
				]
			})
		).toEqual([
			{
				chain: 'hyperevm',
				address: hyperliquidAddress,
				displayName: 'Hyperliquid'
			}
		])
	})

	it('falls back to supported platform chains when ticker data is missing entirely', () => {
		expect(
			parseCoinGeckoLlamaswapChainsByTickerVolume({
				platforms: {
					hyperliquid: hyperliquidAddress,
					base: baseAddress
				},
				tickers: []
			})
		).toEqual([
			{
				chain: 'hyperevm',
				address: hyperliquidAddress,
				displayName: 'Hyperliquid'
			},
			{
				chain: 'base',
				address: baseAddress,
				displayName: 'Base'
			}
		])
	})

	it('returns identical output for both Hyperliquid Gecko platform keys', () => {
		const withHyperliquidKey = parseCoinGeckoLlamaswapChainsByTickerVolume({
			platforms: { hyperliquid: hyperliquidAddress },
			tickers
		})
		const withHyperevmKey = parseCoinGeckoLlamaswapChainsByTickerVolume({
			platforms: { hyperevm: hyperliquidAddress },
			tickers
		})

		expect(withHyperliquidKey).toEqual(withHyperevmKey)
		expect(withHyperliquidKey).toEqual([
			{
				chain: 'hyperevm',
				address: hyperliquidAddress,
				displayName: 'Hyperliquid'
			}
		])
	})
})
