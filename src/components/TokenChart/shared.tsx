import * as React from 'react'
import styled from 'styled-components'
import { useSelectState, SelectArrow, SelectItemCheck } from 'ariakit/select'
import { Item, Popover, SelectMenu } from 'components/Select/AriakitSelect'

const Menu = styled(SelectMenu)`
  position: absolute;
  right: 0;
  top: -3px;
  padding: 4px;
  z-index: 1;
  width: min-content;
  border: ${({ theme }) => '1px solid ' + theme.bg4};
  border-radius: 8px;
  font-size: 0.75rem;

  & > * {
    display: flex;
    gap: 8px;
    align-items: center;
  }
`

const SelectedOptions = styled.span`
  background: ${({ theme }) => theme.bg4};
  padding: 4px;
  border-radius: 100px;
  min-width: 22px;
`

const StyledPopover = styled(Popover)`
  min-width: 160px;
  max-height: 300px;
`

const Button = styled(Item)`
  white-space: nowrap;
  background: #2172e5;
  color: #fff;
  justify-content: center;

  :hover,
  &[data-focus-visible] {
    cursor: pointer;
    background: #445ed0;
  }
`

const DropdownValue = styled.span`
  max-width: 16ch;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

function renderValue(value: string[], title: string) {
  return (
    <span>
      <SelectedOptions>{value?.length ?? 0}</SelectedOptions>
      <span>{title}</span>
    </span>
  )
}

interface ISelectLegendMultipleProps {
  allOptions: string[]
  options: string[]
  setOptions: React.Dispatch<React.SetStateAction<string[]>>
  title: string
}

export function SelectLegendMultiple({ allOptions, options, setOptions, title, ...props }: ISelectLegendMultipleProps) {
  const onChange = (values) => {
    setOptions(values)
  }

  const select = useSelectState({
    value: options,
    setValue: onChange,
    defaultValue: allOptions,
    gutter: 6,
  })

  return (
    <>
      <Menu state={select} {...props}>
        {renderValue(select.value, title)}
        <SelectArrow />
      </Menu>
      {select.mounted && (
        <StyledPopover state={select}>
          {options.length > 0 ? (
            <Button onClick={() => select.setValue([])} id="filter-button">
              Deselect All
            </Button>
          ) : (
            <Button onClick={() => select.setValue(allOptions)} id="filter-button">
              Select All
            </Button>
          )}

          {allOptions.map((value) => (
            <Item key={title + value} value={value}>
              <SelectItemCheck />
              <DropdownValue>{value}</DropdownValue>
            </Item>
          ))}
        </StyledPopover>
      )}
    </>
  )
}

interface ISelectLegendProps {
  allOptions: string[]
  setOptions: React.Dispatch<React.SetStateAction<string[]>>
  title: string
}

export function SelectLegend({ allOptions, setOptions, title, ...props }: ISelectLegendProps) {
  const select = useSelectState({
    defaultValue: allOptions[0],
    gutter: 6,
  })

  return (
    <>
      <Menu state={select} {...props}>
        <span style={{ padding: '4px' }}>{select.value}</span>
        <SelectArrow />
      </Menu>
      {select.mounted && (
        <StyledPopover state={select}>
          {allOptions.map((value) => (
            <Item key={title + value} value={value} onClick={() => setOptions([value])}>
              <SelectItemCheck />
              <DropdownValue>{value}</DropdownValue>
            </Item>
          ))}
        </StyledPopover>
      )}
    </>
  )
}
