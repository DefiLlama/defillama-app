import { useQuery } from '@tanstack/react-query'
import { getPeggedAssetPageData } from '~/api/categories/stablecoins'
import { primaryColor } from '~/constants/colors'
import { PeggedAssetInfo } from '~/containers/PeggedContainer'

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

	return (
		<div className="flex flex-col gap-4 p-4">
			<PeggedAssetInfo {...data.props} backgroundColor={primaryColor} />
		</div>
	)
}
