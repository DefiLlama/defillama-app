import { Select as AriaSelect, SelectItem, SelectPopover } from 'ariakit/select'
import styled from 'styled-components'

export const SelectMenu = styled(AriaSelect)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: ${({ theme }) => theme.bg6};
  color: ${({ theme }) => theme.text1};
  padding: 12px;
  border-radius: 12px;
  border: none;
  margin: 0;
  width: 200px;

  & > *:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :focus-visible,
  &[data-focus-visible] {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`
export const Popover = styled(SelectPopover)`
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 15%));
  overflow: auto;
  background: ${({ theme }) => theme.bg6};
  color: ${({ theme }) => theme.text1};
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadowLg};
  margin: 0;
  z-index: 10;
  outline: ${({ theme }) => '1px solid ' + theme.text5};
  color: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(0, 0%, 100%)' : 'hsl(204, 10%, 10%)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 12%)' : 'hsl(204, 20%, 100%)')};
  border-radius: 8px;
  filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 40%))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 15%))'};
`
export const Item = styled(SelectItem)`
  padding: 12px 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;

  :hover,
  &[data-focus-visible] {
    outline: none;
    background: ${({ theme }) => theme.bg3};
  }

  &:last-of-type {
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }
`
