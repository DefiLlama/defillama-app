import styled from 'styled-components'
import { NavLink } from '../RowLinksWithDropdown/LinksWithDropdown'
import { darken, transparentize } from 'polished'
import { capitalize } from 'lodash'

const Body = styled.div`
	display: flex;
	border-radius: 8px;
	border: 1px solid ${({ theme }) => theme.bg1};
	height: 100%;
	background-color: transparent;

	& > :first-child {
		border-radius: 8px 0px 0px 8px;
	}

	& > :last-child {
		border-radius: 0px 8px 8px 0px;
	}
`

const Button = styled(NavLink)`
	border-radius: 0px;
	background-color: ${({ theme }) => transparentize(0.9, theme.primary1)};
	color: ${({ theme }) => theme.text1};
`

interface IProps {
	selectedValue: string
	setValue: (period: string) => void
	values: Array<string>
	style?: Record<string, string>
}

const RowFilter = ({ selectedValue, setValue, values, style }: IProps) => {
	return (
		<Body style={style}>
			{values.map((value) => {
				return (
					<Button data-active={value === selectedValue} key={value} onClick={() => setValue(value)}>
						{capitalize(value)}
					</Button>
				)
			})}
		</Body>
	)
}

export default RowFilter
