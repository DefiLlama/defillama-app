import Select, { type Props } from 'react-select'

const customStyles = {
	control: (provided: any) => ({
		...provided,
		background: 'var(--cards-bg)',
		padding: '2px',
		borderRadius: '6px',
		border: '1px solid var(--form-control-border)',
		color: 'var(--text-primary)',
		boxShadow: 'none',
		margin: 0,
		zIndex: 0
	}),
	input: (provided: any) => ({
		...provided,
		color: 'var(--text-primary)'
	}),
	menu: (provided: any) => ({
		...provided,
		background: 'var(--cards-bg)',
		zIndex: 10
	}),
	option: (provided: any, state: any) => ({
		...provided,
		color: state.isActive ? 'black' : 'var(--text-primary)'
	}),
	multiValue: (provided: any) => ({
		...provided,
		fontFamily: 'inherit',
		background: 'var(--bg2)',
		padding: '2px'
	}),
	multiValueLabel: (styles: any) => ({
		...styles,
		color: 'var(--text-primary)'
	}),
	placeholder: (provided: any) => ({
		...provided,
		color: 'var(--text-tertiary)'
	}),
	singleValue: (provided: any, _state: any) => ({
		...provided,
		color: 'var(--text-primary)'
	})
}

export const ReactSelect = ({ options, styles, ...props }: Props<any, boolean>) => (
	<Select
		styles={{ ...customStyles, ...styles }}
		options={options}
		theme={(theme) => {
			return {
				...theme,
				colors: {
					...theme.colors,
					primary25: 'var(--bg2)',
					primary50: 'var(--bg2)',
					primary75: 'var(--bg2)'
				}
			}
		}}
		{...props}
	/>
)
