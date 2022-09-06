import { useMemo } from 'react'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { ButtonDark } from '~/components/ButtonStyled'
import { ProtocolsChainsSearch } from '~/components/Search'
import { ChainPieChart, ChainDominanceChart } from '~/components/Charts'
import { columnsToShow, FullTable } from '~/components/Table'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { GroupChains } from '~/components/MultiSelect'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl, useGroupChainsByParent } from '~/hooks/data'
import { toNiceCsvDate, getRandomColor, download } from '~/utils'
import { revalidate } from '~/api'
import { getChainsPageData } from '~/api/categories/protocols'

export async function getStaticProps() {
	const data = await getChainsPageData('All')
	return {
		...data,
		revalidate: revalidate()
	}
}

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

	@media screen and (min-width: 80rem) {
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
const ChainTvlsFilter = styled.form`
	& > h2 {
		margin: 0 2px 8px;
		font-weight: 600;
		font-size: 0.825rem;
		color: ${({ theme }) => theme.text1};
	}
`

const columns = columnsToShow('chainName', 'protocols', '1dChange', '7dChange', '1mChange', 'tvl', 'mcaptvl')

export default function ChainsContainer({
	chainsUnique,
	chainTvls,
	stackedDataset,
	category,
	categories,
	chainsGroupbyParent,
	tvlTypes
}) {
	const chainColor = useMemo(
		() => Object.fromEntries([...chainsUnique, 'Others'].map((chain) => [chain, getRandomColor()])),
		[chainsUnique]
	)

	const chainTotals = useCalcStakePool2Tvl(chainTvls, undefined, undefined, true)

	const chainsTvlValues = useMemo(() => {
		const data = chainTotals.map((chain) => ({
			name: chain.name,
			value: chain.tvl
		}))

		const otherTvl = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherTvl })
	}, [chainTotals])

	const { data: stackedData, daySum } = useCalcGroupExtraTvlsByDay(stackedDataset, tvlTypes)

	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...chainsUnique]]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map((chain) => day[chain] ?? '')])
			})
		download('chains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const showByGroup = ['All', 'Non-EVM'].includes(category) ? true : false

	const groupedChains = useGroupChainsByParent(chainTotals, showByGroup ? chainsGroupbyParent : {})

	return (
		<>
			<ProtocolsChainsSearch
				step={{
					category: 'Chains',
					name: category === 'All' ? 'All Chains' : category
				}}
			/>

			<HeaderWrapper>
				<span>Total Value Locked All Chains</span>
				<ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
			</HeaderWrapper>

			<ChartsWrapper>
				<ChainPieChart data={chainsTvlValues} chainColor={chainColor} />
				<ChainDominanceChart
					stackOffset="expand"
					formatPercent={true}
					stackedDataset={stackedData}
					chainsUnique={chainsUnique}
					chainColor={chainColor}
					daySum={daySum}
				/>
			</ChartsWrapper>

			<ChainTvlsFilter>
				<h2>Filters</h2>
				<GroupChains label="Filters" />
			</ChainTvlsFilter>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={categories} activeLink={category} />
			</RowLinksWrapper>

			<StyledTable data={groupedChains} columns={columns} />
		</>
	)
}
