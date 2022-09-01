import { useMemo } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import Layout from '~/layout'
import { Panel } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import Table, { columnsToShow, Dropdowns, TableFilters, TableHeader } from '~/components/Table'
import { FiltersByChain, HideForkedProtocols } from '~/components/Filters'
import { useCalcStakePool2Tvl } from '~/hooks/data'
import { getPercentChange } from '~/utils'

const TableWrapper = styled(Table)`
	tr > *:not(:first-child) {
		& > * {
			width: 100px;
			font-weight: 400;
		}
	}

	// PROTOCOL NAME
	tr > *:nth-child(1) {
		& > * {
			width: 160px;

			#table-p-logo,
			#table-p-symbol {
				display: none;
			}
		}
	}

	// CATEGORY
	tr > *:nth-child(2) {
		display: none;
	}

	// CHAINS
	tr > *:nth-child(3) {
		display: none;
	}

	// LISTED AT
	tr > *:nth-child(4) {
		display: none;
	}

	// 1D CHANGE
	tr > *:nth-child(5) {
		display: none;
	}

	// 7D CHANGE
	tr > *:nth-child(6) {
		display: none;
	}

	// 1M CHANGE
	tr > *:nth-child(7) {
		display: none;
	}

	// TVL
	tr > *:nth-child(8) {
		padding-right: 20px;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// LISTED AT
		tr > *:nth-child(4) {
			display: revert;
		}
	}

	@media screen and (min-width: 640px) {
		// 1D CHANGE
		tr > *:nth-child(5) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		// PROTOCOL NAME
		tr > *:nth-child(1) {
			& > * {
				width: 200px;
			}

			#table-p-logo {
				display: flex;
			}
		}
	}

	@media screen and (min-width: 900px) {
		// PROTOCOL NAME
		tr > *:nth-child(1) {
			& > * {
				width: 280px;
			}

			#table-p-symbol {
				display: revert;
			}
		}

		// 7D CHANGE
		tr > *:nth-child(6) {
			display: revert;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		// 7D CHANGE
		tr > *:nth-child(6) {
			display: none;
		}
	}

	@media screen and (min-width: 1200px) {
		// CATEGORY
		tr > *:nth-child(2) {
			display: revert;
		}

		// 7D CHANGE
		tr > *:nth-child(6) {
			display: revert;
		}
	}

	@media screen and (min-width: 1536px) {
		// CHAINS
		tr > *:nth-child(3) {
			display: revert;
		}

		// 1M CHANGE
		tr > *:nth-child(7) {
			display: revert !important;
		}
	}
`

const columns = columnsToShow(
	'protocolName',
	'category',
	'chains',
	'listedAt',
	'1dChange',
	'7dChange',
	'1mChange',
	'tvl'
)

function getSelectedChainFilters(chainQueryParam, allChains) {
	if (chainQueryParam) {
		if (typeof chainQueryParam === 'string') {
			return chainQueryParam === 'All' ? [...allChains] : chainQueryParam === 'None' ? [] : [chainQueryParam]
		} else {
			return [...chainQueryParam]
		}
	} else return [...allChains]
}

interface IRecentProtocolProps {
	title: string
	name: string
	header: string
	protocols: any
	chainList: string[]
	forkedList?: { [name: string]: boolean }
}

export function RecentProtocols({ title, name, header, protocols, chainList, forkedList }: IRecentProtocolProps) {
	const { query, isReady } = useRouter()
	const { chain, hideForks } = query

	const toHideForkedProtocols = hideForks && typeof hideForks === 'string' && hideForks === 'true' ? true : false

	const { selectedChains, data } = useMemo(() => {
		const currentTimestamp = Date.now() / 1000
		const secondsInDay = 3600 * 24

		const selectedChains = getSelectedChainFilters(chain, chainList)

		const _chainsToSelect = selectedChains.map((t) => t.toLowerCase())

		const data = protocols
			.filter((protocol) => {
				let toFilter = true

				// filter out protocols that are forks
				if (toHideForkedProtocols && forkedList) {
					toFilter = !forkedList[protocol.name]
				}

				protocol.chains.forEach((chain) => {
					// filter if a protocol has atleast of one selected chain
					if (toFilter) {
						toFilter = _chainsToSelect.includes(chain.toLowerCase())
					}
				})

				return toFilter
			})
			.map((p) => {
				let tvl = 0
				let tvlPrevDay = null
				let tvlPrevWeek = null
				let tvlPrevMonth = null
				let extraTvl = {}

				p.chains.forEach((chainName) => {
					// return if chainsToSelect doesnot include chainName
					if (!_chainsToSelect.includes(chainName.toLowerCase())) {
						return
					}

					for (const sectionName in p.chainTvls) {
						const _sanitisedChainName = sectionName.startsWith(`${chainName}-`)
							? sectionName.split('-')[1]?.toLowerCase()
							: sectionName.toLowerCase()

						// add only if chainsToSelect includes sanitisedChainName and chainName equalt sanitisedChainName
						if (_chainsToSelect.includes(_sanitisedChainName) && chainName.toLowerCase() === _sanitisedChainName) {
							const _values = p.chainTvls[sectionName]

							// only add tvl values where chainName is strictly equal to sectionName, else check if its extraTvl and add
							if (sectionName.startsWith(`${chainName}-`)) {
								const sectionToAdd = sectionName.split('-')[1]
								extraTvl[sectionToAdd] = (extraTvl[sectionToAdd] || 0) + _values
							} else {
								if (_values.tvl) {
									tvl = (tvl || 0) + _values.tvl
								}
								if (_values.tvlPrevDay) {
									tvlPrevDay = (tvlPrevDay || 0) + _values.tvlPrevDay
								}
								if (_values.tvlPrevWeek) {
									tvlPrevWeek = (tvlPrevWeek || 0) + _values.tvlPrevWeek
								}
								if (_values.tvlPrevMonth) {
									tvlPrevMonth = (tvlPrevMonth || 0) + _values.tvlPrevMonth
								}
							}
						}
					}
				})

				return {
					...p,
					tvl,
					tvlPrevDay,
					tvlPrevWeek,
					tvlPrevMonth,
					change_1d: getPercentChange(tvl, tvlPrevDay),
					change_7d: getPercentChange(tvl, tvlPrevWeek),
					change_1m: getPercentChange(tvl, tvlPrevMonth),
					listedAt: Number(((currentTimestamp - p.listedAt) / secondsInDay).toFixed(2))
				}
			})

		return { data, selectedChains }
	}, [protocols, chain, chainList, forkedList, toHideForkedProtocols])

	const protocolsData = useCalcStakePool2Tvl(data, 'listedAt', 'asc')

	const { pathname } = useRouter()

	return (
		<Layout title={title} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: name }} />

			<TableFilters>
				<TableHeader>{header}</TableHeader>
				{isReady && (
					<>
						<Dropdowns>
							<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
						</Dropdowns>
						{forkedList && <HideForkedProtocols />}
					</>
				)}
			</TableFilters>

			{!isReady ? null : protocolsData.length > 0 ? (
				<TableWrapper data={protocolsData} columns={columns} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Couldn't find any protocols for these filters
				</Panel>
			)}
		</Layout>
	)
}
