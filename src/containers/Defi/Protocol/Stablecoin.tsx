import { useInView } from 'react-intersection-observer'
import styled from 'styled-components'
import useSWR from 'swr'
import { getPeggedAssetPageData } from '~/api/categories/stablecoins'
import { primaryColor } from '~/constants/colors'
import { PeggedAssetInfo } from '~/containers/PeggedContainer'

export const StablecoinInfo = ({ assetName }: { assetName: string }) => {
	const { ref, inView } = useInView({
		triggerOnce: true
	})

	const { data, error } = useSWR(`stablecoinInfo/${assetName}`, () => getPeggedAssetPageData(assetName))

	if (!data && !error) {
		return (
			<Wrapper>
				<p style={{ margin: '180px 0', textAlign: 'center' }}>Loading...</p>
			</Wrapper>
		)
	}

	if (!data) {
		return (
			<Wrapper>
				<p style={{ margin: '180px 0', textAlign: 'center' }}></p>
			</Wrapper>
		)
	}

	return (
		<Wrapper ref={ref} style={{ minHeight: '460px' }}>
			{inView && <PeggedAssetInfo {...data.props} backgroundColor={primaryColor} />}
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
