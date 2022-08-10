import styled from 'styled-components'
import { Link as LinkIcon, DollarSign } from 'react-feather'
import { useRouter } from 'next/router'

export function AggregateBySwitch() {
	const router = useRouter()
	const { aggregateBy } = router.query as { aggregateBy: 'chain' | 'protocol' }
	const _aggregateBy = !!aggregateBy ? aggregateBy : 'protocol'

	return (
		<Wrapper>
			<Switch
				active={_aggregateBy === 'protocol'}
				onClick={() =>
					router.push({
						query: {
							...router.query,
							aggregateBy: 'protocol'
						}
					})
				}
			>
				<DollarSign size={14} />
				<span>Protocols</span>
			</Switch>
			<Switch
				active={_aggregateBy === 'chain'}
				onClick={() =>
					router.push({
						query: {
							...router.query,
							aggregateBy: 'chain'
						}
					})
				}
			>
				<LinkIcon size={14} />
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
	padding: 6px;
	height: 40px;
	width: 200px;
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
