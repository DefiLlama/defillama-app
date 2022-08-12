import { ChartData } from '~/utils/liquidations'
import TokenLogo from '~/components/TokenLogo'
import { ProtocolName, Symbol } from '~/components/ProtocolAndPool'
import FormattedName from '~/components/FormattedName'
import styled from 'styled-components'
import { StackBySwitch } from './StackBySwitch'
import React from 'react'

const LiquidationsHeaderWrapper = styled.div`
	flex: 1;
	isolation: isolate;
	z-index: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 10px;
	position: relative;
	margin-top: 1rem;

	@media (min-width: 80rem) {
		flex-direction: row;
	}
`
export const LiquidationsHeader = (props: ChartData) => {
	return (
		<LiquidationsHeaderWrapper>
			<ProtocolName>
				<TokenLogo logo={props.coingeckoAsset.thumb} size={24} />
				<FormattedName text={props.coingeckoAsset.name} maxCharacters={16} fontWeight={700} />
				<Symbol>({props.symbol})</Symbol>
			</ProtocolName>
			<StackBySwitch />
		</LiquidationsHeaderWrapper>
	)
}
