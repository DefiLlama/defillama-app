import { maxAgeForNext } from '~/api'
import { getProtocolEmissons } from '~/api/categories/protocols'
import { Emissions } from '~/containers/Defi/Protocol/Emissions'
import * as React from 'react'
import { Name } from '~/layout/ProtocolAndPool'
import Layout from '~/layout'
import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'
import { capitalizeFirstLetter } from '~/utils'

export const getStaticProps = async ({
	params: {
		protocol: [protocol]
	}
}) => {
	const emissions = await getProtocolEmissons(protocol)

	return {
		props: {
			emissions,
			name: protocol
				.split(' ')
				.map((x) => capitalizeFirstLetter(x))
				.join(' ')
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ emissions, name }) {
	return (
		<Layout title={`${name} Emissions - DefiLlama`} style={{ gap: '36px' }} defaultSEO>
			<Wrapper>
				<Name>{name + ' ' + 'Emissions'}</Name>

				<Emissions
					data={emissions.data}
					categories={emissions.categories}
					hallmarks={emissions.hallmarks}
					isEmissionsPage
				/>
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
