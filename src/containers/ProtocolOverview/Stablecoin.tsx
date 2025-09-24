import { useQuery } from '@tanstack/react-query'
import { LocalLoader } from '~/components/Loaders'
import { getPeggedAssetPageData } from '~/containers/Stablecoins/queries.server'
import { PeggedAssetInfo } from '~/containers/Stablecoins/StablecoinOverview'

export const StablecoinInfo = ({ assetName }: { assetName: string }) => {
	if (assetName == "usdt") assetName = "tether";
	if (assetName == "usdc") assetName = 'usd-coin';
	const { data, isLoading, error } = useQuery({
		queryKey: ['stablecoin-info', assetName],
		queryFn: () => getPeggedAssetPageData(assetName),
		staleTime: 60 * 60 * 1000
	})

	if (isLoading) {
		return (
			<div className="flex min-h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (!data) {
		return (
			<div className="flex min-h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p>{error instanceof Error ? error.message : 'Failed to fetch'}</p>
			</div>
		)
	}

	return <PeggedAssetInfo {...data.props} />
}
