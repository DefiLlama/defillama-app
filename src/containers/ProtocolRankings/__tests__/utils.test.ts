import { describe, expect, it } from 'vitest'
import { protocolMatchesForkFilter, protocolMatchesOracleFilter, toFilterProtocol, toStrikeTvl } from '../utils'

const protocolMetadata = (overrides: Record<string, unknown> = {}) =>
	({
		displayName: 'Protocol',
		chains: ['Ethereum'],
		...overrides
	}) as any

const liteProtocol = (overrides: Record<string, unknown> = {}) =>
	({
		category: 'Dexes',
		chains: ['Ethereum'],
		forkedFrom: undefined,
		oracles: undefined,
		oraclesByChain: {},
		...overrides
	}) as any

describe('ProtocolRankings filter helpers', () => {
	it('keeps protocols with display metadata on all-chain views', () => {
		expect(
			toFilterProtocol({
				protocolMetadata: protocolMetadata(),
				protocolData: liteProtocol(),
				chainDisplayName: 'All'
			})
		).toBe(true)
	})

	it('keeps protocols when either metadata or protocol data includes the selected chain', () => {
		expect(
			toFilterProtocol({
				protocolMetadata: protocolMetadata({ chains: ['Optimism'] }),
				protocolData: liteProtocol({ chains: ['Ethereum'] }),
				chainDisplayName: 'Ethereum'
			})
		).toBe(true)
	})

	it('filters protocols with excluded categories, missing display names, or missing metadata chains', () => {
		expect(
			toFilterProtocol({
				protocolMetadata: protocolMetadata(),
				protocolData: liteProtocol({ category: 'Canonical Bridge' }),
				chainDisplayName: 'All'
			})
		).toBe(false)
		expect(
			toFilterProtocol({
				protocolMetadata: protocolMetadata({ displayName: '' }),
				protocolData: liteProtocol(),
				chainDisplayName: 'All'
			})
		).toBe(false)
		expect(
			toFilterProtocol({
				protocolMetadata: protocolMetadata({ chains: undefined }),
				protocolData: liteProtocol(),
				chainDisplayName: 'All'
			})
		).toBe(false)
	})

	it('matches fork filters by normalized fork names', () => {
		expect(protocolMatchesForkFilter({ protocol: liteProtocol(), normalizedFork: null })).toBe(true)
		expect(
			protocolMatchesForkFilter({
				protocol: liteProtocol({ forkedFrom: ['Uniswap V2'] }),
				normalizedFork: 'uniswap-v2'
			})
		).toBe(true)
		expect(protocolMatchesForkFilter({ protocol: liteProtocol(), normalizedFork: 'uniswap-v2' })).toBe(false)
		expect(
			protocolMatchesForkFilter({
				protocol: liteProtocol({ forkedFrom: ['Curve'] }),
				normalizedFork: 'uniswap-v2'
			})
		).toBe(false)
	})

	it('matches oracle filters against the selected chain first', () => {
		expect(
			protocolMatchesOracleFilter({
				protocol: liteProtocol(),
				normalizedOracle: null,
				isAllChains: false,
				chainDisplayName: 'Ethereum'
			})
		).toBe(true)
		expect(
			protocolMatchesOracleFilter({
				protocol: liteProtocol({ oraclesByChain: { Ethereum: ['Chainlink'] } }),
				normalizedOracle: 'chainlink',
				isAllChains: false,
				chainDisplayName: 'Ethereum'
			})
		).toBe(true)
		expect(
			protocolMatchesOracleFilter({
				protocol: liteProtocol({ oraclesByChain: { Optimism: ['Chainlink'] }, oracles: ['Chainlink'] }),
				normalizedOracle: 'chainlink',
				isAllChains: false,
				chainDisplayName: 'Ethereum'
			})
		).toBe(false)
	})

	it('matches oracle filters across any chain on all-chain views and falls back to legacy oracle lists', () => {
		expect(
			protocolMatchesOracleFilter({
				protocol: liteProtocol({ oraclesByChain: { Optimism: ['Chainlink'] } }),
				normalizedOracle: 'chainlink',
				isAllChains: true,
				chainDisplayName: 'All'
			})
		).toBe(true)
		expect(
			protocolMatchesOracleFilter({
				protocol: liteProtocol({ oracles: ['Chainlink'] }),
				normalizedOracle: 'chainlink',
				isAllChains: false,
				chainDisplayName: 'Ethereum'
			})
		).toBe(true)
		expect(
			protocolMatchesOracleFilter({
				protocol: liteProtocol({ oracles: ['Pyth'] }),
				normalizedOracle: 'chainlink',
				isAllChains: true,
				chainDisplayName: 'All'
			})
		).toBe(false)
	})
})

describe('ProtocolRankings TVL helpers', () => {
	it('strikes protocol rows in categories removed from chain TVL', () => {
		expect(toStrikeTvl({ category: 'Bridge' }, {})).toBe(true)
	})

	it('strikes protocol rows that expose liquid staking or double counted TVL sections', () => {
		expect(toStrikeTvl({ category: 'Dexes' }, { liquidstaking: true })).toBe(true)
		expect(toStrikeTvl({ category: 'Dexes' }, { doublecounted: true })).toBe(true)
	})

	it('does not strike ordinary protocol rows without removed categories or extra TVL sections', () => {
		expect(toStrikeTvl({ category: 'Dexes' }, {})).toBe(false)
	})
})
