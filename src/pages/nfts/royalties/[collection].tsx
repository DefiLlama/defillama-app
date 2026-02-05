import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { lazy, Suspense } from 'react'
import { FormattedName } from '~/components/FormattedName'
import { LocalLoader } from '~/components/Loaders'
import { TokenLogo } from '~/components/TokenLogo'
import { getNFTRoyaltyHistory } from '~/containers/Nft/queries'
import Layout from '~/layout'
import { formattedNum } from '~/utils'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export default function Collection() {
	const router = useRouter()
	const collection =
		typeof router.query.collection === 'string'
			? router.query.collection
			: Array.isArray(router.query.collection)
				? router.query.collection[0]
				: undefined

	const {
		data: collectionData,
		isLoading: fetchingData,
		error
	} = useQuery({
		queryKey: ['collection-data', collection],
		queryFn: () => (collection ? getNFTRoyaltyHistory(collection) : null),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!collection
	})

	const chartData = collectionData?.royaltyHistory?.[0]?.earningsChart ?? {
		dataset: { source: [], dimensions: ['timestamp', 'Earnings'] },
		charts: []
	}

	if (fetchingData) {
		return (
			<Layout
				title={'NFT Royalties - DefiLlama'}
				description={`NFT Royalties by Collection. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
				keywords=""
				canonicalUrl={collection ? `/nfts/royalties/${collection}` : `/nfts/royalties`}
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
				canonicalUrl={collection ? `/nfts/royalties/${collection}` : `/nfts/royalties`}
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
			canonicalUrl={collection ? `/nfts/royalties/${collection}` : `/nfts/royalties`}
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

				<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<Suspense fallback={<></>}>
						<MultiSeriesChart2
							dataset={chartData.dataset}
							charts={chartData.charts}
							valueSymbol="$"
							shouldEnableImageExport
							shouldEnableCSVDownload
						/>
					</Suspense>
				</div>
			</div>
		</Layout>
	)
}
