import { CheckboxCheck } from 'ariakit'
import { Combobox, ComboboxItem, ComboboxList } from 'ariakit/combobox'
import { Menu, MenuButton, MenuItemCheckbox } from 'ariakit/menu'
import { transparentize } from 'polished'
import styled from 'styled-components'

interface IButtonProps {
  color?: string
}

export const Button = styled(MenuButton)<IButtonProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 12px;
  font-size: 0.825rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  border: 1px solid transparent;
  background-color: ${({ color, theme }) => transparentize(0.9, color || theme.primary1)};
  color: ${({ theme }) => theme.text1};

  white-space: nowrap;

  :hover,
  :focus-visible {
    cursor: pointer;
    background-color: ${({ color, theme }) => transparentize(0.8, color || theme.primary1)};
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
    outline-offset: 1px;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  svg {
    position: relative;
    top: 1px;
  }
`

export const Popover = styled(Menu)`
  min-width: 180px;
  outline: none !important;
  position: relative;
  z-index: 50;
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
  font-size: 0.825rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text1};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
  filter: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
      : 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
  border-radius: 8px;
  z-index: 100;
  max-height: 400px;
  overflow: visible;

  #no-results {
    padding: 0 12px 2px;
    text-align: center;
  }
`

export const Input = styled(Combobox)`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};
  color: ${({ theme }) => theme.text1};
  font: inherit;
  padding: 8px 12px;
  border: ${({ theme }) => '1px solid ' + theme.text4};
  border-radius: 8px;
  margin: 12px 12px 0;

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text2};
  }
`

export const List = styled(ComboboxList)`
  overflow: auto;
  overscroll-behavior: contain;
  padding: 8px 0;
`

export const Item = styled(ComboboxItem)`
  padding: 8px 12px;
  color: ${({ theme }) => theme.text1};
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: none;
  border: none;
  text-align: start;

  :hover,
  :focus-visible,
  &[data-active-item] {
    outline: none;
    background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
  }
`

export const ItemWithCheckbox = styled(MenuItemCheckbox)`
  padding: 8px 12px;
  color: ${({ theme }) => theme.text1};
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};
  text-align: start;
  display: flex;
  align-items: center;
  font-weight: 400;

  &:first-of-type {
    padding-top: 14px;
  }

  &:last-of-type {
    padding-bottom: 14px;
    border: none;
  }

  :hover,
  :focus-visible,
  &[data-active-item] {
    outline: none;
    background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
  }
`

export const ApplyFilters = styled.button`
  padding: 12px;
  border: none;
  margin: 12px 0 0;
  background: #2172e5;
  color: #fff;
  cursor: pointer;
  font-weight: 400;

  :hover,
  :focus-visible {
    background: #4190ff;
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text2};
  }

  @media (min-width: 640px) {
    border-radius: 0 0 8px 8px;
  }
`

export const Checkbox = styled(CheckboxCheck)`
  display: flex;
  height: 13px;
  width: 13px;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  border-radius: 2px;
  background: #28a2b5;
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
  color: #fff;
`
