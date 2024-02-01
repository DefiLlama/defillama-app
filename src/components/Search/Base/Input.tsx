import * as React from 'react'
import { Combobox, ComboboxState } from 'ariakit'
import styled from 'styled-components'
import { Search as SearchIcon, X as XIcon } from 'react-feather'

const InputField = styled(Combobox)`
	padding: 14px 16px 14px 40px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	font-size: 1rem;
	border: none;
	border-radius: 12px;
	outline: none;

	&[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text4};
	}

	::placeholder {
		color: ${({ theme }) => theme.text3};
	}

	&[data-variant='secondary'] {
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		font-size: 0.875rem;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		border: 1px solid ${({ theme }) => theme.divider};
		border-bottom: 0;

		&[data-variant='secondary'] {
			border: none;
		}
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

	&::placeholder {
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

interface IInputProps {
	state: ComboboxState
	placeholder: string
	breadCrumbs?: boolean
	autoFocus?: boolean
	withValue?: boolean
	variant?: 'primary' | 'secondary'
	hideIcon?: boolean
}

const IconWrapper = styled.button`
	position: absolute;
	top: 22px;
	right: 20px;
	z-index: 1;
	width: fit-content;
	padding: 0;

	& > svg {
		color: ${({ theme }) => theme.text3};
	}

	&[data-variant='secondary'] {
		top: 8px;
		left: 8px;

		& > svg {
			color: #646466;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		top: 16px;
		left: 16px;

		&[data-variant='secondary'] {
			top: 8px;
			left: 8px;
		}
	}
`

const Shortcut = styled.span`
	position: absolute;
	font-weight: 600;

	top: 10px;
	right: 18px;
	color: ${({ theme }) => theme.link};
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#151515' : '#f5f5f5')};

	padding: 6px;
	border-radius: 6px;

	&[data-variant='secondary'] {
		font-size: 0.875rem;
		top: 4px;
		right: 4px;
		padding: 4px;
		border-radius: 6px;
		font-weight: 500;
	}
`

export function Input({
	state,
	placeholder,
	withValue,
	breadCrumbs,
	variant = 'primary',
	hideIcon,
	...props
}: IInputProps) {
	const inputField = React.useRef<HTMLInputElement>()

	React.useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
				e.preventDefault()
				inputField.current && inputField.current?.focus()
				state.toggle()
			}
		}

		window.addEventListener('keydown', focusSearchBar)

		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [state])

	const onClick = React.useCallback(() => {
		if (state.mounted && withValue) {
			state.setValue('')
		}

		state.toggle()
	}, [withValue, state])

	return (
		<>
			{!hideIcon && (
				<IconWrapper data-variant={variant} onClick={onClick}>
					{state.mounted ? (
						<>
							<span className="visually-hidden">Close Search</span>
							<XIcon size={variant === 'secondary' ? '16px' : '18px'} />
						</>
					) : (
						<>
							<span className="visually-hidden">Open Search</span>
							<SearchIcon size={variant === 'secondary' ? '16px' : '18px'} />
						</>
					)}
				</IconWrapper>
			)}

			<InputField
				state={state}
				placeholder={placeholder}
				style={breadCrumbs ? { borderBottomLeftRadius: '0', borderBottomRightRadius: 0 } : {}}
				autoSelect
				ref={inputField}
				data-variant={variant}
				{...props}
			/>

			{!hideIcon && <Shortcut data-variant={variant}>⌘K</Shortcut>}
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

			<IconWrapper onClick={() => hideInput && hideInput(false)}>
				<span className="visually-hidden">Close Search</span>
				<XIcon />
			</IconWrapper>
		</>
	)
}
