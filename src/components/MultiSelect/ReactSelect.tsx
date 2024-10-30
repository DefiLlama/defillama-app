import Select, { Props } from 'react-select'

const customStyles = {
	control: (provided) => ({
		...provided,
		background: 'var(--bg6)',
		padding: '4px 2px',
		borderRadius: '8px',
		border: 'none',
		color: 'var(--text1)',
		boxShadow:
			'0px 24px 32px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 0px 1px rgba(0, 0, 0, 0.04)',
		margin: 0,
		zIndex: 0
	}),
	input: (provided) => ({
		...provided,
		color: 'var(--text1)'
	}),
	menu: (provided) => ({
		...provided,
		background: 'var(--bg6)',
		zIndex: 10
	}),
	option: (provided, state) => ({
		...provided,
		color: state.isActive ? 'black' : 'var(--text1)'
	}),
	multiValue: (provided) => ({
		...provided,
		fontFamily: 'inherit',
		background: 'var(--bg2)',
		padding: '2px'
	}),
	multiValueLabel: (styles) => ({
		...styles,
		color: 'var(--text1)'
	}),
	placeholder: (provided) => ({
		...provided,
		color: 'var(--text3)'
	}),
	singleValue: (provided, state) => ({
		...provided,
		color: 'var(--text1)'
	})
}

export const ReactSelect = ({ options, styles, ...props }: Props) => (
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
