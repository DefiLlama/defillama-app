import type { RawBridgeInfo } from './api.types'

export interface BridgeVolumeChartPoint {
	date: number
	Deposited: number
	Withdrawn: number
}

export interface BridgeTokenTableRow {
	symbol: string
	deposited: number
	withdrawn: number
	volume: number
}

export interface BridgeAddressTableRow {
	address: string
	deposited: number
	withdrawn: number
	txs: number
}

export interface BridgePieChartSlice {
	name: string
	value: number
}

export interface BridgeTableData {
	tokensTableData: BridgeTokenTableRow[]
	addressesTableData: BridgeAddressTableRow[]
	tokenDeposits: BridgePieChartSlice[]
	tokenWithdrawals: BridgePieChartSlice[]
	tokenColor: Record<string, string>
}

export interface BridgePageData {
	displayName: string
	logo: string
	chains: string[]
	defaultChain: string
	volumeDataByChain: Record<string, BridgeVolumeChartPoint[]>
	tableDataByChain: Record<string, BridgeTableData>
	config: RawBridgeInfo
}
