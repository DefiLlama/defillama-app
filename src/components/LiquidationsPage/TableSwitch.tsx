/* eslint-disable no-unused-vars*/
import * as React from 'react'
import styled from 'styled-components'
import { LIQS_SETTINGS, useLiqsManager } from '~/contexts/LocalStorage'
import { Icon } from '../Icon'

export const TableSwitch = () => {
	const [liqsSettings, toggleLiqsSettings] = useLiqsManager()
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	return (
		<Wrapper>
			<Switch active={!isLiqsShowingInspector} onClick={toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}>
				<Icon name="percent" height={14} width={14} />
				<span>Distribution</span>
			</Switch>
			<Switch active={isLiqsShowingInspector} onClick={toggleLiqsSettings(LIQS_SHOWING_INSPECTOR)}>
				<Icon name="search" height={14} width={14} />
				<span>Positions</span>
			</Switch>
		</Wrapper>
	)
}

export const Wrapper = styled.span`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border-radius: 6px;
	background-color: ${({ theme }) => theme.bg6};
	padding: 6px;
	height: 40px;
	width: 250px;
	margin: 0 auto;
	box-shadow: ${({ theme }) => theme.shadowSm};
`

interface ISwitch {
	active: boolean
}

export const Switch = styled.button<ISwitch>`
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 4px;
	color: ${({ active, theme }) => (active ? '#fff' : theme.text1)};
	font-size: 14px;
	white-space: nowrap;
	flex-wrap: nowrap;
	padding: 6px;
	border-radius: 6px;
	background: ${({ active, theme }) => (active ? '#445ed0' : theme.bg6)};
	flex: 1;
`
