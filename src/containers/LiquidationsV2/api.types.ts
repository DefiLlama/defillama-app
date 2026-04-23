import type { BlockExplorersResponse } from '~/api/types'

interface RawLiquidationOwnerExtra {
	displayName?: string
	url?: string
}

export interface RawLiquidationPosition {
	owner: string
	liqPrice: number
	collateral: string
	collateralAmount: number
	collateralAmountUsd: number
	extra?: RawLiquidationOwnerExtra
}

export interface RawProtocolsResponse {
	protocols: string[]
}

export interface RawToken {
	symbol: string
	decimals: number
	price?: number | null
}

export type RawValidThreshold = '100k' | '10k' | 'all'

export type RawTokenMap = Record<string, RawToken>

export type RawMultiChainTokenMap = Record<string, RawTokenMap>

interface RawLiquidationsResponseBase<TData, TTokens> {
	data: TData
	tokens: TTokens
	validThresholds: RawValidThreshold[]
	timestamp: number
}

export type RawAllLiquidationsResponse = RawLiquidationsResponseBase<
	Record<string, Record<string, RawLiquidationPosition[]>>,
	RawMultiChainTokenMap
>

export type RawProtocolLiquidationsResponse = RawLiquidationsResponseBase<
	Record<string, RawLiquidationPosition[]>,
	RawMultiChainTokenMap
>

export interface NavLink {
	label: string
	to: string
}

export interface LiquidationsProtocolRef {
	id: string
	name: string
	slug: string
}

export interface LiquidationsChainRef {
	id: string
	name: string
	slug: string
}

export interface LiquidationPosition {
	protocolId: string
	protocolName: string
	protocolSlug: string
	chainId: string
	chainName: string
	chainSlug: string
	owner: string
	ownerName: string
	ownerUrlOverride: string | null
	liqPrice: number
	collateral: string
	collateralAmount: number
	collateralAmountUsd: number
}

export interface OverviewProtocolRow extends LiquidationsProtocolRef {
	positionCount: number
	chainCount: number
	collateralCount: number
	totalCollateralUsd: number
}

export interface OverviewChainRow extends LiquidationsChainRef {
	positionCount: number
	protocolCount: number
	collateralCount: number
	totalCollateralUsd: number
}

export interface ProtocolChainRow extends LiquidationsChainRef {
	protocolId: string
	protocolName: string
	protocolSlug: string
	positionCount: number
	collateralCount: number
	totalCollateralUsd: number
}

export interface LiquidationsDistributionChartSeries {
	key: string
	label: string
	usd: number[]
	amount: number[]
	totalUsd: number
}

export type LiquidationsDistributionChartBreakdownKey = 'total' | 'protocol' | 'chain'

export interface LiquidationsDistributionChartView {
	bins: number[]
	series: LiquidationsDistributionChartSeries[]
}

export interface LiquidationsDistributionChartToken {
	key: string
	label: string
	totalUsd: number
	breakdowns: Record<LiquidationsDistributionChartBreakdownKey, LiquidationsDistributionChartView>
}

export interface LiquidationsDistributionChartData {
	tokens: LiquidationsDistributionChartToken[]
}

export interface LiquidationsOverviewPageProps {
	protocolLinks: NavLink[]
	timestamp: number
	protocolCount: number
	chainCount: number
	positionCount: number
	totalCollateralUsd: number
	distributionChart: LiquidationsDistributionChartData
	protocolRows: OverviewProtocolRow[]
	chainRows: OverviewChainRow[]
}

export interface LiquidationsOverviewShell {
	protocolLinks: NavLink[]
}

export interface TokenLiquidationsSectionData {
	tokenSymbol: string
	timestamp: number
	positionCount: number
	protocolCount: number
	chainCount: number
	totalCollateralUsd: number
	distributionChart: LiquidationsDistributionChartData
	protocolRows: OverviewProtocolRow[]
	chainRows: OverviewChainRow[]
}

export interface LiquidationsProtocolPageProps {
	protocolLinks: NavLink[]
	chainLinks: NavLink[]
	protocolId: string
	protocolName: string
	protocolSlug: string
	timestamp: number
	chainCount: number
	positionCount: number
	collateralCount: number
	totalCollateralUsd: number
	distributionChart: LiquidationsDistributionChartData
	chainRows: ProtocolChainRow[]
	ownerBlockExplorers: BlockExplorersResponse
	positions: LiquidationPosition[]
}

export interface LiquidationsProtocolShell {
	protocolLinks: NavLink[]
	chainLinks: NavLink[]
	protocolName: string
	protocolSlug: string
}

export interface LiquidationsChainPageProps {
	protocolLinks: NavLink[]
	chainLinks: NavLink[]
	protocolId: string
	protocolName: string
	protocolSlug: string
	chainId: string
	chainName: string
	chainSlug: string
	timestamp: number
	positionCount: number
	collateralCount: number
	totalCollateralUsd: number
	distributionChart: LiquidationsDistributionChartData
	chainRows: ProtocolChainRow[]
	ownerBlockExplorers: BlockExplorersResponse
	positions: LiquidationPosition[]
}

export interface LiquidationsChainShell {
	protocolLinks: NavLink[]
	chainLinks: NavLink[]
	protocolName: string
	protocolSlug: string
	chainName: string
	chainSlug: string
}
