import * as React from 'react'
import Layout from '~/layout'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import styled from 'styled-components'
import VirtualTable from '~/components/Table/Table'
import { raisesColumns } from '~/components/Table/Defi/columns'
import { AnnouncementWrapper } from '~/components/Announcement'
import { RaisesSearch } from '~/components/Search'
import { Dropdowns, TableFilters, TableHeader } from '~/components/Table/shared'
import { Chains, Investors, RaisedRange, Rounds, Sectors } from '~/components/Filters'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { DownloadIcon } from '~/components'
import { download } from '~/utils'

function RaisesTable({ raises }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const instance = useReactTable({
		data: raises,
		columns: raisesColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

const DownloadButton = styled.button`
	font-size: 0.875rem;
	display: flex;
	align-items: center;
	background: ${({ theme }) => theme.bg3};
	padding: 4px 6px;
	border-radius: 6px;
`

const TableHeaderWrapper = styled(TableHeader)`
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 8px;
`

const RaisesContainer = ({ raises, investors, rounds, sectors, chains, investorName }) => {
	const { pathname, query } = useRouter()

	const { investor, round, sector, chain, minRaised, maxRaised } = query

	const { filteredRaisesList, selectedInvestors, selectedRounds, selectedChains, selectedSectors } =
		React.useMemo(() => {
			let selectedInvestors = []
			let selectedRounds = []
			let selectedSectors = []
			let selectedChains = []

			if (investor) {
				if (typeof investor === 'string') {
					selectedInvestors = investor === 'All' ? [...investors] : investor === 'None' ? [] : [investor]
				} else {
					selectedInvestors = [...investor]
				}
			} else selectedInvestors = [...investors]

			if (round) {
				if (typeof round === 'string') {
					selectedRounds = round === 'All' ? [...rounds] : round === 'None' ? [] : [round]
				} else {
					selectedRounds = [...round]
				}
			} else selectedRounds = [...rounds]

			if (sector) {
				if (typeof sector === 'string') {
					selectedSectors = sector === 'All' ? [...sectors] : sector === 'None' ? [] : [sector]
				} else {
					selectedSectors = [...sector]
				}
			} else selectedSectors = [...sectors]

			if (chain) {
				if (typeof chain === 'string') {
					selectedChains = chain === 'All' ? [...chains] : chain === 'None' ? [] : [chain]
				} else {
					selectedChains = [...chain]
				}
			} else selectedChains = [...chains]

			const minimumAmountRaised =
				typeof minRaised === 'string' && !Number.isNaN(Number(minRaised)) ? Number(minRaised) : 0

			const maximumAmountRaised =
				typeof maxRaised === 'string' && !Number.isNaN(Number(maxRaised)) ? Number(maxRaised) : 0

			const isValidTvlRange = !!minimumAmountRaised || !!maximumAmountRaised

			const filteredRaisesList = raises.filter((raise) => {
				let toFilter = true

				if (selectedInvestors.length > 0 && raise.leadInvestors.length === 0 && raise.otherInvestors.length === 0) {
					toFilter = false
				} else {
				}

				if (selectedInvestors.length !== investors.length) {
					let isAnInvestor = false

					raise.leadInvestors.forEach((lead) => {
						if (selectedInvestors.includes(lead)) {
							isAnInvestor = true
						}
					})

					raise.otherInvestors.forEach((otherInv) => {
						if (selectedInvestors.includes(otherInv)) {
							isAnInvestor = true
						}
					})

					// filter if investor is in either leadInvestors or otherInvestors
					if (!isAnInvestor) {
						toFilter = false
					}
				}

				if (selectedChains.length !== chains.length) {
					// filter raises with no chains
					if (raise.chains.length === 0) {
						toFilter = false
					} else {
						let raiseIncludesChain = false

						raise.chains.forEach((chain) => {
							if (selectedChains.includes(chain)) {
								raiseIncludesChain = true
							}
						})

						if (!raiseIncludesChain) {
							toFilter = false
						}
					}
				}

				if (selectedRounds.length !== rounds.length) {
					// filter raises with no round
					if (!raise.round || raise.round === '') {
						toFilter = false
					} else {
						if (!selectedRounds.includes(raise.round)) {
							toFilter = false
						}
					}
				}

				if (selectedSectors.length !== sectors.length) {
					// filter raises with no sector
					if (!raise.sector || raise.sector === '') {
						toFilter = false
					} else {
						if (!selectedSectors.includes(raise.sector)) {
							toFilter = false
						}
					}
				}

				const raisedAmount = raise.amount ? Number(raise.amount) * 1_000_000 : 0

				const isInRange =
					(minimumAmountRaised ? raisedAmount >= minimumAmountRaised : true) &&
					(maximumAmountRaised ? raisedAmount <= maximumAmountRaised : true)

				if (isValidTvlRange && !isInRange) {
					toFilter = false
				}
				return toFilter
			})

			return { selectedInvestors, selectedChains, selectedRounds, selectedSectors, filteredRaisesList }
		}, [investor, investors, round, rounds, sector, sectors, chain, chains, raises, minRaised, maxRaised])

	// prepare csv data
	const downloadCsv = () => {
		const rows = [
			[
				'Name',
				'Date',
				'Amount Raised',
				'Round',
				'Sector',
				'Lead Investor',
				'Source',
				'Valuation',
				'Chains',
				'Other Investors'
			]
		]

		raises.forEach((item) => {
			rows.push([
				item.name,
				item.date,
				item.amount * 1_000_000,
				item.round ?? '',
				item.sector ?? '',
				item.leadInvestors?.join(', ') ?? '',
				item.source ?? '',
				item.valuation ?? '',
				item.chains?.join(', ') ?? '',
				item.otherInvestors?.join(', ') ?? ''
			])
		})

		download(`raises.csv`, rows.map((r) => r.join(',')).join('\n'))
	}

	return (
		<Layout title={`Raises - DefiLlama`} defaultSEO>
			<RaisesSearch step={{ category: investorName ? 'Raises' : 'Home', name: investorName || 'Raises' }} />

			<AnnouncementWrapper>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					style={{ color: '#2f80ed' }}
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</AnnouncementWrapper>

			<TableFilters>
				<TableHeaderWrapper>
					<span>Raises</span>
					<DownloadButton onClick={downloadCsv}>
						<DownloadIcon />
						<span>&nbsp;&nbsp;.csv</span>
					</DownloadButton>
				</TableHeaderWrapper>

				<Dropdowns>
					<Rounds rounds={rounds} selectedRounds={selectedRounds} pathname={pathname} />
					<Sectors sectors={sectors} selectedSectors={selectedSectors} pathname={pathname} />
					<Investors investors={investors} selectedInvestors={selectedInvestors} pathname={pathname} />
					<Chains chains={chains} selectedChains={selectedChains} pathname={pathname} />
					<RaisedRange />
					<Link href="/raises" shallow>
						<a style={{ textDecoration: 'underline' }}>Reset all filters</a>
					</Link>
				</Dropdowns>
			</TableFilters>

			<RaisesTable raises={filteredRaisesList} />
		</Layout>
	)
}

export default RaisesContainer
