import { useState } from 'react'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { DexsSearch } from '~/components/Search'
import { columnsToShow, FullTable } from '~/components/Table'
import { revalidate } from '~/api'
import { getChainsPageData } from '~/api/categories/protocols'
import { useFetchDexsList } from '~/api/categories/dexs/client'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, Panel, PanelHiddenMobile } from '~/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import dynamic from 'next/dynamic'
import { formattedNum } from '~/utils'

export async function getStaticProps() {
	const data = await getChainsPageData('All')
	return {
		...data,
		revalidate: revalidate()
	}
}

// tmp fix
const Chart = dynamic(() => import('~/components/GlobalChart'), {
	ssr: false
}) as any

const ChartsWrapper = styled.section`
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;
	padding: 0;
	align-items: center;
	z-index: 1;

	& > * {
		width: 100%;
		margin: 0 !important;
	}

	@media (min-width: 80rem) {
		flex-direction: row;
	}
`

const HeaderWrapper = styled(Header)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;
`

const StyledTable = styled(FullTable)`
	tr > *:not(:first-child) {
		& > * {
			width: 100px;
			font-weight: 400;
		}
	}

	// CHAIN
	tr > :nth-child(1) {
		padding-left: 40px;

		#table-p-logo {
			display: none;
		}

		#table-p-name {
			width: 60px;
			display: block;
		}
	}

	// PROTOCOLS
	tr > :nth-child(2) {
		width: 100px;
		display: none;
	}

	// 1D CHANGE
	tr > :nth-child(3) {
		display: none;
	}

	// 7D CHANGE
	tr > :nth-child(4) {
		display: none;
	}

	// 1M CHANGE
	tr > :nth-child(5) {
		display: none;
	}

	// TVL
	tr > :nth-child(6) {
		& > * {
			padding-right: 20px;
		}
	}

	// MCAPTVL
	tr > :nth-child(7) {
		width: 100px;
		display: none;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// CHAIN
		tr > *:nth-child(1) {
			#table-p-name {
				width: 100px;
			}
		}

		// 7D CHANGE
		tr > *:nth-child(4) {
			display: revert;
		}
	}

	@media screen and (min-width: 640px) {
		// CHAIN
		tr > *:nth-child(1) {
			#table-p-logo {
				display: flex;
			}
		}

		// PROTOCOLS
		tr > :nth-child(2) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// CHAIN
		tr > *:nth-child(1) {
			#table-p-name {
				width: 140px;
			}
		}

		// 1M CHANGE
		tr > *:nth-child(5) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// 1M CHANGE
		tr > *:nth-child(5) {
			display: none;
		}
	}

	@media screen and (min-width: 1260px) {
		tr > *:nth-child(1) {
			#table-p-name {
				width: 200px;
			}
		}

		// 1M CHANGE
		tr > *:nth-child(5) {
			display: revert;
		}
	}

	@media screen and (min-width: 1360px) {
		// 1D CHANGE
		tr > *:nth-child(3) {
			display: revert;
		}
	}

	@media screen and (min-width: 1400px) {
		// MCAPTVL
		tr > *:nth-child(7) {
			display: revert;
		}
	}
`

const columns = columnsToShow('dexName', '1dChange', '7dChange', '1mChange', 'totalVolume24h')

export default function DexsContainer({ category }) {
	const {
		data: { dexs } = {},
		data: { totalVolume } = {},
		data: { change_1d } = {},
		data: { totalDataChart } = {}
	} = useFetchDexsList()

	return (
		<>
			<Panel as="p" style={{ textAlign: 'center', margin: 0 }}>
				Dashboard under developement, data might be incorrect.
			</Panel>

			<DexsSearch
				step={{
					category: 'DEXs',
					name: category === 'All' ? 'All DEXs' : category
				}}
			/>
			<HeaderWrapper>
				<span>Volume in all DEXs</span>
			</HeaderWrapper>
			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total dexs volume (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>{formattedNum(totalVolume, true)}</p>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h2>Change (24h)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {change_1d || 0}%</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					<Chart
						display="liquidity"
						dailyData={totalDataChart}
						unit={'USD'}
						totalLiquidity={totalVolume}
						liquidityChange={0}
					/>
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			{dexs && dexs.length > 0 ? (
				<StyledTable data={dexs} columns={columns} />
			) : (
				<Panel as="p" style={{ textAlign: 'center', margin: 0 }}>
					Loading dexs...
				</Panel>
			)}
		</>
	)
}
