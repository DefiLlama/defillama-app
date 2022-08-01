import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useInView, defaultFallbackInView } from 'react-intersection-observer'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import { ButtonLight } from '~/components/ButtonStyled'
import CopyHelper from '~/components/Copy'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import SEO from '~/components/SEO'
import { DexsSearch, ProtocolsChainsSearch } from '~/components/Search'
import AuditInfo from '~/components/AuditInfo'
import ProtocolTvlChart from '~/components/TokenChart/ProtocolTvlChart'
import QuestionHelper from '~/components/QuestionHelper'
import type { IChartProps } from '~/components/TokenChart/types'
import { extraTvlOptions } from '~/components/SettingsModal'
import { useScrollToTop } from '~/hooks'
import { useCalcSingleExtraTvl } from '~/hooks/data'
import { extraTvlProps, useGetExtraTvlEnabled, useTvlToggles } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, formattedNum, getBlockExplorer, standardizeProtocolName, toK } from '~/utils'
import { useFetchProtocol } from '~/api/categories/protocols/client'
import { buildProtocolData } from '~/utils/protocolData'
import boboLogo from '~/assets/boboSmug.png'
import { IDexResponse, IFusedProtocolData } from '~/api/types'
import { Checkbox2 } from '~/components'
import {
	formatVolumeHistoryToChartDataByChain,
	formatVolumeHistoryToChartDataByProtocol,
	getChartDataFromVolumeHistory
} from '~/utils/dexs'
import { IStackedBarChartProps } from '~/components/TokenChart/StackedBarChart'

defaultFallbackInView(true)

const StackedBarChart = dynamic(() => import('~/components/TokenChart/StackedBarChart'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const Stats = styled.section`
	display: grid;
	grid-template-columns: 1fr;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
	position: relative;
	isolation: isolate;

	@media (min-width: 80rem) {
		grid-template-columns: auto 1fr;
	}
`

const ProtocolDetails = styled.div`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	padding-bottom: calc(24px + 0.4375rem);
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
	grid-column: span 1;
	border-radius: 12px 12px 0 0;

	@media (min-width: 80rem) {
		min-width: 380px;
		border-radius: 0 0 0 12px;
	}
`

const ProtocolName = styled.h1`
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.25rem;
`

const Symbol = styled.span`
	font-weight: 400;
`

const Tvl = styled.p`
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

	@media (min-width: 80rem) {
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

	@media (min-width: 80rem) {
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

	@media (min-width: 80rem) {
		top: 0;
		right: 0;
		bottom: initial;
		left: initial;
		z-index: 1;
	}
`

const DownloadButton = styled(Button)`
	display: flex;
	align-items: center;
	color: inherit;
	padding: 8px 12px;
	border-radius: 10px;
`

const TvlWrapper = styled.section`
	display: flex;
	gap: 20px;
	align-items: flex-end;
	justify-content: space-between;
	flex-wrap: wrap;
`

const ExtraTvlOption = styled.label`
	display: flex;
	align-items: center;
	gap: 8px;

	:hover {
		cursor: pointer;
	}
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

	@media (min-width: 90rem) {
		grid-column: span 1;

		:last-child:nth-child(2n - 1) {
			grid-column: span 2;
		}
	}
`

const OtherProtocols = styled.nav`
	grid-column: span 1;
	display: flex;
	overflow-x: auto;
	background: ${({ theme }) => theme.bg7};
	font-weight: 500;
	border-radius: 12px 12px 0 0;

	@media (min-width: 80rem) {
		grid-column: span 2;
	}
`

interface IProtocolLink {
	active: boolean
	color: string | null
}

const ProtocolLink = styled.a<IProtocolLink>`
	padding: 8px 24px;
	white-space: nowrap;

	& + & {
		border-left: ${({ theme }) => '1px solid ' + theme.divider};
	}

	border-bottom: ${({ active, color, theme }) => '1px solid ' + (active ? color : theme.divider)};

	:first-child {
		border-top-left-radius: 12px;
	}

	:hover,
	:focus-visible {
		background-color: ${({ color }) => transparentize(0.9, color)};
	}
`

interface IProtocolContainerProps {
	title: string
	dex: string
	dexData: IDexResponse
	backgroundColor: string
}

const isLowerCase = (letter: string) => letter === letter.toLowerCase()

function ProtocolContainer({ title, dexData, dex, backgroundColor }: IProtocolContainerProps) {
	useScrollToTop()

	const {
		address = '',
		name,
		symbol,
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

	const { blockExplorerLink, blockExplorerName } = getBlockExplorer(address)

	const [bobo, setBobo] = React.useState(false)

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} style={{ gap: '36px' }}>
			<SEO
				cardName={dexData.name}
				chain={dexData.name}
				tvl={formattedNum(dexData.total1dVolume)?.toString()}
				volumeChange={`${dexData.change1dVolume}`}
			/>

			<DexsSearch
				step={{
					category: 'DEXs',
					name: category === 'All' ? 'All DEXs' : category
				}}
			/>

			<Stats>
				<ProtocolDetails style={{ borderTopLeftRadius: '12px' }}>
					<ProtocolName>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
						<Symbol>{symbol && symbol !== '-' ? `(${symbol})` : ''}</Symbol>
					</ProtocolName>

					<TvlWrapper>
						<Tvl>
							<span>24h volume</span>
							<span>{formattedNum(dexData.total1dVolume || '0', true)}</span>
						</Tvl>
					</TvlWrapper>
				</ProtocolDetails>
				{/* <StackedBarChart chartData={formatVolumeHistoryToChartDataByChain(dexData.volumeHistory)} color={backgroundColor} /> */}

				<StackedBarChart
					chartData={formatVolumeHistoryToChartDataByProtocol(dexData.volumeHistory)}
					color={backgroundColor}
				/>

				<Bobo onClick={() => setBobo(!bobo)}>
					<span className="visually-hidden">Enable Goblin Mode</span>
					<Image src={boboLogo} width="34px" height="34px" alt="bobo cheers" />
				</Bobo>
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
								href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/dexVolumes/${volumeAdapter}`}
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
