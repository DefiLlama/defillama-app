import { useQuery } from '@tanstack/react-query'
import { primaryColor } from '~/constants/colors'
import { getPeggedAssetPageData } from '~/containers/Stablecoins/queries.server'
import { PeggedAssetInfo } from '~/containers/Stablecoins/StablecoinOverview'

export const StablecoinInfo = ({ assetName }: { assetName: string }) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['stablecoin-info', assetName],
		queryFn: () => getPeggedAssetPageData(assetName),
		staleTime: 60 * 60 * 1000
	})

	if (isLoading) {
		return <p className="my-[180px] text-center">Loading...</p>
	}

	if (!data) {
		return <p className="my-[180px] text-center">{error instanceof Error ? error.message : 'Failed to fetch'}</p>
	}

	return <PeggedAssetInfo {...data.props} backgroundColor={primaryColor} />
}
