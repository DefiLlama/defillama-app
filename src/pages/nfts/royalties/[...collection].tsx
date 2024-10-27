import { getNFTRoyaltyHistory } from '~/api/categories/nfts'
import Layout from '~/layout'
import { StatsSection } from '~/layout/Stats/Medium'
import { DetailsWrapper, Name } from '~/layout/ProtocolAndPool'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { Stat } from '~/layout/Stats/Large'
import { formattedNum } from '~/utils'
import { ProtocolChart } from '~/containers/DexsAndFees/charts/ProtocolChart'
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
			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={props.logo} size={48} />
						<FormattedName text={props.name} fontWeight={700} />
					</Name>

					<Stat>
						<span>30d royalty earnings</span>
						<span>{formattedNum(props.total30d, true)}</span>
					</Stat>

					<Stat>
						<span>Lifetime royalty earnings</span>
						<span>{formattedNum(props.totalAllTime, true)}</span>
					</Stat>
				</DetailsWrapper>

				<ProtocolChart
					logo={props.logo}
					data={props as any}
					chartData={[props.totalDataChart.map((t) => ({ date: t[0], royalties: t[1] })), ['royalties']]}
					name={props.name}
					type={'Fees'}
					fullChart={true}
				/>
			</StatsSection>
		</Layout>
	)
}
