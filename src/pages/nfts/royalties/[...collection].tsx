import { getNFTRoyaltyHistory } from '~/api/categories/nfts'
import Layout from '~/layout'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import { formattedNum } from '~/utils'
import { ProtocolChart } from '~/containers/DimensionAdapters/charts/ProtocolChart'
import { LocalLoader } from '~/components/LocalLoader'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'

export default function Collection() {
	const router = useRouter()
	const { data: collectionData, isLoading: fetchingData } = useQuery({
		queryKey: ['collection-data', router.query.collection],
		queryFn: () =>
			getNFTRoyaltyHistory(
				typeof router.query.collection === 'string' ? router.query.collection : router.query.collection[0]
			),
		staleTime: 60 * 60 * 1000
	})

	if (fetchingData) {
		return (
			<Layout title={'NFT Royalties - DefiLlama'}>
				<div className="flex items-center justify-center m-auto min-h-[360px]">
					<LocalLoader />
				</div>
			</Layout>
		)
	}

	const props = collectionData.royaltyHistory[0]

	return (
		<Layout title={props.name + ' Royalties - DefiLlama'}>
			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] gap-1">
				<div className="flex flex-col gap-6 p-5 col-span-1 w-full xl:w-[380px] bg-[var(--cards-bg)] rounded-md overflow-x-auto">
					<h1 className="flex items-center gap-2 text-xl">
						<TokenLogo logo={props.logo} size={48} />
						<FormattedName text={props.name} fontWeight={700} />
					</h1>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">30d royalty earnings</span>
						<span className="font-jetbrains font-semibold text-2xl">{formattedNum(props.total30d, true)}</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Lifetime royalty earnings</span>
						<span className="font-jetbrains font-semibold text-2xl">{formattedNum(props.totalAllTime, true)}</span>
					</p>
				</div>

				<ProtocolChart
					logo={props.logo}
					data={props as any}
					chartData={[props.totalDataChart.map((t) => ({ date: t[0], royalties: t[1] })), ['royalties']]}
					name={props.name}
					type={'Fees'}
					fullChart={true}
				/>
			</div>
		</Layout>
	)
}
