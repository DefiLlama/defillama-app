import styled from 'styled-components'
import { NavLink } from '../RowLinksWithDropdown/LinksWithDropdown'

export const PERIODS = ['24h', '7d', '30d']

const Body = styled.div`
	display: flex;
	border-radius: 8px;
	border: 1px solid ${({ theme }) => theme.bg3};
	height: 100%;
	height: 34px;

	& > :first-child {
		border-radius: 8px 0px 0px 8px;
	}

	& > :last-child {
		border-radius: 0px 8px 8px 0px;
	}
`

const Button = styled(NavLink)`
	border-radius: 0px;
	width: 33%;
`

interface IProps {
	selectedPeriod: string
	setPeriod: (period: string) => void
}

const FilterByPeriod = ({ selectedPeriod, setPeriod }: IProps) => {
	return (
		<Body>
			{PERIODS.map((period) => {
				return (
					<Button data-active={period === selectedPeriod} key={period} onClick={() => setPeriod(period)}>
						{period}
					</Button>
				)
			})}
		</Body>
	)
}

export default FilterByPeriod
