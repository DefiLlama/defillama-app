import * as React from 'react'
import Link from 'next/link'
import { Button, LinksWrapper, Name } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import { transparentize } from 'polished'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import SEO from '~/components/SEO'
import { standardizeProtocolName, tokenIconUrl } from '~/utils'
import { ArrowUpRight } from 'react-feather'
import styled from 'styled-components'
import { Treasury } from './Treasury'
import { ProtocolFeesRevenueVolumeCharts } from './Fees'
import { OtherProtocols, ProtocolLink } from './Common'
import { useRouter } from 'next/router'

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
							<Link legacyBehavior href={`/protocol/${standardizeProtocolName(p)}`} key={p} passHref>
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

				<LinksWrapper>
					{data.url && (
						<Link legacyBehavior href={data.url} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Website</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.twitter && (
						<Link legacyBehavior href={`https://twitter.com/${data.twitter}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Twitter</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.treasury && (
						<Link
							legacyBehavior
							href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/treasury/${data.treasury}`}
							passHref
						>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Methodology</span>
								<ArrowUpRight size={14} />
							</Button>
						</Link>
					)}
				</LinksWrapper>

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
