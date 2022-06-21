import { Combobox, ComboboxItem, ComboboxList } from 'ariakit/combobox'
import { Menu, MenuButton } from 'ariakit/menu'
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
  color: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(0, 0%, 100%)' : 'hsl(204, 10%, 10%)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 12%)' : 'hsl(204, 20%, 100%)')};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 32%)' : 'hsl(204, 20%, 88%)')};
  border-radius: 8px;
  filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 40%))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 15%))'};
  z-index: 100;
  max-height: 400px;
  overflow: visible;

  #no-results {
    padding: 0 12px;
    text-align: center;
  }
`

export const Input = styled(Combobox)`
  color: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(0, 0%, 100%)' : 'hsl(204, 10%, 10%)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 12%)' : 'hsl(204, 20%, 100%)')};
  padding: 8px 12px;
  border: ${({ theme }) => '1px solid ' + theme.text3};
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
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
