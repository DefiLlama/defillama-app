import type { ColumnDef } from '@tanstack/react-table'
import { describe, expect, it } from 'vitest'
import type { MarketPair } from '../api.types'
import {
	buildCexMarketPairColumns,
	buildExchangePairColumns,
	renderCompactMarketPairLeverage,
	renderExactMarketPairLeverage,
	renderMarketPairFee
} from '../marketPairColumns'

function columnIds(columns: ColumnDef<MarketPair, any>[]) {
	return columns.map((column) => column.id)
}

function columnHeader(columns: ColumnDef<MarketPair, any>[], id: string) {
	return columns.find((column) => column.id === id)?.header
}

describe('market pair columns', () => {
	it('keeps exchange spot tables to price, volume, leverage, and fee columns', () => {
		expect(columnIds(buildExchangePairColumns('spot'))).toEqual([
			'symbol',
			'price',
			'price_change_24h',
			'volume_24h',
			'volume_change_24h',
			'max_leverage',
			'maker_fee',
			'taker_fee'
		])
	})

	it('keeps CEX section spot tables to price, volume, and fee columns', () => {
		expect(columnIds(buildCexMarketPairColumns('spot'))).toEqual([
			'symbol',
			'price',
			'price_change_24h',
			'volume_24h',
			'volume_change_24h',
			'maker_fee',
			'taker_fee'
		])
	})

	it('keeps perp-only open-interest, funding, and leverage columns', () => {
		expect(columnIds(buildExchangePairColumns('linear_perp'))).toEqual([
			'symbol',
			'price',
			'price_change_24h',
			'volume_24h',
			'volume_change_24h',
			'oi_usd',
			'oi_change_24h',
			'funding_rate_8h',
			'max_leverage',
			'maker_fee',
			'taker_fee'
		])
	})

	it('preserves visible labels that differ between exchange tables', () => {
		const exchangePairColumns = buildExchangePairColumns('linear_perp')
		const cexSectionColumns = buildCexMarketPairColumns('linear_perp')

		expect(columnHeader(exchangePairColumns, 'funding_rate_8h')).toBe('Funding 8h')
		expect(columnHeader(exchangePairColumns, 'max_leverage')).toBe('Max Lev')
		expect(columnHeader(exchangePairColumns, 'maker_fee')).toBe('Maker')
		expect(columnHeader(cexSectionColumns, 'funding_rate_8h')).toBe('Funding (8h)')
		expect(columnHeader(cexSectionColumns, 'max_leverage')).toBe('Max Leverage')
		expect(columnHeader(cexSectionColumns, 'maker_fee')).toBe('Maker Fee')
	})

	it('preserves fee and leverage rendering edge cases', () => {
		expect(renderMarketPairFee(null)).toBe('–')
		expect(renderMarketPairFee(0.00025)).toBe('0.025%')
		expect(renderCompactMarketPairLeverage(null)).toBe('–')
		expect(renderCompactMarketPairLeverage(0)).toBe('–')
		expect(renderCompactMarketPairLeverage(9.5)).toBe('9.5×')
		expect(renderCompactMarketPairLeverage(10.6)).toBe('11×')
		expect(renderExactMarketPairLeverage(null)).toBe('–')
		expect(renderExactMarketPairLeverage(0)).toBe('0x')
		expect(renderExactMarketPairLeverage(10.6)).toBe('10.6x')
	})
})
