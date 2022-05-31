import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { transparentize } from 'polished'
import styled from 'styled-components'

interface IMenuTrigger {
  color?: string
}

// TODO replace this component with ariakit
const StyledContent = styled(DropdownMenuPrimitive.Content)`
  max-height: 400px;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.bg2};
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  font-size: 0.825rem;
  font-weight: 600;
  box-shadow: 0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2);
`

const StyledItem = styled(DropdownMenuPrimitive.Item)`
  padding: 8px 12px;
  color: ${({ theme }) => theme.text1};
  cursor: pointer;
  min-width: 8rem;

  :hover,
  :focus {
    outline: none;
    background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
  }
`

const StyledLabel = styled(DropdownMenuPrimitive.Label)`
  padding: 8px 12px;
  color: ${({ theme }) => theme.text2};
  border-bottom: 1px solid;
  border-color: ${({ theme }) => theme.divider};
`

const StyledMenuTrigger = styled(DropdownMenuPrimitive.Trigger)`
  margin-right: 4px;
  display: flex;
  items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 12px;
  font-size: 0.825rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  border: 1px solid transparent;
  background-color: ${({ theme }) => transparentize(0.9, theme.primary1)};
  color: ${({ theme }) => theme.text1};

  white-space: nowrap;

  :hover,
  :focus-visible {
    cursor: pointer;
    background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
    outline-offset: 1px;
  }
`

export const DefaultMenuButton = styled(StyledMenuTrigger)<IMenuTrigger>`
  background-color: ${({ theme, color }) => (color ? transparentize(0.9, color) : theme.bg1)};
  border: none;
  border-radius: 12px;
  font-weight: 400;
  font-size: 0.875rem;
  display: flex;
  align-items: center;

  :hover,
  :focus-visible {
    background-color: ${({ theme, color }) => (color ? transparentize(0.8, color) : theme.bg3)};
  }

  :focus-visible {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
  }
`

export const DefaultMenuItem = styled(StyledItem)`
  font-weight: 400;
  font-size: 0.875rem;

  :hover,
  :focus-visible {
    background-color: ${({ theme }) => theme.bg3};
  }
`

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = StyledMenuTrigger
export const DropdownMenuContent = StyledContent
export const DropdownMenuItem = StyledItem
export const DropdownMenuLabel = StyledLabel
