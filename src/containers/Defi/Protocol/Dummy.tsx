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
import { tokenIconUrl } from '~/utils'
import { ArrowUpRight } from 'react-feather'
import styled from 'styled-components'
import { Treasury } from './Treasury'

export function DummyProtocol({ data, title, backgroundColor, protocol }) {
	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO cardName={data.name} token={data.name} logo={tokenIconUrl(data.name)} />

			<ProtocolsChainsSearch step={{ category: 'Protocols', name: data.name }} />

			<Wrapper>
				<Name>
					<TokenLogo logo={data.logo} size={24} />
					<FormattedName text={data.name} maxCharacters={16} fontWeight={700} />
				</Name>

				{data.description && <p>{data.description}</p>}

				<LinksWrapper>
					{data.url && (
						<Link href={data.url} passHref>
							<Button as="a" target="_blank" rel="noopener" useTextColor={true} color={backgroundColor}>
								<span>Website</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.twitter && (
						<Link href={`https://twitter.com/${data.twitter}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Twitter</span> <ArrowUpRight size={14} />
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
								<ArrowUpRight size={14} />
							</Button>
						</Link>
					)}
				</LinksWrapper>

				{data.treasury && <Treasury protocolName={protocol} />}
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
