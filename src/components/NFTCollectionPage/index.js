import * as React from 'react'
import dynamic from 'next/dynamic'
import styled, { css } from 'styled-components'
import { Box as RebassBox } from 'rebass'
import { transparentize } from 'polished'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import { AutoRow, RowBetween } from '~/components/Row'
import Column from '~/components/Column'
import HeadHelp from '~/components/HeadHelp'
import CopyHelper from '~/components/Copy'
import TokenLogo from '~/components/TokenLogo'
import LocalLoader from '~/components/LocalLoader'
import SEO from '~/components/SEO'
import { NFTsSearch } from '~/components/Search'
import Section from './Section'
import Links from './Links'
import { NFT_SETTINGS, useNftsManager } from '~/contexts/LocalStorage'
import { formattedNum, capitalizeFirstLetter } from '~/utils'
import { chainCoingeckoIds } from '~/constants/chainTokens'

const panelPseudo = css`
	:after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 10px;
	}
	@media only screen and (min-width: 40rem) {
		:after {
			content: unset;
		}
	}
`

export const Panel = styled(RebassBox)`
	position: relative;
	background-color: ${({ theme }) => theme.advancedBG};
	padding: 1.25rem;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	border-radius: 8px;
	border: 1px solid ${({ theme }) => theme.bg3};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05); /* box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.01), 0px 16px 24px rgba(0, 0, 0, 0.01), 0px 24px 32px rgba(0, 0, 0, 0.01); */
	:hover {
		cursor: ${({ hover }) => hover && 'pointer'};
		border: ${({ hover, theme }) => hover && '1px solid' + theme.bg5};
	}
	${(props) => props.background && `background-color: ${props.theme.advancedBG};`}
	${(props) => (props.area ? `grid-area: ${props.area};` : null)}
  ${(props) =>
		props.grouped &&
		css`
			@media only screen and (min-width: 40rem) {
				&:first-of-type {
					border-radius: 20px 20px 0 0;
				}
				&:last-of-type {
					border-radius: 0 0 20px 20px;
				}
			}
		`}
  ${(props) =>
		props.rounded &&
		css`
			border-radius: 8px;
			@media only screen and (min-width: 40rem) {
				border-radius: 10px;
			}
		`};
	${(props) => !props.last && panelPseudo}
`

const DashboardWrapper = styled(RebassBox)`
	width: 100%;
`

export const DetailsLayout = styled.div`
	display: inline-grid;
	width: 100%;
	grid-template-columns: auto auto auto 1fr;
	column-gap: 30px;
	align-items: start;

	&:last-child {
		align-items: center;
		justify-items: end;
	}
	@media screen and (max-width: 1024px) {
		grid-template-columns: 1fr;
		align-items: stretch;
		> * {
			grid-column: 1 / 4;
			margin-bottom: 1rem;
			display: table-row;
			> * {
				margin-bottom: 1rem;
			}
		}

		&:last-child {
			align-items: start;
			justify-items: start;
		}
	}
`

const PanelWrapper = styled(RebassBox)`
	grid-template-columns: repeat(3, 1fr);
	grid-template-rows: max-content;
	gap: 6px;
	display: inline-grid;
	width: 100%;
	align-items: start;
	@media screen and (max-width: 1024px) {
		grid-template-columns: 1fr;
		align-items: stretch;
		> * {
			grid-column: 1 / 4;
		}

		> * {
			&:first-child {
				width: 100%;
			}
		}
	}
`

const Header = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 16px;

	h1 {
		font-size: 1.5rem;
		font-weight: 500;
		word-break: break-all;
	}
`

const GlobalNFTChart = dynamic(() => import('~/components/GlobalNFTChart'), {
	ssr: false
})

function NFTCollectionPage({ collection, chart, statistics, title, backgroundColor }) {
	const [nftsSettings] = useNftsManager()
	const { DISPLAY_USD, HIDE_LAST_DAY } = NFT_SETTINGS

	const displayUsd = nftsSettings[DISPLAY_USD]
	const hideLastDay = nftsSettings[HIDE_LAST_DAY]

	const {
		chains,
		address,
		description,
		logo,
		name,
		website,
		discord_url,
		telegram_url,
		twitter_username,
		medium_username,
		marketCap,
		marketCapUSD,
		updatedAt
	} = collection || {}

	const { totalVolume, totalVolumeUSD, dailyVolume, dailyVolumeUSD, dailyChange } = statistics || {}

	const links = {
		website: website || '',
		discord: discord_url || '',
		telegram: telegram_url || '',
		medium: medium_username ? `https://medium.com/${medium_username}` : '',
		twitter: twitter_username ? `https://twitter.com/${twitter_username}` : ''
	}

	if (!collection || !chart) {
		return <LocalLoader fill="true" />
	}

	let shownMarketCap, shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit

	if (displayUsd) {
		;[shownMarketCap, shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
			marketCapUSD,
			totalVolumeUSD,
			dailyVolumeUSD,
			dailyChange,
			'USD',
			'$'
		]
	} else {
		;[shownMarketCap, shownTotalVolume, shownDailyVolume, shownDailyChange, symbol, unit] = [
			marketCap,
			totalVolume,
			dailyVolume,
			dailyChange,
			chainCoingeckoIds[capitalizeFirstLetter(chains?.length && chains[0])]?.symbol,
			''
		]
	}

	if (hideLastDay) {
		if (chart.length >= 2 && displayUsd) {
			shownTotalVolume = totalVolumeUSD - chart[chart.length - 1].volumeUSD
			shownDailyVolume = chart[chart.length - 2].volumeUSD
			shownDailyChange =
				((chart[chart.length - 2].volumeUSD - chart[chart.length - 3].volumeUSD) / chart[chart.length - 3].volumeUSD) *
				100
			chart = chart.slice(0, -1)
		} else if (chart.length >= 2) {
			shownTotalVolume = totalVolume - chart[chart.length - 1].volume
			shownDailyVolume = chart[chart.length - 2].volume
			shownDailyChange =
				((chart[chart.length - 2].volume - chart[chart.length - 3].volume) / chart[chart.length - 3].volume) * 100
			chart = chart.slice(0, -1)
		}
	}

	const marketCapSection = (
		<TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
			{shownMarketCap ? formattedNum(shownMarketCap, displayUsd) : '-'}
		</TYPE.main>
	)

	const totalVolumeSection = (
		<TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
			{formattedNum(shownTotalVolume, displayUsd)}
		</TYPE.main>
	)

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)}>
			<SEO cardName={name} logo={logo} nftPage />

			<NFTsSearch step={{ category: 'NFTs', name: name }} />

			<DashboardWrapper>
				<Header>
					<TokenLogo logo={logo} size={24} external />
					<h1>{name}</h1>
				</Header>
				<PanelWrapper>
					<Section title="Market Cap" content={marketCapSection} />
					<Section title="Total Volume" content={totalVolumeSection} />
					<Section title="Links" content={<Links logo={logo} links={links} />} />
					<Panel
						sx={{
							gridColumn: ['1', '1', '1', '2/4'],
							gridRow: ['', '', '', '1/4']
						}}
					>
						<GlobalNFTChart
							chartData={chart}
							dailyVolume={shownDailyVolume}
							dailyVolumeChange={shownDailyChange}
							symbol={symbol}
							unit={unit}
							displayUsd={displayUsd}
						/>
					</Panel>
				</PanelWrapper>
				<>
					<RowBetween style={{ marginTop: '3rem' }}>
						<TYPE.main fontSize={'1.125rem'}>Description</TYPE.main>{' '}
					</RowBetween>
					<Panel
						rounded
						style={{
							marginTop: '1.5rem'
						}}
						p={20}
					>
						<DetailsLayout>
							<TYPE.main fontSize={'15px'} lineHeight={1.25} fontWeight={500}>
								{description}
							</TYPE.main>
						</DetailsLayout>
					</Panel>
				</>
				<RowBetween style={{ marginTop: '3rem' }}>
					<TYPE.main fontSize={'1.125rem'}>Collection Information</TYPE.main>{' '}
				</RowBetween>
				<Panel
					rounded
					style={{
						marginTop: '1.5rem'
					}}
					p={20}
				>
					<AutoRow align="flex-end">
						<Column>
							<TYPE.main>
								<HeadHelp
									title="Address"
									text="The majority of collection addresses are fetched automatically from marketplace APIs and may be inaccurate. Always verify that the collection address is correct."
								/>
							</TYPE.main>
							<AutoRow align="flex-end">
								<TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
									{address ? address.slice(0, 8) + '...' + address?.slice(36, 42) : '-'}
								</TYPE.main>
								<CopyHelper toCopy={address || '-'} />
							</AutoRow>
						</Column>
						<Column>
							<TYPE.main>Last fetched</TYPE.main>
							<AutoRow align="flex-end">
								<TYPE.main style={{ marginTop: '.5rem' }} fontSize={24} fontWeight="500">
									{updatedAt ? new Date(updatedAt).toDateString() : '-'}
								</TYPE.main>
							</AutoRow>
						</Column>
					</AutoRow>
				</Panel>
			</DashboardWrapper>
		</Layout>
	)
}

export default NFTCollectionPage
