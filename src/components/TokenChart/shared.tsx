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
  max-height: 300px;
  overflow-y: auto;
`

const DropdownValue = styled.span`
  max-width: 12ch;
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

interface IProps {
  allOptions: string[]
  options: string[]
  setOptions: React.Dispatch<React.SetStateAction<string[]>>
  title: string
}

export function CustomLegend({ allOptions, options, setOptions, title, ...props }: IProps) {
  const onChange = (values) => {
    setOptions(values)
  }

  const select = useSelectState({
    value: options,
    setValue: onChange,
    defaultValue: allOptions,
    sameWidth: true,
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
          {allOptions.map((value) => (
            <Item key={value} value={value}>
              <SelectItemCheck />
              <DropdownValue>{value}</DropdownValue>
            </Item>
          ))}
        </StyledPopover>
      )}
    </>
  )
}
