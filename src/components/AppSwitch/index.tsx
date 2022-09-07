import Link from 'next/link'
import styled from 'styled-components'
import { BarChart2, Percent, DollarSign, BarChart } from 'react-feather'
import { useDexsApp, usePeggedApp, useYieldApp } from '~/hooks'

export default function AppSwitch() {
	const isYieldApp = useYieldApp()
	const isStableCoinsApp = usePeggedApp()
	const isDexsApp = useDexsApp()

	return (
		<Wrapper>
			<Link href="/" passHref>
				<AppLink active={!isYieldApp && !isStableCoinsApp && !isDexsApp}>
					<BarChart2 size={14} />
					<span>DeFi</span>
				</AppLink>
			</Link>
			<Link href="/yields" passHref>
				<AppLink active={isYieldApp && !isStableCoinsApp}>
					<Percent size={14} />
					<span>Yields</span>
				</AppLink>
			</Link>
			<Link href="/stablecoins/chains" passHref>
				<AppLink active={isStableCoinsApp && !isYieldApp}>
					<DollarSign size={14} />
					<span>Stablecoins</span>
				</AppLink>
			</Link>
			<Link href="/dexs" passHref>
				<AppLink active={isDexsApp}>
					<BarChart size={14} />
					<span>DEXs</span>
				</AppLink>
			</Link>
		</Wrapper>
	)
}

const Wrapper = styled.span`
	display: none;
	flex-direction: column;
	gap: 8px;
	border-radius: 6px;
	background: #000;
	padding: 6px;
	width: 160px;

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: flex;
	}
`

interface IAppLink {
	active: boolean
}

const AppLink = styled.a<IAppLink>`
	display: flex;
	align-items: center;
	gap: 12px;
	color: ${({ theme }) => theme.white};
	font-size: 14px;
	white-space: nowrap;
	flex-wrap: nowrap;
	padding: 6px;
	border-radius: 6px;
	background: ${({ active }) => (active ? '#445ed0' : '#000')};
	flex: 1;
`
