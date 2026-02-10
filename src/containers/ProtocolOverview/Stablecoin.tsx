import { PeggedAssetInfo } from '~/containers/Stablecoins/StablecoinOverview'

export const StablecoinInfo = ({ data }: { data: React.ComponentProps<typeof PeggedAssetInfo> | null }) => {
	if (!data) {
		return (
			<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<p>Failed to fetch</p>
			</div>
		)
	}

	return <PeggedAssetInfo {...data} />
}
