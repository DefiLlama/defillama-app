import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { getPeggedAssetPageData } from '~/api/categories/stablecoins'
import { primaryColor } from '~/constants/colors'
import { PeggedAssetInfo } from '~/containers/PeggedContainer'

export const StablecoinInfo = ({ assetName }: { assetName: string }) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['stablecoin-info', assetName],
		queryFn: () => getPeggedAssetPageData(assetName)
	})

	if (isLoading) {
		return (
			<Wrapper>
				<p style={{ margin: '180px 0', textAlign: 'center' }}>Loading...</p>
			</Wrapper>
		)
	}

	if (!data) {
		return (
			<Wrapper>
				<p style={{ margin: '180px 0', textAlign: 'center' }}>{error?.message ?? 'Failed to fetch'}</p>
			</Wrapper>
		)
	}

	return (
		<Wrapper>
			<PeggedAssetInfo {...data.props} backgroundColor={primaryColor} />
		</Wrapper>
	)
}

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px;
	max-width: calc(100vw - 32px);

	& > * {
		@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
			max-width: calc(100vw - 276px - 66px) !important;
		}
	}
`
