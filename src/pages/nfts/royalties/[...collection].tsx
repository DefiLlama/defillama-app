import { lazy, Suspense, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import { getNFTRoyaltyHistory } from '~/api/categories/nfts'
import { formatBarChart } from '~/components/ECharts/utils'
import { FormattedName } from '~/components/FormattedName'
import { LocalLoader } from '~/components/Loaders'
import { TokenLogo } from '~/components/TokenLogo'
import { CHART_COLORS } from '~/constants/colors'
import Layout from '~/layout'
import { formattedNum } from '~/utils'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart'))

export default function Collection() {
	const router = useRouter()
	const {
		data: collectionData,
		isLoading: fetchingData,
		error
	} = useQuery({
		queryKey: ['collection-data', router.query.collection],
		queryFn: () =>
			getNFTRoyaltyHistory(
				typeof router.query.collection === 'string' ? router.query.collection : router.query.collection[0]
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const chartData = useMemo(() => {
		if (!collectionData)
			return {
				Earnings: {
					name: 'Earnings',
					stack: 'Earnings',
					type: 'bar' as const,
					data: [],
					color: CHART_COLORS[0]
				}
			}
		return {
			Earnings: {
				name: 'Earnings',
				stack: 'Earnings',
				type: 'bar' as const,
				data: formatBarChart({
					data: collectionData.royaltyHistory[0].totalDataChart,
					groupBy: 'daily',
					denominationPriceHistory: null,
					dateInMs: false
				}),
				color: CHART_COLORS[0]
			}
		}
	}, [collectionData])

	if (fetchingData) {
		return (
			<Layout
				title={'NFT Royalties - DefiLlama'}
				description={`NFT Royalties by Collection. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
				keywords=""
				canonicalUrl={`/nfts/royalties/${router.query.collection}`}
			>
				<div className="m-auto flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			</Layout>
		)
	}

	if (error || !collectionData) {
		return (
			<Layout
				title={'NFT Royalties - DefiLlama'}
				description={`NFT Royalties by Collection. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
				keywords=""
				canonicalUrl={`/nfts/royalties/${router.query.collection}`}
			>
				<div className="m-auto flex min-h-[360px] items-center justify-center">
					<p className="text-center">{error?.message ?? 'Failed to fetch'}</p>
				</div>
			</Layout>
		)
	}

	const props = collectionData.royaltyHistory[0]

	return (
		<Layout
			title={props.name + ' Royalties - DefiLlama'}
			description={`NFT Royalties by Collection. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords=""
			canonicalUrl={`/nfts/royalties/${router.query.collection}`}
		>
			<div className="relative isolate grid grid-cols-2 gap-2 *:last:col-span-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="flex items-center gap-2 text-xl">
						<TokenLogo logo={props.logo} fallbackLogo={props.fallbackLogo} size={48} />
						<FormattedName text={props.name} fontWeight={700} />
					</h1>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">30d royalty earnings</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(props.total30d, true)}</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Lifetime royalty earnings</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(props.totalAllTime, true)}</span>
					</p>
				</div>

				<Suspense fallback={<div className="min-h-[360px]" />}>
					<LineAndBarChart charts={chartData} valueSymbol="$" />
				</Suspense>
			</div>
		</Layout>
	)
}
