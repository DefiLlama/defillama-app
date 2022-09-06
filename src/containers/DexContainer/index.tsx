import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useInView, defaultFallbackInView } from 'react-intersection-observer'
import { ArrowUpRight } from 'react-feather'
import Layout from '~/layout'
import { ButtonLight } from '~/components/ButtonStyled'
import CopyHelper from '~/components/Copy'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import SEO from '~/components/SEO'
import { DexsSearch } from '~/components/Search'
import AuditInfo from '~/components/AuditInfo'
import { useScrollToTop } from '~/hooks'
import { formattedNum, getBlockExplorer } from '~/utils'
import { IDexResponse } from '~/api/types'
import { formatVolumeHistoryToChartDataByChain, formatVolumeHistoryToChartDataByProtocol } from '~/utils/dexs'
import { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'

defaultFallbackInView(true)

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

export const Stats = styled.section`
	display: grid;
	grid-template-columns: 1fr;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
	position: relative;
	isolation: isolate;

	@media screen and (min-width: 80rem) {
		grid-template-columns: auto 1fr;
	}
`

export const ProtocolDetails = styled.div`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	padding-bottom: calc(24px + 0.4375rem);
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
	grid-column: span 1;
	border-radius: 12px 12px 0 0;

	@media screen and (min-width: 80rem) {
		min-width: 380px;
		border-radius: 0 0 0 12px;
	}
`

export const ProtocolName = styled.h1`
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.25rem;
`

const Symbol = styled.span`
	font-weight: 400;
`

export const Tvl = styled.p`
	font-weight: 700;
	font-size: 2rem;
	display: flex;
	flex-direction: column;
	gap: 8px;

	& > *:first-child {
		font-weight: 400;
		font-size: 0.75rem;
		text-align: left;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#969b9b' : '#545757')};
	}
`

const SectionHeader = styled.h2`
	font-weight: 700;
	font-size: 1.25rem;
	margin: 0 0 -24px;
	border-left: 1px solid transparent;
`

const InfoWrapper = styled.section`
	padding: 24px;
	background: ${({ theme }) => theme.bg7};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	border-radius: 12px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-template-rows: repeat(3, auto);
	box-shadow: ${({ theme }) => theme.shadowSm};

	@media screen and (min-width: 80rem) {
		grid-template-rows: repeat(2, auto);
	}
`

const Section = styled.section`
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px 0;
	border-bottom: 1px solid transparent;

	h3 {
		font-weight: 600;
		font-size: 1.125rem;
	}

	&:not(:first-of-type) {
		border-top: ${({ theme }) => '1px solid ' + theme.text5};
	}

	&:first-of-type {
		padding-top: 0;
	}

	&:last-of-type {
		padding-bottom: 0;
		border-bottom: none;
	}

	p {
		line-height: 1.5rem;
	}

	@media screen and (min-width: 80rem) {
		h3:not(:first-of-type) {
			margin-top: 24px;
		}

		&:nth-child(1) {
			grid-column: 1 / 2;
			border-right: 1px solid transparent;
		}

		&:nth-child(2) {
			grid-column: 1 / 2;
			padding-bottom: 0;
			border-right: 1px solid transparent;
			border-bottom: none;
		}

		&:nth-child(3) {
			grid-row: 1 / -1;
			grid-column: 2 / 3;
			border-top: 0;
			border-left: ${({ theme }) => '1px solid ' + theme.text5};
			padding: 0 0 0 24px;
			margin-left: 24px;
		}
	}
`

const LinksWrapper = styled.section`
	display: flex;
	gap: 16px;
	flex-wrap: wrap;
`

const Button = styled(ButtonLight)`
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 8px 12px;
	font-size: 0.875rem;
	font-weight: 400;
	white-space: nowrap;
	font-family: var(--font-inter);
`

const FlexRow = styled.p`
	display: flex;
	align-items: center;
	gap: 8px;
`

const Bobo = styled.button`
	position: absolute;
	bottom: -36px;
	left: 0;

	img {
		width: 34px !important;
		height: 34px !important;
	}

	@media screen and (min-width: 80rem) {
		top: 0;
		right: 0;
		bottom: initial;
		left: initial;
		z-index: 1;
	}
`

export const TvlWrapper = styled.section`
	display: flex;
	gap: 20px;
	align-items: flex-end;
	justify-content: space-between;
	flex-wrap: wrap;
`

const ChartsWrapper = styled.section`
	display: grid;
	grid-template-columns: 1fr 1fr;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
`

const ChartWrapper = styled.section`
	grid-column: span 2;
	min-height: 360px;
	padding: 20px;
	display: flex;
	flex-direction: column;

	@media screen and (min-width: 90rem) {
		grid-column: span 1;

		:last-child:nth-child(2n - 1) {
			grid-column: span 2;
		}
	}
`

interface IProtocolContainerProps {
	title: string
	dex: string
	dexData: IDexResponse
	backgroundColor: string
}

function ProtocolContainer({ title, dexData, backgroundColor }: IProtocolContainerProps) {
	useScrollToTop()

	const {
		address = '',
		name,
		url,
		description,
		logo,
		audits,
		category,
		twitter,
		audit_links,
		volumeAdapter,
		forkedFrom
	} = dexData

	const volumeHistory = !!dexData.volumeHistory ? dexData.volumeHistory : []

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const [bobo, setBobo] = React.useState(false)

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO
				cardName={dexData.name}
				token={dexData.name}
				tvl={formattedNum(dexData.total1dVolume)?.toString()}
				volumeChange={`${dexData.change1dVolume}`}
			/>

			<DexsSearch
				step={{
					category: 'DEXs',
					name: dexData.name
				}}
			/>

			<Stats>
				<ProtocolDetails style={{ borderTopLeftRadius: '12px' }}>
					<ProtocolName>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
						{/* <Symbol>{symbol && symbol !== '-' ? `(${symbol})` : ''}</Symbol> */}
					</ProtocolName>

					<TvlWrapper>
						<Tvl>
							<span>24h volume</span>
							<span>{formattedNum(dexData.total1dVolume || '0', true)}</span>
						</Tvl>
					</TvlWrapper>
					<TvlWrapper>
						<Tvl>
							<span>24 change</span>
							<span>{dexData.change1dVolume || 0}%</span>
						</Tvl>
					</TvlWrapper>
				</ProtocolDetails>

				<StackedBarChart
					chartData={formatVolumeHistoryToChartDataByProtocol(volumeHistory, name, volumeAdapter)}
					color={backgroundColor}
				/>

				{/* <Bobo onClick={() => setBobo(!bobo)}>
					<span className="visually-hidden">Enable Goblin Mode</span>
					<Image src={boboLogo} width="34px" height="34px" alt="bobo cheers" />
				</Bobo> */}
			</Stats>

			<SectionHeader>Information</SectionHeader>
			<InfoWrapper>
				<Section>
					<h3>DEX Information</h3>
					{description && <p>{description}</p>}

					{category && (
						<FlexRow>
							<span>Category</span>
							<span>:</span>
							<Link href={`/dexs`}>{category}</Link>
						</FlexRow>
					)}

					{forkedFrom && (
						<FlexRow>
							<span>Forked from</span>
							<span>:</span>
							<>
								{forkedFrom.map((p, index) => (
									<Link href={`/protocol/${p}`} key={p}>
										{forkedFrom[index + 1] ? p + ', ' : p}
									</Link>
								))}
							</>
						</FlexRow>
					)}

					{audits && audit_links && <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />}

					<LinksWrapper>
						<Link href={url} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Website</span> <ArrowUpRight size={14} />
							</Button>
						</Link>

						{twitter && (
							<Link href={`https://twitter.com/${twitter}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Twitter</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>
				<Section>
					<h3>Token Information</h3>

					{address && (
						<FlexRow>
							<span>Address</span>
							<span>:</span>
							<span>{address.slice(0, 8) + '...' + address?.slice(36, 42)}</span>
							<CopyHelper toCopy={address} disabled={!address} />
						</FlexRow>
					)}

					<LinksWrapper>
						{dexData.gecko_id && (
							<Link href={`https://www.coingecko.com/en/coins/${dexData.gecko_id}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>View on CoinGecko</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
						{blockExplorerLink && (
							<Link href={blockExplorerLink} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>View on {blockExplorerName}</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>
				<Section>
					<h3>Methodology</h3>
					<LinksWrapper>
						{volumeAdapter && (
							<Link
								href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/volumes/adapters/${volumeAdapter}`}
								passHref
							>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Check the code</span>
									<ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>
			</InfoWrapper>
			<SectionHeader>Charts</SectionHeader>

			<ChartsWrapper>
				<Chart>
					<StackedBarChart
						title="By chain all versions"
						chartData={formatVolumeHistoryToChartDataByChain(volumeHistory)}
					/>
				</Chart>
			</ChartsWrapper>
		</Layout>
	)
}

const Chart = ({ children }) => {
	const { ref, inView } = useInView({
		triggerOnce: true
	})

	return <ChartWrapper ref={ref}>{inView && children}</ChartWrapper>
}

export default ProtocolContainer
