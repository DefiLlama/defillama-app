import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'
import type { IChainsByAdapterPageData } from '../types'

const mocks = vi.hoisted(() => ({
	feesSettings: {
		bribes: false,
		tokentax: false
	},
	chartProps: [] as Array<Record<string, unknown>>,
	tableData: [] as Array<Array<Record<string, unknown>>>
}))

vi.mock('~/contexts/LocalStorage', () => ({
	useLocalStorageSettingsManager: () => [mocks.feesSettings]
}))

vi.mock('~/components/ButtonStyled/CsvButton', () => ({
	CSVDownloadButton: () => null
}))

vi.mock('~/components/Table/Table', () => ({
	VirtualTable: ({ instance }: { instance: { options: { data: Array<Record<string, unknown>> } } }) => {
		mocks.tableData.push(instance.options.data)
		return null
	}
}))

vi.mock('../ChainChart', () => ({
	ChainsByAdapterChart: (props: Record<string, unknown>) => {
		mocks.chartProps.push(props)
		return null
	}
}))

import { ChainsByAdapter } from '../ChainsByAdapter'

type PageType = Parameters<typeof ChainsByAdapter>[0]['type']

const feeExtrasChain = {
	name: 'Base',
	logo: '/icons/base.png',
	total24h: 100,
	total7d: 700,
	total30d: 3000,
	bribes: {
		total24h: 20,
		total7d: 140,
		total30d: 600
	},
	tokenTax: {
		total24h: 3,
		total7d: 21,
		total30d: 30
	}
}

function renderRows({
	type,
	adapterType,
	dataType,
	chains
}: {
	type: PageType
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	chains: IChainsByAdapterPageData['chains']
}) {
	const tableRenderIndex = mocks.tableData.length

	renderToStaticMarkup(
		<ChainsByAdapter
			type={type}
			adapterType={adapterType}
			dataType={dataType}
			chartData={{ dimensions: ['timestamp'], source: [] }}
			chains={chains}
			allChains={chains.map((chain) => chain.name)}
		/>
	)

	expect(mocks.tableData).toHaveLength(tableRenderIndex + 1)
	return mocks.tableData[tableRenderIndex]
}

describe('ChainsByAdapter fee extras', () => {
	beforeEach(() => {
		mocks.feesSettings.bribes = false
		mocks.feesSettings.tokentax = false
		mocks.chartProps = []
		mocks.tableData = []
	})

	it('keeps app fee chain totals unchanged when fee extras are disabled', () => {
		const rows = renderRows({
			type: 'App Fees',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES,
			chains: [feeExtrasChain]
		})

		expect(rows[0]).toMatchObject({
			name: 'Base',
			total24h: 100,
			total7d: 700,
			total30d: 3000
		})
	})

	it.each([
		['Fees', ADAPTER_DATA_TYPES.DAILY_FEES],
		['Revenue', ADAPTER_DATA_TYPES.DAILY_REVENUE],
		['Holders Revenue', ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE],
		['App Fees', ADAPTER_DATA_TYPES.DAILY_APP_FEES],
		['App Revenue', ADAPTER_DATA_TYPES.DAILY_APP_REVENUE]
	] as const)('adds enabled bribes and token tax into %s chain table totals', (type, dataType) => {
		mocks.feesSettings.bribes = true
		mocks.feesSettings.tokentax = true

		const rows = renderRows({
			type,
			adapterType: ADAPTER_TYPES.FEES,
			dataType,
			chains: [feeExtrasChain]
		})

		expect(rows[0]).toMatchObject({
			name: 'Base',
			total24h: 123,
			total7d: 861,
			total30d: 3630
		})
	})

	it('does not add fee extras into non-fee adapter chain table totals', () => {
		mocks.feesSettings.bribes = true
		mocks.feesSettings.tokentax = true

		const rows = renderRows({
			type: 'DEX Volume',
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chains: [feeExtrasChain]
		})

		expect(rows[0]).toMatchObject({
			name: 'Base',
			total24h: 100,
			total7d: 700,
			total30d: 3000
		})
	})

	it('shows chart panels on app fee and holders revenue chain ranking pages', () => {
		renderRows({
			type: 'App Fees',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES,
			chains: [feeExtrasChain]
		})
		renderRows({
			type: 'Holders Revenue',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE,
			chains: [feeExtrasChain]
		})

		expect(mocks.chartProps.map((props) => props.chartName)).toEqual(['App Fees', 'Holders Revenue'])
	})

	it('hides chart panels on chain-native fee and revenue ranking pages', () => {
		renderRows({
			type: 'Fees',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES,
			chains: [feeExtrasChain]
		})
		renderRows({
			type: 'Revenue',
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE,
			chains: [feeExtrasChain]
		})

		expect(mocks.chartProps).toEqual([])
	})

	it('keeps chart panels visible for non-fee chain ranking pages', () => {
		renderRows({
			type: 'DEX Volume',
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chains: [feeExtrasChain]
		})

		expect(mocks.chartProps.map((props) => props.chartName)).toEqual(['DEX Volume'])
	})
})
