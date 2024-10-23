import * as React from 'react'
import styled from 'styled-components'
import { Icon } from '~/components/Icon'

const IconWrapper = styled.div<{ isActive?: boolean }>`
	opacity: ${({ isActive }) => (isActive ? 0.8 : 0.4)};

	:hover {
		opacity: 1;
	}
`

const Wrapper = styled.button`
	display: none;
	width: fit-content;
	color: ${({ theme }) => theme.text1};
	padding: 0;

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		display: flex;
	}
`

interface ThemeSwitchProps {
	isActive: boolean
	toggle: () => void
}

export default function ThemeSwitch({ isActive, toggle }: ThemeSwitchProps) {
	return (
		<Wrapper onClick={toggle}>
			<span>
				<IconWrapper isActive={!isActive}>
					<Icon name="sun" height={20} width={20} />
				</IconWrapper>
			</span>
			<span style={{ padding: '0 .5rem' }}>{' / '}</span>
			<span>
				<IconWrapper isActive={isActive}>
					<Icon name="moon" height={20} width={20} />
				</IconWrapper>
			</span>
		</Wrapper>
	)
}
