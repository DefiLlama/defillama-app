import { Combobox, ComboboxState } from 'ariakit'
import styled from 'styled-components'
import { Search as SearchIcon, X as XIcon } from 'react-feather'

const InputField = styled(Combobox)`
	padding: 14px 16px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	font-size: 1rem;
	border: none;
	border-radius: 12px;
	outline: none;

	::placeholder {
		color: ${({ theme }) => theme.text3};
		font-size: 1rem;
	}

	&[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text4};
	}
`

interface IInputProps {
	state: ComboboxState
	placeholder: string
	breadCrumbs?: boolean
	autoFocus?: boolean
}

const IconWrapper = styled.button`
	position: absolute;
	top: 22px;
	right: 20px;
	z-index: 1;

	& > svg {
		color: ${({ theme }) => theme.text3};
		height: 20px;
		width: 20px;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		top: 14px;
		right: 16px;
	}
`
export function Input({ state, placeholder, breadCrumbs, ...props }: IInputProps) {
	return (
		<>
			<InputField
				state={state}
				placeholder={placeholder}
				style={breadCrumbs ? { borderBottomLeftRadius: '0', borderBottomRightRadius: 0 } : {}}
				autoSelect
				{...props}
			/>

			<IconWrapper onClick={() => state.toggle()}>
				{state.mounted ? (
					<>
						<span className="visually-hidden">Close Search</span>
						<XIcon />
					</>
				) : (
					<>
						<span className="visually-hidden">Open Search</span>
						<SearchIcon />
					</>
				)}
			</IconWrapper>
		</>
	)
}
