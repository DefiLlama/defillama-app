import * as React from 'react'
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

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		border: 1px solid ${({ theme }) => theme.divider};
		border-bottom: 0;
	}
`

const MobileInputField = styled.input`
position: absolute;
top: 8px;
left: 8px;
right: 8px;
z-index: 1;
padding: 14px 16px;
background: ${({ theme }) => theme.bg6};
color: ${({ theme }) => theme.text1};
font-size: 1rem;
border: none;
border-radius: 4px 4px 0px 0px;
outline: none;

::placeholder {
	color: ${({ theme }) => theme.text3};
	font-size: 1rem;
}

&[data-focus-visible] {
	outline: ${({ theme }) => '1px solid ' + theme.text4};
}

@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
	border: 1px solid ${({ theme }) => theme.divider};
	border-bottom: 0;
`

interface IInputProps {
	state: ComboboxState
	placeholder: string
	breadCrumbs?: boolean
	autoFocus?: boolean
	withValue?: boolean
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
export function Input({ state, placeholder, withValue, breadCrumbs, ...props }: IInputProps) {
	const onClick = React.useCallback(() => {
		if (state.mounted && withValue) {
			state.setValue('')
		}

		state.toggle()
	}, [withValue, state])

	return (
		<>
			<InputField
				state={state}
				placeholder={placeholder}
				style={breadCrumbs ? { borderBottomLeftRadius: '0', borderBottomRightRadius: 0 } : {}}
				autoSelect
				{...props}
			/>

			<IconWrapper onClick={onClick} data-searchicon>
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

export function MobileInput({
	value,
	setValue,
	hideInput,
	...props
}: {
	value: string
	setValue: React.Dispatch<React.SetStateAction<string>>
	hideInput?: React.Dispatch<React.SetStateAction<boolean>>
}) {
	return (
		<>
			<MobileInputField
				placeholder="Search..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
				autoFocus
				{...props}
			/>

			<IconWrapper onClick={() => hideInput && hideInput(false)} data-searchicon>
				<span className="visually-hidden">Close Search</span>
				<XIcon />
			</IconWrapper>
		</>
	)
}
