import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Icon } from '~/components/Icon'

export const StackBySwitch = () => {
	const router = useRouter()
	const { stackBy } = router.query as { stackBy: 'chains' | 'protocols' }
	const _stackBy = !!stackBy ? stackBy : 'protocols'

	return (
		<Wrapper>
			<Switch
				active={_stackBy === 'protocols'}
				onClick={() => {
					router.push({
						query: {
							...router.query,
							stackBy: 'protocols'
						}
					})
				}}
			>
				<Icon name="map" height={14} width={14} />
				<span>Protocols</span>
			</Switch>
			<Switch
				active={_stackBy === 'chains'}
				onClick={() => {
					router.push({
						query: {
							...router.query,
							stackBy: 'chains'
						}
					})
				}}
			>
				<Icon name="link" height={14} width={14} />
				<span>Chains</span>
			</Switch>
		</Wrapper>
	)
}

const Wrapper = styled.span`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	border-radius: 6px;
	background: ${({ theme }) => theme.bg6};
	box-shadow: ${({ theme }) => theme.shadowSm};
	padding: 6px;
	height: 40px;
	width: 220px;
`

interface ISwitch {
	active: boolean
}

const Switch = styled.button<ISwitch>`
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
