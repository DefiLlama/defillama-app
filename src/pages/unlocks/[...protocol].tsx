import { maxAgeForNext } from '~/api'
import { getProtocolEmissons } from '~/api/categories/protocols'
import { Emissions } from '~/containers/Defi/Protocol/Emissions'
import * as React from 'react'
import { Name } from '~/layout/ProtocolAndPool'
import Layout from '~/layout'
import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'
import TokenLogo from '~/components/TokenLogo'
import { tokenIconUrl } from '~/utils'

export const getStaticProps = async ({
	params: {
		protocol: [protocol]
	}
}) => {
	const emissions = await getProtocolEmissons(protocol)

	return {
		props: {
			emissions
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocol({ emissions }) {
	return (
		<Layout title={`${emissions.name} Unlocks - DefiLlama`} style={{ gap: '36px' }} defaultSEO>
			<Wrapper>
				<Name>
					<TokenLogo logo={tokenIconUrl(emissions.name)} />
					<span>{emissions.name}</span>
				</Name>
				<Emissions data={emissions} isEmissionsPage />
			</Wrapper>
		</Layout>
	)
}

export const Wrapper = styled(StatsSection)`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
`
