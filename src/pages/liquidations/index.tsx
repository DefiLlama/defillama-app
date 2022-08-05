/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { PlusCircle } from 'react-feather'
import useSWR from 'swr'
import { fetcher, arrayFetcher, retrySWR } from '~/utils/useSWR'
import { Select as AriaSelect, SelectItem, SelectPopover } from 'ariakit/select'

import { ButtonDark } from '~/components/ButtonStyled'
import Layout from '~/layout'
// import { revalidate } from '~/api'

// import { liqs } from '../../components/LiquidationsPage'
import { Header } from '~/Theme'
import { ProtocolsChainsSearch } from '~/components/Search'
import React, { useEffect, useMemo } from 'react'
import { ChartData, useLiquidationsState } from '~/utils/liquidations'
import { BreakpointPanelNoBorder } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { ChartState } from '../../components/LiquidationsPage/Chart'
import { LiquidationsContainer } from '../../components/LiquidationsPage/Main'

import { queryTypes, useQueryState } from 'next-usequerystate'

export const defaultChartState: ChartState = {
	asset: 'ETH',
	aggregateBy: 'protocol',
	filters: ['all'] // comma separated list of chains or protocols
}

const LiquidationsPage: NextPage = () => {
	const { asset, aggregateBy, filters } = useLiquidationsState()

	const { data } = useSWR<ChartData>(
		// TODO: implement the full api
		`http://localhost:3000/api/mock-liquidations/?symbol=${asset}&aggregateBy=${aggregateBy}${
			!filters ? '' : `&filters=${filters}`
		}`,
		fetcher
	)

	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch
				step={{ category: 'Home', name: 'Liquidation Levels', hideOptions: true, hideSearch: true }}
			/>

			<Header>Liquidation Levels in DeFi 💦</Header>
			{data && (
				<LiquidationsContainer
					chartState={{ asset, aggregateBy, filters }}
					chartData={data}
					uid={`liquidations-chart-${asset}`}
					aggregateBy={aggregateBy}
				/>
			)}
		</Layout>
	)
}

export default LiquidationsPage
