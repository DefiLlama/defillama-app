import * as React from 'react'
import Link from 'next/link'
import { Button, Name } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { FormattedName } from '~/components/FormattedName'
import { TokenLogo } from '~/components/TokenLogo'
import { transparentize } from 'polished'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { SEO } from '~/components/SEO'
import { standardizeProtocolName, tokenIconUrl } from '~/utils'
import styled from 'styled-components'
import { Treasury } from './Treasury'
import { ProtocolFeesRevenueVolumeCharts } from './Fees'
import { OtherProtocols, ProtocolLink } from './Common'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'

export function DummyProtocol({ data, title, backgroundColor, protocol }) {
	const router = useRouter()

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO cardName={data.name} token={data.name} logo={tokenIconUrl(data.name)} />

			<ProtocolsChainsSearch step={{ category: 'Protocols', name: data.name }} />

			<Wrapper>
				{data?.otherProtocols?.length > 1 && (
					<OtherProtocols style={{ margin: '-24px -24px -12px' }}>
						{data.otherProtocols.map((p) => (
							<Link href={`/protocol/${standardizeProtocolName(p)}`} key={p} passHref>
								<ProtocolLink
									active={router.asPath === `/protocol/${standardizeProtocolName(p)}`}
									color={backgroundColor}
								>
									{p}
								</ProtocolLink>
							</Link>
						))}
					</OtherProtocols>
				)}

				<Name>
					<TokenLogo logo={data.logo} size={24} />
					<FormattedName text={data.name} maxCharacters={16} fontWeight={700} />
				</Name>

				{data.description && <p>{data.description}</p>}

				<div className=" flex items-center flex-wrap gap-4">
					{data.url && (
						<Link href={data.url} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
							</Button>
						</Link>
					)}

					{data.twitter && (
						<Link href={`https://twitter.com/${data.twitter}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
							</Button>
						</Link>
					)}

					{data.treasury && (
						<Link
							href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/treasury/${data.treasury}`}
							passHref
						>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Methodology</span>
								<Icon name="arrow-up-right" height={14} width={14} />
							</Button>
						</Link>
					)}
				</div>

				{data.treasury && <Treasury protocolName={protocol} />}

				<ProtocolFeesRevenueVolumeCharts data={data} />
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
