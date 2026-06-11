import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type VisibilityState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { ChartRestoreButton } from '~/components/ButtonStyled/ChartRestoreButton'
import { Checkbox } from '~/components/Checkbox'
import type {
	IHBarChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	ITreemapChartProps,
	MultiSeriesChart2SeriesConfig
} from '~/components/ECharts/types'
import { preparePieChartData } from '~/components/ECharts/utils'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { PercentChange } from '~/components/PercentChange'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Select } from '~/components/Select/Select'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import type { RWAChartDataset, RWAChartRow } from '~/containers/RWA/chartDataset'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'
import { getErrorMessage } from '~/utils/error'
import { isTrueQueryParam, parseArrayParam, parseExcludeParam, pushShallowQuery } from '~/utils/routerQuery'
import type { IRWAPerpsMarket } from './api.types'
import {
	getRWAPerpsBaseAssetBreakdownLabel,
	getRWAPerpsOverviewBreakdownLabel,
	getRWAPerpsVenueBreakdownLabel
} from './breakdownLabels'
import {
	getDefaultRWAPerpsChartBreakdown,
	getRWAPerpsBreakdownLabel,
	getRWAPerpsChartBreakdownOptions,
	getRWAPerpsChartBreakdownQueryValue,
	getRWAPerpsChartMetricLabel,
	getRWAPerpsChartMetricOptions,
	getRWAPerpsTimeSeriesModeQueryValue,
	getRWAPerpsChartMetricQueryValue,
	getRWAPerpsTreemapNestedByLabel,
	getRWAPerpsTreemapNestedByOptions,
	getRWAPerpsTreemapNestedByQueryValue,
	getRWAPerpsChartViewOptions,
	getRWAPerpsChartViewQueryValueForMode,
	parseRWAPerpsChartState,
	setRWAPerpsChartBreakdown,
	setRWAPerpsTimeSeriesMode,
	setRWAPerpsTreemapNestedBy,
	setRWAPerpsChartView
} from './chartState'
import { perpsDefinitions as d } from './definitions'
import {
	buildRWAPerpsAssetGroupSnapshotBreakdownTotals,
	buildRWAPerpsOverviewSnapshotBreakdownTotals,
	buildRWAPerpsVenueSnapshotBreakdownTotals,
	appendRWAPerpsTimeSeriesDatasetTotal,
	getAggregateOpenInterestChange24h,
	getAggregateVolume24hChange24h,
	groupRWAPerpsTimeSeriesDataset,
	hasEnoughTimeSeriesHistory,
	sumMarketMetric,
	sumProtocolFees24h
} from './queries'
import { buildRWAPerpsTreemapTreeData } from './treemap'
import type {
	IRWAPerpsAssetGroupPageData,
	RWAPerpsAssetGroupBreakdown,
	IRWAPerpsContractBreakdownRequest,
	RWAPerpsOverviewBreakdown,
	IRWAPerpsOverviewBreakdownRequest,
	IRWAPerpsOverviewPageData,
	IRWAPerpsVenuePageData,
	RWAPerpsVenueBreakdown,
	RWAPerpsAssetGroupSnapshotBreakdown,
	RWAPerpsAssetGroupTimeSeriesBreakdown,
	RWAPerpsAssetGroupTreemapBreakdown,
	RWAPerpsChartMode,
	RWAPerpsOverviewTimeSeriesBreakdown,
	RWAPerpsOverviewSnapshotBreakdown,
	RWAPerpsOverviewTreemapBreakdown,
	RWAPerpsVenueSnapshotBreakdown,
	RWAPerpsVenueTimeSeriesBreakdown,
	RWAPerpsVenueTreemapBreakdown
} from './types'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart')) as React.FC<IHBarChartProps>
const TreemapChart = lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

const EMPTY_DATASET: RWAChartDataset = { source: [], dimensions: ['timestamp'] }
const PIE_CHART_RADIUS = ['50%', '70%'] as [string, string]
const MAX_HORIZONTAL_BARS = 9
const FOREX_ASSET_CLASS = 'Forex Perps'
const BASE_ASSET_QUERY_KEY = 'baseAssets'
const EXCLUDE_BASE_ASSET_QUERY_KEY = 'excludeBaseAssets'

type RWAPerpsTimeSeriesBreakdownForMode =
	| RWAPerpsOverviewBreakdown
	| RWAPerpsVenueBreakdown
	| RWAPerpsAssetGroupBreakdown

type RWAPerpsDashboardProps = (
	| {
			mode: 'overview'
			data: IRWAPerpsOverviewPageData
			defaultTimeSeriesBreakdown?: RWAPerpsOverviewTimeSeriesBreakdown
	  }
	| {
			mode: 'venue'
			data: IRWAPerpsVenuePageData
			defaultTimeSeriesBreakdown?: RWAPerpsVenueTimeSeriesBreakdown
	  }
	| {
			mode: 'assetGroup'
			data: IRWAPerpsAssetGroupPageData
			defaultTimeSeriesBreakdown?: RWAPerpsAssetGroupTimeSeriesBreakdown
	  }
) & {
	/** When set, restricts rendered markets/totals to the matching `assetClass[0]`. Used by the dedicated Forex page. */
	assetClassFilter?: string
}

const overviewColumnHelper = createColumnHelper<IRWAPerpsOverviewPageData['markets'][number]>()
const venueColumnHelper = createColumnHelper<IRWAPerpsVenuePageData['markets'][number]>()

const overviewColumns = [
	overviewColumnHelper.accessor((row) => row.contract, {
		id: 'contract',
		header: d.contract.label,
		enableSorting: false,
		cell: (info) => (
			<span className="flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink
					href={`/rwa/perps/contract/${encodeURIComponent(info.row.original.contract)}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.row.original.contract}
				</BasicLink>
			</span>
		),
		meta: {
			headerClassName: 'w-[min(220px,40vw)]',
			headerHelperText: d.contract.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.venue, {
		id: 'venue',
		header: d.venue.label,
		cell: (info) => (
			<BasicLink
				href={`/rwa/perps/venue/${rwaSlug(info.getValue())}`}
				className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
			>
				{info.getValue()}
			</BasicLink>
		),
		meta: {
			headerClassName: 'w-[168px]',
			headerHelperText: d.venue.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.assetClass?.[0] ?? '', {
		id: 'assetClass',
		header: d.assetClass.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[176px]',
			headerHelperText: d.assetClass.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.referenceAssetGroup ?? '', {
		id: 'baseAssetGroup',
		header: d.assetGroup.label,
		enableSorting: false,
		cell: (info) =>
			info.getValue() ? (
				<BasicLink
					href={`/rwa/perps/asset-group/${rwaSlug(info.getValue())}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.getValue()}
				</BasicLink>
			) : (
				''
			),
		meta: {
			headerClassName: 'w-[136px]',
			headerHelperText: d.assetGroup.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.referenceAsset ?? '', {
		id: 'baseAsset',
		header: d.baseAsset.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[140px]',
			headerHelperText: d.baseAsset.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.category?.join(', ') ?? '', {
		id: 'category',
		header: d.category.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[132px]',
			headerHelperText: d.category.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.openInterest ?? undefined, {
		id: 'openInterest',
		header: d.openInterest.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[136px]',
			align: 'end',
			headerHelperText: d.openInterest.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.openInterestChange24h ?? undefined, {
		id: 'openInterestChange24h',
		header: d.openInterestChange24h.label,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			headerClassName: 'w-[148px]',
			align: 'end',
			headerHelperText: d.openInterestChange24h.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.volume24h ?? undefined, {
		id: 'volume24h',
		header: d.volume24h.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[126px]',
			align: 'end',
			headerHelperText: d.volume24h.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.volume24hChange24h ?? undefined, {
		id: 'volume24hChange24h',
		header: d.volume24hChange24h.label,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			headerClassName: 'w-[172px]',
			align: 'end',
			headerHelperText: d.volume24hChange24h.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.price ?? undefined, {
		id: 'price',
		header: d.price.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[88px]',
			align: 'end',
			headerHelperText: d.price.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.priceChange24h ?? undefined, {
		id: 'priceChange24h',
		header: d.priceChange24h.label,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			headerClassName: 'w-[156px]',
			align: 'end',
			headerHelperText: d.priceChange24h.description
		}
	}),
	overviewColumnHelper.accessor((row) => (row.fundingRate == null ? undefined : row.fundingRate * 100), {
		id: 'fundingRate',
		header: d.fundingRate.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[min(180px,40vw)]',
			align: 'end',
			headerHelperText: d.fundingRate.description
		}
	}),
	overviewColumnHelper.accessor((row) => (row.premium == null ? undefined : row.premium * 100), {
		id: 'premium',
		header: d.premium.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[108px]',
			align: 'end',
			headerHelperText: d.premium.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.maxLeverage ?? undefined, {
		id: 'maxLeverage',
		header: d.maxLeverage.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}x`,
		meta: {
			headerClassName: 'w-[128px]',
			align: 'end',
			headerHelperText: d.maxLeverage.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.parentPlatform, {
		id: 'parentPlatform',
		header: d.parentPlatform.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[156px]',
			headerHelperText: d.parentPlatform.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.marginAsset, {
		id: 'marginAsset',
		header: d.marginAsset.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[132px]',
			headerHelperText: d.marginAsset.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.settlementAsset, {
		id: 'settlementAsset',
		header: d.settlementAsset.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[156px]',
			headerHelperText: d.settlementAsset.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.issuer ?? '', {
		id: 'issuer',
		header: d.issuer.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[96px]',
			headerHelperText: d.issuer.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.oracleProvider ?? '', {
		id: 'oracleProvider',
		header: d.oracleProvider.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[164px]',
			headerHelperText: d.oracleProvider.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.rwaClassification ?? '', {
		id: 'rwaClassification',
		header: d.rwaClassification.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[170px]',
			headerHelperText: d.rwaClassification.description
		}
	}),
	overviewColumnHelper.accessor((row) => (row.makerFeeRate == null ? undefined : row.makerFeeRate * 100), {
		id: 'makerFeeRate',
		header: d.makerFeeRate.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[112px]',
			align: 'end',
			headerHelperText: d.makerFeeRate.description
		}
	}),
	overviewColumnHelper.accessor((row) => (row.takerFeeRate == null ? undefined : row.takerFeeRate * 100), {
		id: 'takerFeeRate',
		header: d.takerFeeRate.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[112px]',
			align: 'end',
			headerHelperText: d.takerFeeRate.description
		}
	}),
	overviewColumnHelper.accessor((row) => (row.deployerFeeShare == null ? undefined : row.deployerFeeShare * 100), {
		id: 'deployerFeeShare',
		header: d.deployerFeeShare.label,
		cell: (info) => (info.getValue() == null ? '-' : `${formattedNum(info.getValue(), false)}%`),
		meta: {
			headerClassName: 'w-[154px]',
			align: 'end',
			headerHelperText: d.deployerFeeShare.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.cumulativeFunding ?? undefined, {
		id: 'cumulativeFunding',
		header: d.cumulativeFunding.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[168px]',
			align: 'end',
			headerHelperText: d.cumulativeFunding.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.oraclePx ?? undefined, {
		id: 'oraclePx',
		header: d.oraclePx.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[92px]',
			align: 'end',
			headerHelperText: d.oraclePx.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.midPx ?? undefined, {
		id: 'midPx',
		header: d.midPx.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[88px]',
			align: 'end',
			headerHelperText: d.midPx.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.prevDayPx ?? undefined, {
		id: 'prevDayPx',
		header: d.prevDayPx.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[116px]',
			align: 'end',
			headerHelperText: d.prevDayPx.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.volume7d ?? undefined, {
		id: 'volume7d',
		header: d.volume7d.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[118px]',
			align: 'end',
			headerHelperText: d.volume7d.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.volume30d ?? undefined, {
		id: 'volume30d',
		header: d.volume30d.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[126px]',
			align: 'end',
			headerHelperText: d.volume30d.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.volumeAllTime ?? undefined, {
		id: 'volumeAllTime',
		header: d.volumeAllTime.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[146px]',
			align: 'end',
			headerHelperText: d.volumeAllTime.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFees24h ?? undefined, {
		id: 'estimatedProtocolFees24h',
		header: d.estimatedProtocolFees24h.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(188px,40vw)]',
			align: 'end',
			headerHelperText: d.estimatedProtocolFees24h.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFees7d ?? undefined, {
		id: 'estimatedProtocolFees7d',
		header: d.estimatedProtocolFees7d.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(188px,40vw)]',
			align: 'end',
			headerHelperText: d.estimatedProtocolFees7d.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFees30d ?? undefined, {
		id: 'estimatedProtocolFees30d',
		header: d.estimatedProtocolFees30d.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(188px,40vw)]',
			align: 'end',
			headerHelperText: d.estimatedProtocolFees30d.description
		}
	}),
	overviewColumnHelper.accessor((row) => row.estimatedProtocolFeesAllTime ?? undefined, {
		id: 'estimatedProtocolFeesAllTime',
		header: d.estimatedProtocolFeesAllTime.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(210px,40vw)]',
			align: 'end',
			headerHelperText: d.estimatedProtocolFeesAllTime.description
		}
	})
]

const venueColumns = [
	venueColumnHelper.accessor((row) => row.contract, {
		id: 'contract',
		header: d.contract.label,
		enableSorting: false,
		cell: (info) => (
			<span className="flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink
					href={`/rwa/perps/contract/${encodeURIComponent(info.row.original.contract)}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.row.original.contract}
				</BasicLink>
			</span>
		),
		meta: {
			headerClassName: 'w-[min(220px,40vw)]',
			headerHelperText: d.contract.description
		}
	}),
	venueColumnHelper.accessor((row) => row.referenceAsset ?? '', {
		id: 'baseAsset',
		header: d.baseAsset.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[140px]',
			headerHelperText: d.baseAsset.description
		}
	}),
	venueColumnHelper.accessor((row) => row.referenceAssetGroup ?? '', {
		id: 'baseAssetGroup',
		header: d.assetGroup.label,
		enableSorting: false,
		cell: (info) =>
			info.getValue() ? (
				<BasicLink
					href={`/rwa/perps/asset-group/${rwaSlug(info.getValue())}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.getValue()}
				</BasicLink>
			) : (
				''
			),
		meta: {
			headerClassName: 'w-[136px]',
			headerHelperText: d.assetGroup.description
		}
	}),
	venueColumnHelper.accessor((row) => row.assetClass?.[0] ?? '', {
		id: 'assetClass',
		header: d.assetClass.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[176px]',
			headerHelperText: d.assetClass.description
		}
	}),
	venueColumnHelper.accessor((row) => row.category?.join(', ') ?? '', {
		id: 'category',
		header: d.category.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[132px]',
			headerHelperText: d.category.description
		}
	}),
	venueColumnHelper.accessor((row) => row.issuer ?? '', {
		id: 'issuer',
		header: d.issuer.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[96px]',
			headerHelperText: d.issuer.description
		}
	}),
	venueColumnHelper.accessor((row) => row.marginAsset, {
		id: 'marginAsset',
		header: d.marginAsset.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[132px]',
			headerHelperText: d.marginAsset.description
		}
	}),
	venueColumnHelper.accessor((row) => row.settlementAsset, {
		id: 'settlementAsset',
		header: d.settlementAsset.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[156px]',
			headerHelperText: d.settlementAsset.description
		}
	}),
	venueColumnHelper.accessor((row) => row.openInterest ?? undefined, {
		id: 'openInterest',
		header: d.openInterest.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[136px]',
			align: 'end',
			headerHelperText: d.openInterest.description
		}
	}),
	venueColumnHelper.accessor((row) => row.openInterestChange24h ?? undefined, {
		id: 'openInterestChange24h',
		header: d.openInterestChange24h.label,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			headerClassName: 'w-[148px]',
			align: 'end',
			headerHelperText: d.openInterestChange24h.description
		}
	}),
	venueColumnHelper.accessor((row) => row.volume24h ?? undefined, {
		id: 'volume24h',
		header: d.volume24h.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[126px]',
			align: 'end',
			headerHelperText: d.volume24h.description
		}
	}),
	venueColumnHelper.accessor((row) => row.volume24hChange24h ?? undefined, {
		id: 'volume24hChange24h',
		header: d.volume24hChange24h.label,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			headerClassName: 'w-[172px]',
			align: 'end',
			headerHelperText: d.volume24hChange24h.description
		}
	}),
	venueColumnHelper.accessor((row) => row.price ?? undefined, {
		id: 'price',
		header: d.price.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[88px]',
			align: 'end',
			headerHelperText: d.price.description
		}
	}),
	venueColumnHelper.accessor((row) => row.priceChange24h ?? undefined, {
		id: 'priceChange24h',
		header: d.priceChange24h.label,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			headerClassName: 'w-[156px]',
			align: 'end',
			headerHelperText: d.priceChange24h.description
		}
	}),
	venueColumnHelper.accessor((row) => (row.fundingRate == null ? undefined : row.fundingRate * 100), {
		id: 'fundingRate',
		header: d.fundingRate.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[min(180px,40vw)]',
			align: 'end',
			headerHelperText: d.fundingRate.description
		}
	}),
	venueColumnHelper.accessor((row) => (row.premium == null ? undefined : row.premium * 100), {
		id: 'premium',
		header: d.premium.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[108px]',
			align: 'end',
			headerHelperText: d.premium.description
		}
	}),
	venueColumnHelper.accessor((row) => row.maxLeverage ?? undefined, {
		id: 'maxLeverage',
		header: d.maxLeverage.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}x`,
		meta: {
			headerClassName: 'w-[128px]',
			align: 'end',
			headerHelperText: d.maxLeverage.description
		}
	}),
	venueColumnHelper.accessor((row) => row.rwaClassification ?? '', {
		id: 'rwaClassification',
		header: d.rwaClassification.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[170px]',
			headerHelperText: d.rwaClassification.description
		}
	}),
	venueColumnHelper.accessor((row) => row.oracleProvider ?? '', {
		id: 'oracleProvider',
		header: d.oracleProvider.label,
		enableSorting: false,
		meta: {
			headerClassName: 'w-[164px]',
			headerHelperText: d.oracleProvider.description
		}
	}),
	venueColumnHelper.accessor((row) => (row.makerFeeRate == null ? undefined : row.makerFeeRate * 100), {
		id: 'makerFeeRate',
		header: d.makerFeeRate.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[112px]',
			align: 'end',
			headerHelperText: d.makerFeeRate.description
		}
	}),
	venueColumnHelper.accessor((row) => (row.takerFeeRate == null ? undefined : row.takerFeeRate * 100), {
		id: 'takerFeeRate',
		header: d.takerFeeRate.label,
		cell: (info) => `${formattedNum(info.getValue(), false)}%`,
		meta: {
			headerClassName: 'w-[112px]',
			align: 'end',
			headerHelperText: d.takerFeeRate.description
		}
	}),
	venueColumnHelper.accessor((row) => row.cumulativeFunding ?? undefined, {
		id: 'cumulativeFunding',
		header: d.cumulativeFunding.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[168px]',
			align: 'end',
			headerHelperText: d.cumulativeFunding.description
		}
	}),
	venueColumnHelper.accessor((row) => row.estimatedProtocolFees24h ?? undefined, {
		id: 'estimatedProtocolFees24h',
		header: d.estimatedProtocolFees24h.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(188px,40vw)]',
			align: 'end',
			headerHelperText: d.estimatedProtocolFees24h.description
		}
	})
]

const assetGroupPriorityColumns = ['contract', 'venue', 'baseAsset', 'assetClass'] as const

const assetGroupColumns = [
	...assetGroupPriorityColumns.flatMap((columnId) => overviewColumns.filter((column) => column.id === columnId)),
	...overviewColumns.filter(
		(column) =>
			column.id !== 'baseAssetGroup' &&
			!assetGroupPriorityColumns.includes(column.id as (typeof assetGroupPriorityColumns)[number])
	)
]

const overviewColumnVisibility: VisibilityState = {
	category: false,
	parentPlatform: false,
	marginAsset: false,
	settlementAsset: false,
	oracleProvider: false,
	rwaClassification: false,
	makerFeeRate: false,
	takerFeeRate: false,
	deployerFeeShare: false,
	cumulativeFunding: false,
	oraclePx: false,
	midPx: false,
	prevDayPx: false,
	volume7d: false,
	volumeAllTime: false,
	estimatedProtocolFees7d: false,
	estimatedProtocolFees30d: false,
	estimatedProtocolFeesAllTime: false
}

const venueColumnVisibility: VisibilityState = {
	category: false,
	rwaClassification: false,
	oracleProvider: false,
	marginAsset: false,
	settlementAsset: false,
	cumulativeFunding: false,
	issuer: false
}

const assetGroupColumnVisibility: VisibilityState = {
	...overviewColumnVisibility,
	baseAssetGroup: false
}

function getLegendSeriesNames(seriesNames: string[]) {
	if (!seriesNames.includes('Total')) return seriesNames
	return ['Total', ...seriesNames.filter((name) => name !== 'Total')]
}

function getRWAPerpsBaseAssetOptions(markets: IRWAPerpsMarket[]) {
	const openInterestByBaseAsset = new Map<string, number>()

	for (const market of markets) {
		const label = getRWAPerpsBaseAssetBreakdownLabel(market)
		openInterestByBaseAsset.set(label, (openInterestByBaseAsset.get(label) ?? 0) + market.openInterest)
	}

	return [...openInterestByBaseAsset.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([label]) => label)
}

function getSelectedBaseAssets({
	allBaseAssets,
	includeQuery,
	excludeQuery
}: {
	allBaseAssets: string[]
	includeQuery: string | string[] | undefined
	excludeQuery: string | string[] | undefined
}) {
	const validSet = new Set(allBaseAssets)
	const excluded = parseExcludeParam(excludeQuery)
	const baseSelection = parseArrayParam(includeQuery, allBaseAssets, validSet)

	return excluded.size > 0 ? baseSelection.filter((baseAsset) => !excluded.has(baseAsset)) : baseSelection
}

function isRWAPerpsBaseAssetFilterActive(selectedBaseAssets: string[], allBaseAssets: string[]) {
	if (selectedBaseAssets.length !== allBaseAssets.length) return true

	const selectedSet = new Set(selectedBaseAssets)
	return allBaseAssets.some((baseAsset) => !selectedSet.has(baseAsset))
}

function getTimeSeriesBreakdownLabel({
	mode,
	row,
	breakdown
}: {
	mode: RWAPerpsChartMode
	row: IRWAPerpsMarket
	breakdown: RWAPerpsTimeSeriesBreakdownForMode
}) {
	if (mode === 'venue') {
		return getRWAPerpsVenueBreakdownLabel(row, breakdown as RWAPerpsVenueBreakdown)
	}

	return getRWAPerpsOverviewBreakdownLabel(row, breakdown as RWAPerpsOverviewBreakdown)
}

function getRWAPerpsTimeSeriesDatasetDimensions(source: RWAChartDataset['source']) {
	const latestValueBySeries = new Map<string, number>()

	for (let rowIndex = source.length - 1; rowIndex >= 0; rowIndex--) {
		const row = source[rowIndex]

		for (const series in row) {
			if (series === 'timestamp' || latestValueBySeries.has(series)) continue
			latestValueBySeries.set(series, row[series] ?? 0)
		}
	}

	return [
		'timestamp',
		...[...latestValueBySeries.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([series]) => series)
	]
}

export function buildRWAPerpsTimeSeriesDatasetForRows({
	dataset,
	rows,
	mode,
	breakdown
}: {
	dataset: RWAChartDataset
	rows: IRWAPerpsMarket[]
	mode: RWAPerpsChartMode
	breakdown: RWAPerpsTimeSeriesBreakdownForMode
}): RWAChartDataset {
	if (dataset.source.length === 0 || rows.length === 0) return EMPTY_DATASET

	const labelByContract = new Map<string, string>()

	for (const row of rows) {
		labelByContract.set(
			row.contract,
			getTimeSeriesBreakdownLabel({
				mode,
				row,
				breakdown
			})
		)
	}

	if (labelByContract.size === 0) return EMPTY_DATASET

	const source = dataset.source.map((row) => {
		const nextRow: RWAChartRow = { timestamp: row.timestamp }

		for (const [contract, label] of labelByContract) {
			const value = row[contract]
			if (value == null) continue

			nextRow[label] = (nextRow[label] ?? 0) + value
		}

		return nextRow
	})
	const dimensions = getRWAPerpsTimeSeriesDatasetDimensions(source)

	return dimensions.length > 1 ? { source, dimensions } : EMPTY_DATASET
}

export function buildRWAPerpsTimeSeriesCharts({
	metric,
	dimensions,
	timeSeriesMode
}: {
	metric: 'openInterest' | 'volume24h' | 'markets'
	dimensions: string[]
	timeSeriesMode: 'grouped' | 'breakdown'
}): Array<MultiSeriesChart2SeriesConfig> {
	const seriesType: MultiSeriesChart2SeriesConfig['type'] = metric === 'volume24h' ? 'bar' : 'line'
	const seriesKeys = dimensions.filter((dimension) => dimension !== 'timestamp')
	const hasTotalOverlay = timeSeriesMode === 'breakdown' && metric !== 'volume24h' && seriesKeys.includes('Total')
	const breakdownSeries = seriesKeys.filter((seriesName) => !(hasTotalOverlay && seriesName === 'Total'))

	return [
		...breakdownSeries.map((seriesName, index) => ({
			name: seriesName,
			type: seriesType,
			...(metric === 'volume24h' ? { stack: 'A' } : {}),
			encode: { x: 'timestamp', y: seriesName },
			color: CHART_COLORS[(index + (hasTotalOverlay ? 1 : 0)) % CHART_COLORS.length]
		})),
		...(hasTotalOverlay
			? [
					{
						name: 'Total',
						type: 'line' as const,
						encode: { x: 'timestamp', y: 'Total' },
						color: CHART_COLORS[0],
						hideAreaStyle: true,
						excludeFromTooltipTotal: true
					}
				]
			: [])
	]
}

const StatCard = ({
	label,
	tooltip,
	value,
	change,
	changeTooltip
}: {
	label: string
	tooltip?: string
	value: React.ReactNode
	change?: number | null
	changeTooltip?: string
}) => {
	const changeDecorationClass =
		change == null ? '' : change > 0 ? 'text-(--success)' : change < 0 ? 'text-(--error)' : 'text-(--text-secondary)'

	return (
		<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			{tooltip ? (
				<Tooltip content={tooltip} className="text-(--text-label) underline decoration-dotted">
					{label}
				</Tooltip>
			) : (
				<span className="text-(--text-label)">{label}</span>
			)}
			<span className="flex items-end justify-between gap-2 font-jetbrains">
				<span className="text-2xl font-medium">{value}</span>
				{change != null ? (
					changeTooltip ? (
						<Tooltip
							content={changeTooltip}
							className={`text-base underline decoration-current decoration-dotted ${changeDecorationClass}`}
						>
							<span>
								<PercentChange percent={change} fontWeight={500} />
							</span>
						</Tooltip>
					) : (
						<span className="text-base">
							<PercentChange percent={change} fontWeight={500} />
						</span>
					)
				) : null}
			</span>
		</p>
	)
}

function fetchOverviewTimeSeriesDataset(
	request: IRWAPerpsOverviewBreakdownRequest & { venue?: string; assetGroup?: string }
): Promise<RWAChartDataset> {
	const searchParams = new URLSearchParams({
		breakdown: request.breakdown,
		key: request.key
	})
	if (request.venue) searchParams.set('venue', request.venue)
	if (request.assetGroup) searchParams.set('assetGroup', request.assetGroup)
	if (request.assetClass) searchParams.set('assetClass', request.assetClass)
	if (request.excludeAssetClass) searchParams.set('excludeAssetClass', request.excludeAssetClass)

	return fetchJson<RWAChartDataset>(`/api/public/rwa/perps/overview-breakdown?${searchParams.toString()}`)
}

function fetchContractTimeSeriesDataset(request: IRWAPerpsContractBreakdownRequest): Promise<RWAChartDataset> {
	const searchParams = new URLSearchParams({
		key: request.key
	})
	if (request.venue) searchParams.set('venue', request.venue)
	if (request.assetGroup) searchParams.set('assetGroup', request.assetGroup)
	if (request.assetClass) searchParams.set('assetClass', request.assetClass)
	if (request.excludeAssetClass) searchParams.set('excludeAssetClass', request.excludeAssetClass)

	return fetchJson<RWAChartDataset>(`/api/public/rwa/perps/contract-breakdown?${searchParams.toString()}`)
}

export function RWAPerpsDashboard(props: RWAPerpsDashboardProps) {
	const router = useRouter()
	const chartDefaults = { timeSeriesBreakdown: props.defaultTimeSeriesBreakdown }
	const chartState = parseRWAPerpsChartState(router.query, props.mode, chartDefaults)
	const chartMetricLabel = getRWAPerpsChartMetricLabel(chartState.metric, d)
	const chartMetricOptions = getRWAPerpsChartMetricOptions(d)
	const chartViewOptions = getRWAPerpsChartViewOptions()
	const chartBreakdownOptions = getRWAPerpsChartBreakdownOptions({ ...chartState, labels: d })
	const timeSeriesBreakdownOptions =
		chartState.view === 'timeSeries'
			? ([{ key: 'total', name: 'Total' }, ...chartBreakdownOptions] as const)
			: chartBreakdownOptions
	const showBreakdownSelect = chartBreakdownOptions.length > 1
	const treemapBreakdown = chartState.breakdown as
		| RWAPerpsOverviewTreemapBreakdown
		| RWAPerpsVenueTreemapBreakdown
		| RWAPerpsAssetGroupTreemapBreakdown
	const treemapNestedByOptions = getRWAPerpsTreemapNestedByOptions(props.mode, treemapBreakdown, d)
	const showTreemapNestedBySelect = chartState.view === 'treemap' && treemapNestedByOptions.length > 1
	const treemapNestedByLabel = getRWAPerpsTreemapNestedByLabel(chartState.treemapNestedBy, d)
	const breakdownLabel =
		chartState.view === 'timeSeries' && chartState.timeSeriesMode === 'grouped'
			? 'Total'
			: getRWAPerpsBreakdownLabel(chartState.breakdown, d)
	const isOverviewMode = props.mode === 'overview'
	const isVenueMode = props.mode === 'venue'
	const isAssetGroupMode = props.mode === 'assetGroup'
	const assetClassFilter = props.assetClassFilter
	const showForexToggle = isOverviewMode && assetClassFilter == null
	const includeForex = showForexToggle ? isTrueQueryParam(router.query.includeForex) : true
	const rowsBeforeBaseAssetFilter = useMemo(() => {
		if (assetClassFilter != null) {
			return props.data.markets.filter((market) => market.assetClass?.[0] === assetClassFilter)
		}
		if (showForexToggle && !includeForex) {
			return props.data.markets.filter((market) => market.assetClass?.[0] !== FOREX_ASSET_CLASS)
		}
		return props.data.markets
	}, [assetClassFilter, includeForex, props.data.markets, showForexToggle])
	const baseAssetQuery = router.query[BASE_ASSET_QUERY_KEY]
	const excludeBaseAssetQuery = router.query[EXCLUDE_BASE_ASSET_QUERY_KEY]
	const baseAssetOptions = useMemo(
		() => getRWAPerpsBaseAssetOptions(rowsBeforeBaseAssetFilter),
		[rowsBeforeBaseAssetFilter]
	)
	const selectedBaseAssets = useMemo(
		() =>
			getSelectedBaseAssets({
				allBaseAssets: baseAssetOptions,
				includeQuery: baseAssetQuery,
				excludeQuery: excludeBaseAssetQuery
			}),
		[baseAssetOptions, baseAssetQuery, excludeBaseAssetQuery]
	)
	const isBaseAssetFilterActive = isRWAPerpsBaseAssetFilterActive(selectedBaseAssets, baseAssetOptions)
	const currentRows = useMemo(() => {
		if (!isBaseAssetFilterActive) return rowsBeforeBaseAssetFilter

		const selectedBaseAssetsSet = new Set(selectedBaseAssets)
		return rowsBeforeBaseAssetFilter.filter((market) =>
			selectedBaseAssetsSet.has(getRWAPerpsBaseAssetBreakdownLabel(market))
		)
	}, [isBaseAssetFilterActive, rowsBeforeBaseAssetFilter, selectedBaseAssets])
	const isRowsFiltered = currentRows !== props.data.markets
	const showBaseAssetFilter = baseAssetOptions.length > 1 || isBaseAssetFilterActive
	const showFilters = showForexToggle || showBaseAssetFilter
	const computedTotals = useMemo(
		() =>
			isRowsFiltered
				? {
						openInterest: sumMarketMetric(currentRows, 'openInterest'),
						openInterestChange24h: getAggregateOpenInterestChange24h(currentRows),
						volume24h: sumMarketMetric(currentRows, 'volume24h'),
						volume24hChange24h: getAggregateVolume24hChange24h(currentRows),
						markets: currentRows.length,
						protocolFees24h: sumProtocolFees24h(currentRows)
					}
				: null,
		[currentRows, isRowsFiltered]
	)
	const displayTotals = computedTotals ?? props.data.totals
	const timeSeriesAssetClass = assetClassFilter
	const timeSeriesExcludeAssetClass = showForexToggle && !includeForex ? FOREX_ASSET_CLASS : undefined
	const timeSeriesBaseAssets = isBaseAssetFilterActive ? selectedBaseAssets : undefined
	const onToggleIncludeForex = () => {
		void pushShallowQuery(router, { includeForex: includeForex ? undefined : 'true' })
	}
	const initialChartDataset = props.data.initialChartDataset
	const venueLabel = isVenueMode ? props.data.venue : undefined
	const targetQueryValue = isVenueMode ? props.data.venue : isAssetGroupMode ? props.data.assetGroup : 'all'
	const isDefaultTimeSeriesState =
		chartState.view === 'timeSeries' &&
		chartState.metric === 'openInterest' &&
		chartState.breakdown === getDefaultRWAPerpsChartBreakdown(props.mode, 'timeSeries', chartDefaults)
	const hasPreloadedTimeSeriesDataset =
		initialChartDataset.source.length > 0 ||
		initialChartDataset.dimensions.some((dimension) => dimension !== 'timestamp')
	const canUseInitialTimeSeriesDataset = !isBaseAssetFilterActive && (!showForexToggle || !includeForex)
	const shouldUseInitialTimeSeriesDataset =
		isDefaultTimeSeriesState && hasPreloadedTimeSeriesDataset && canUseInitialTimeSeriesDataset
	const shouldUseContractTimeSeriesDataset = isBaseAssetFilterActive || chartState.breakdown === 'contract'

	const timeSeriesQuery = useQuery({
		queryKey: [
			'rwa-perps-chart',
			props.mode,
			chartState.metric,
			chartState.breakdown,
			targetQueryValue,
			timeSeriesAssetClass,
			timeSeriesExcludeAssetClass,
			timeSeriesBaseAssets
		],
		queryFn: () =>
			shouldUseContractTimeSeriesDataset
				? fetchContractTimeSeriesDataset({
						key: chartState.metric,
						...(isVenueMode ? { venue: props.data.venue } : {}),
						...(isAssetGroupMode ? { assetGroup: props.data.assetGroup } : {}),
						...(timeSeriesAssetClass ? { assetClass: timeSeriesAssetClass } : {}),
						...(timeSeriesExcludeAssetClass ? { excludeAssetClass: timeSeriesExcludeAssetClass } : {})
					})
				: fetchOverviewTimeSeriesDataset({
						breakdown: chartState.breakdown as IRWAPerpsOverviewBreakdownRequest['breakdown'],
						key: chartState.metric,
						...(isVenueMode ? { venue: props.data.venue } : {}),
						...(isAssetGroupMode ? { assetGroup: props.data.assetGroup } : {}),
						...(timeSeriesAssetClass ? { assetClass: timeSeriesAssetClass } : {}),
						...(timeSeriesExcludeAssetClass ? { excludeAssetClass: timeSeriesExcludeAssetClass } : {})
					}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: chartState.view === 'timeSeries' && !shouldUseInitialTimeSeriesDataset && currentRows.length > 0
	})

	const fetchedTimeSeriesDataset =
		chartState.view === 'timeSeries' && shouldUseInitialTimeSeriesDataset
			? initialChartDataset
			: (timeSeriesQuery.data ?? EMPTY_DATASET)
	const rawTimeSeriesDataset = isBaseAssetFilterActive
		? buildRWAPerpsTimeSeriesDatasetForRows({
				dataset: fetchedTimeSeriesDataset,
				rows: currentRows,
				mode: props.mode,
				breakdown: chartState.breakdown as RWAPerpsTimeSeriesBreakdownForMode
			})
		: fetchedTimeSeriesDataset
	const shouldShowTotalOverlay = chartState.timeSeriesMode === 'breakdown' && chartState.metric !== 'volume24h'
	const selectedTimeSeriesDataset =
		chartState.timeSeriesMode === 'grouped'
			? groupRWAPerpsTimeSeriesDataset(rawTimeSeriesDataset)
			: shouldShowTotalOverlay
				? appendRWAPerpsTimeSeriesDatasetTotal(rawTimeSeriesDataset)
				: rawTimeSeriesDataset

	const timeSeriesCharts = buildRWAPerpsTimeSeriesCharts({
		metric: chartState.metric,
		dimensions: selectedTimeSeriesDataset.dimensions,
		timeSeriesMode: chartState.timeSeriesMode
	})
	const timeSeriesLegendNames = useMemo(
		() => getLegendSeriesNames(timeSeriesCharts.map((series) => series.name)),
		[timeSeriesCharts]
	)

	const snapshotBreakdownRows = useMemo(
		() =>
			props.mode === 'overview'
				? buildRWAPerpsOverviewSnapshotBreakdownTotals({
						rows: currentRows,
						breakdown: chartState.breakdown as RWAPerpsOverviewSnapshotBreakdown,
						key: chartState.metric
					})
				: props.mode === 'venue'
					? buildRWAPerpsVenueSnapshotBreakdownTotals({
							rows: currentRows,
							breakdown: chartState.breakdown as RWAPerpsVenueSnapshotBreakdown,
							key: chartState.metric
						})
					: buildRWAPerpsAssetGroupSnapshotBreakdownTotals({
							rows: currentRows,
							breakdown: chartState.breakdown as RWAPerpsAssetGroupSnapshotBreakdown,
							key: chartState.metric
						}),
		[chartState.breakdown, chartState.metric, currentRows, props.mode]
	)

	const pieChartData = useMemo(
		() => preparePieChartData({ data: snapshotBreakdownRows, limit: 10 }),
		[snapshotBreakdownRows]
	)
	const deferredPieChartData = useDeferredValue(pieChartData)
	const deferredTimeSeriesDataset = useDeferredValue(selectedTimeSeriesDataset)
	const hasTimeSeriesHistory = useMemo(
		() => hasEnoughTimeSeriesHistory(deferredTimeSeriesDataset),
		[deferredTimeSeriesDataset]
	)
	const pieChartColors = useMemo(() => {
		const colorMap: Record<string, string> = {}
		for (const [index, item] of deferredPieChartData.entries()) {
			colorMap[item.name] = CHART_COLORS[index % CHART_COLORS.length]
		}
		return colorMap
	}, [deferredPieChartData])

	const barChartData = useMemo(() => {
		let othersValue = 0
		const sorted = [...deferredPieChartData].filter((item) => Number.isFinite(item.value) && item.value > 0)
		for (const item of sorted) {
			if (item.name === 'Others') {
				othersValue += item.value
			}
		}

		const withoutOthers = sorted.filter((item) => item.name !== 'Others')
		if (withoutOthers.length <= MAX_HORIZONTAL_BARS - (othersValue > 0 ? 1 : 0)) {
			return othersValue > 0 ? [...withoutOthers, { name: 'Others', value: othersValue }] : withoutOthers
		}

		const limited = withoutOthers.slice(0, MAX_HORIZONTAL_BARS - 1)
		const overflowValue =
			withoutOthers.slice(MAX_HORIZONTAL_BARS - 1).reduce((sum, item) => sum + item.value, 0) + othersValue
		return overflowValue > 0 ? [...limited, { name: 'Others', value: overflowValue }] : limited
	}, [deferredPieChartData])

	const treemapTreeData = useMemo(
		() =>
			buildRWAPerpsTreemapTreeData({
				mode: props.mode,
				markets: currentRows,
				metric: chartState.metric,
				parentGrouping: treemapBreakdown,
				nestedBy: chartState.treemapNestedBy,
				venueLabel
			}),
		[chartState.metric, chartState.treemapNestedBy, currentRows, props.mode, treemapBreakdown, venueLabel]
	)
	const { chartInstance: timeSeriesChartInstance, handleChartReady: handleTimeSeriesChartReady } = useGetChartInstance()
	const { chartInstance: pieChartInstance, handleChartReady: handlePieChartReady } = useGetChartInstance()
	const { chartInstance: barChartInstance, handleChartReady: handleBarChartReady } = useGetChartInstance()
	const { chartInstance: treemapChartInstance, handleChartReady: handleTreemapChartReady } = useGetChartInstance()

	const nonTimeSeriesChartInstance =
		chartState.view === 'treemap'
			? treemapChartInstance
			: chartState.view === 'hbar'
				? barChartInstance
				: pieChartInstance
	const treemapValueLabel = chartState.metric === 'volume24h' ? 'Daily Volume' : chartMetricLabel
	const valueSymbol = chartState.metric === 'markets' ? '' : '$'
	const pageLabel = isOverviewMode
		? 'RWA Perps'
		: isVenueMode
			? `${props.data.venue} RWA Perps`
			: `${props.data.assetGroup} RWA Perps`
	const filenameBase = isOverviewMode
		? 'rwa-perps-overview'
		: isVenueMode
			? `rwa-perps-venue-${props.data.venue}`
			: `rwa-perps-asset-group-${props.data.assetGroup}`
	const timeSeriesFilename = `${filenameBase}-time-series-${chartState.metric}-${chartState.breakdown}-${chartState.timeSeriesMode}`
	const nonTimeSeriesFilename = `${filenameBase}-${chartState.view}-${chartState.metric}-${chartState.breakdown}`

	const onSelectView = (value: string | string[]) => {
		const selectedView = (Array.isArray(value) ? value[0] : value) as typeof chartState.view
		const nextState = setRWAPerpsChartView(chartState, selectedView)
		void pushShallowQuery(router, {
			chartView: getRWAPerpsChartViewQueryValueForMode(props.mode, nextState.view),
			timeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? getRWAPerpsChartBreakdownQueryValue(nextState, chartDefaults) : undefined,
			nonTimeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? undefined : getRWAPerpsChartBreakdownQueryValue(nextState, chartDefaults)
		})
	}

	const onSelectBreakdown = (value: string | string[]) => {
		const selectedBreakdown = Array.isArray(value) ? value[0] : value
		if (chartState.view === 'timeSeries') {
			if (selectedBreakdown === 'total') {
				const nextState = setRWAPerpsTimeSeriesMode(chartState, 'grouped')
				void pushShallowQuery(router, {
					timeSeriesChartBreakdown: getRWAPerpsChartBreakdownQueryValue(nextState, chartDefaults),
					timeSeriesMode: getRWAPerpsTimeSeriesModeQueryValue(nextState.timeSeriesMode)
				})
				return
			}

			const nextState = setRWAPerpsTimeSeriesMode(
				setRWAPerpsChartBreakdown(chartState, selectedBreakdown as typeof chartState.breakdown),
				'breakdown'
			)
			void pushShallowQuery(router, {
				timeSeriesChartBreakdown: getRWAPerpsChartBreakdownQueryValue(nextState, chartDefaults),
				timeSeriesMode: getRWAPerpsTimeSeriesModeQueryValue(nextState.timeSeriesMode)
			})
			return
		}

		const nextState = setRWAPerpsChartBreakdown(chartState, selectedBreakdown as typeof chartState.breakdown)
		void pushShallowQuery(router, {
			timeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? getRWAPerpsChartBreakdownQueryValue(nextState, chartDefaults) : undefined,
			nonTimeSeriesChartBreakdown:
				nextState.view === 'timeSeries' ? undefined : getRWAPerpsChartBreakdownQueryValue(nextState, chartDefaults)
		})
	}

	const onSelectTreemapNestedBy = (value: string | string[]) => {
		const selectedNestedBy = (Array.isArray(value) ? value[0] : value) as typeof chartState.treemapNestedBy
		const nextState = setRWAPerpsTreemapNestedBy(chartState, selectedNestedBy)
		void pushShallowQuery(router, {
			treemapNestedBy: getRWAPerpsTreemapNestedByQueryValue(nextState)
		})
	}

	const timeSeriesMetricSwitch = (
		<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
			{chartMetricOptions.map(({ key, name }) => (
				<button
					key={`rwa-perps-chart-metric-${key}`}
					className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
					data-active={chartState.metric === key}
					onClick={() => {
						void pushShallowQuery(router, {
							chartType: getRWAPerpsChartMetricQueryValue(key)
						})
					}}
				>
					{name}
				</button>
			))}
		</div>
	)

	const statCards = isOverviewMode
		? [
				{
					label: d.totalOpenInterest.label,
					tooltip: d.totalOpenInterest.description,
					value: formattedNum(displayTotals.openInterest, true),
					change: displayTotals.openInterestChange24h,
					changeTooltip: d.openInterestChange24h.description
				},
				{
					label: d.totalVolume24h.label,
					tooltip: d.totalVolume24h.description,
					value: formattedNum(displayTotals.volume24h, true),
					change: displayTotals.volume24hChange24h,
					changeTooltip: d.volume24hChange24h.description
				},
				{
					label: d.totalMarkets.label,
					tooltip: d.totalMarkets.description,
					value: formattedNum(displayTotals.markets, false)
				},
				{
					label: d.estimatedProtocolFees24h.label,
					tooltip: d.estimatedProtocolFees24h.description,
					value: formattedNum(displayTotals.protocolFees24h, true)
				}
			]
		: [
				{
					label: d.openInterest.label,
					tooltip: d.openInterest.description,
					value: formattedNum(displayTotals.openInterest, true),
					change: displayTotals.openInterestChange24h,
					changeTooltip: d.openInterestChange24h.description
				},
				{
					label: d.volume24h.label,
					tooltip: d.volume24h.description,
					value: formattedNum(displayTotals.volume24h, true),
					change: displayTotals.volume24hChange24h,
					changeTooltip: d.volume24hChange24h.description
				},
				{
					label: d.markets.label,
					tooltip: d.markets.description,
					value: formattedNum(displayTotals.markets, false)
				},
				{
					label: d.estimatedProtocolFees24h.label,
					tooltip: d.estimatedProtocolFees24h.description,
					value: formattedNum(displayTotals.protocolFees24h, true)
				}
			]

	return (
		<div className="flex flex-col gap-2">
			{isVenueMode ? (
				<RowLinksWithDropdown links={props.data.venueLinks} activeLink={props.data.venue} />
			) : isAssetGroupMode ? (
				<RowLinksWithDropdown links={props.data.assetGroupLinks} activeLink={props.data.assetGroup} />
			) : null}
			{showForexToggle ? (
				<>
					<p className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 text-sm text-(--text-label) md:flex-row md:items-center md:justify-between">
						The RWA Perpetuals Dashboard only covers real world assets such as stocks, RWA tokens, forex, and other
						significant financial indices on decentralized exchanges. This excludes digital assets such as BTC or ETH
						perpetual contracts and all RWA perpetual contracts on centralized exchanges.
					</p>
				</>
			) : null}
			{showFilters ? (
				<div className="flex flex-wrap gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 text-sm text-(--text-label)">
					{showBaseAssetFilter ? (
						<SelectWithCombobox
							allValues={baseAssetOptions}
							selectedValues={selectedBaseAssets}
							includeQueryKey={BASE_ASSET_QUERY_KEY}
							excludeQueryKey={EXCLUDE_BASE_ASSET_QUERY_KEY}
							defaultSelectedValues={baseAssetOptions}
							label="Base Asset"
							labelType="smol"
							variant="filter"
							portal
						/>
					) : null}
					{showForexToggle ? (
						<Checkbox variant="filter" value="includeForex" checked={includeForex} onChange={onToggleIncludeForex}>
							Forex Perps
						</Checkbox>
					) : null}
				</div>
			) : null}
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				{statCards.map((card) => (
					<StatCard
						key={card.label}
						label={card.label}
						tooltip={card.tooltip}
						value={card.value}
						change={card.change}
						changeTooltip={card.changeTooltip}
					/>
				))}
			</div>
			{chartState.view === 'timeSeries' ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center justify-end gap-2 p-3">
						{timeSeriesMetricSwitch}
						<Select
							allValues={chartViewOptions}
							selectedValues={chartState.view}
							setSelectedValues={onSelectView}
							label={
								chartViewOptions.find((option) => option.key === chartState.view)?.name ?? chartViewOptions[0].name
							}
							labelType="none"
							variant="filter"
						/>
						{showBreakdownSelect ? (
							<Select
								allValues={timeSeriesBreakdownOptions}
								selectedValues={chartState.timeSeriesMode === 'grouped' ? 'total' : chartState.breakdown}
								setSelectedValues={onSelectBreakdown}
								label={breakdownLabel}
								labelType="none"
								variant="filter"
							/>
						) : null}
						<ChartExportButtons
							chartInstance={timeSeriesChartInstance}
							filename={timeSeriesFilename}
							title={`${pageLabel} ${chartMetricLabel}`}
							smol
						/>
					</div>
					{timeSeriesQuery.error ? (
						<p className="flex min-h-[360px] items-center justify-center text-xs text-(--error)">
							{getErrorMessage(timeSeriesQuery.error)}
						</p>
					) : timeSeriesQuery.isLoading && !shouldUseInitialTimeSeriesDataset ? (
						<p className="flex min-h-[360px] items-center justify-center gap-1">
							Loading
							<LoadingDots />
						</p>
					) : !hasTimeSeriesHistory ? (
						<p className="flex min-h-[360px] items-center justify-center text-sm text-(--text-secondary)">
							Only a single snapshot is available; time-series history is not available for this selection yet.
						</p>
					) : (
						<Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={deferredTimeSeriesDataset}
								charts={timeSeriesCharts}
								chartOptions={{ legend: { data: timeSeriesLegendNames } }}
								hideDefaultLegend={false}
								showTotalInTooltip={!deferredTimeSeriesDataset.dimensions.includes('Total')}
								valueSymbol={valueSymbol}
								onReady={handleTimeSeriesChartReady}
							/>
						</Suspense>
					)}
				</div>
			) : (
				<div
					className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) ${chartState.view === 'treemap' ? 'min-h-[652px]' : 'min-h-[412px]'}`}
				>
					<div className="flex flex-wrap items-center justify-end gap-2 p-3 pb-0">
						{timeSeriesMetricSwitch}
						<Select
							allValues={chartViewOptions}
							selectedValues={chartState.view}
							setSelectedValues={onSelectView}
							label={
								chartViewOptions.find((option) => option.key === chartState.view)?.name ?? chartViewOptions[0].name
							}
							labelType="none"
							variant="filter"
						/>
						{showBreakdownSelect ? (
							<Select
								allValues={chartBreakdownOptions}
								selectedValues={chartState.breakdown}
								setSelectedValues={onSelectBreakdown}
								label={breakdownLabel}
								labelType="none"
								variant="filter"
							/>
						) : null}
						{showTreemapNestedBySelect ? (
							<Select
								allValues={treemapNestedByOptions}
								selectedValues={chartState.treemapNestedBy}
								setSelectedValues={onSelectTreemapNestedBy}
								label={`Nested by: ${treemapNestedByLabel}`}
								labelType="none"
								variant="filter"
							/>
						) : null}
						{chartState.view === 'treemap' ? <ChartRestoreButton chartInstance={treemapChartInstance} /> : null}
						<ChartExportButtons
							chartInstance={nonTimeSeriesChartInstance}
							filename={nonTimeSeriesFilename}
							title={`${pageLabel} ${chartMetricLabel}`}
							smol
						/>
					</div>
					{snapshotBreakdownRows.length === 0 ? (
						<p className="flex min-h-[360px] items-center justify-center text-sm text-(--text-secondary)">
							No chart data available.
						</p>
					) : (
						<Suspense fallback={<div className={chartState.view === 'treemap' ? 'min-h-[600px]' : 'min-h-[360px]'} />}>
							{chartState.view === 'pie' ? (
								<PieChart
									chartData={deferredPieChartData}
									stackColors={pieChartColors}
									radius={PIE_CHART_RADIUS}
									onReady={handlePieChartReady}
									valueSymbol={valueSymbol}
								/>
							) : chartState.view === 'hbar' ? (
								<HBarChart
									categories={barChartData.map((item) => item.name)}
									values={barChartData.map((item) => item.value)}
									colors={barChartData.map((item) => pieChartColors[item.name] ?? CHART_COLORS[0])}
									valueSymbol={valueSymbol}
									onReady={handleBarChartReady}
								/>
							) : (
								<TreemapChart
									treeData={treemapTreeData}
									variant="rwa"
									height="600px"
									onReady={handleTreemapChartReady}
									valueLabel={treemapValueLabel}
									valueSymbol={valueSymbol}
								/>
							)}
						</Suspense>
					)}
				</div>
			)}
			<TableWithSearch
				data={currentRows}
				columns={isOverviewMode ? overviewColumns : isVenueMode ? venueColumns : assetGroupColumns}
				placeholder={
					isOverviewMode
						? 'Search markets or assets...'
						: isVenueMode
							? 'Search venue markets...'
							: 'Search asset-group markets...'
				}
				columnToSearch="contract"
				header={
					isOverviewMode ? 'Markets Rankings' : `${isVenueMode ? props.data.venue : props.data.assetGroup} Markets`
				}
				headingAs="h1"
				sortingState={[{ id: 'openInterest', desc: true }]}
				columnVisibility={
					isOverviewMode ? overviewColumnVisibility : isVenueMode ? venueColumnVisibility : assetGroupColumnVisibility
				}
				rowSize={56}
				compact
				showColumnSelect
				csvFileName={
					isOverviewMode
						? 'rwa-perps-overview-markets'
						: isVenueMode
							? `rwa-perps-${props.data.venue}-markets`
							: `rwa-perps-${props.data.assetGroup}-markets`
				}
			/>
		</div>
	)
}
