import React, { useCallback } from 'react'
import {
  Popover as AriaPopover,
  PopoverArrow,
  PopoverDisclosure,
  PopoverStateRenderCallbackProps,
  usePopoverState,
} from 'ariakit/popover'
import assignStyle from './assign-style'
import { useMedia } from 'hooks'
import { transparentize } from 'polished'
import styled from 'styled-components'

const Trigger = styled(PopoverDisclosure)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
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

  :focus-visible,
  [data-focus-visible] {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
    outline-offset: 1px;
  }
`

const PopoverWrapper = styled(AriaPopover)`
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
  color: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(0, 0%, 100%)' : 'hsl(204, 10%, 10%)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 20%)' : 'hsl(204, 20%, 100%)')};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 32%)' : 'hsl(204, 20%, 88%)')};
  border-radius: 8px;
  filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 40%))' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 15%))'};
  max-height: calc(100vh - 200px);
  width: 100%;
  max-width: none;

  .arrow svg {
    fill: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 20%)' : 'hsl(204, 20%, 100%)')};
    stroke: ${({ theme }) => (theme.mode === 'dark' ? 'hsl(204, 3%, 32%)' : 'hsl(204, 20%, 88%)')};
  }

  :focus-visible,
  [data-focus-visible] {
    outline: ${({ theme }) => '1px solid ' + theme.text4};
    outline-offset: 1px;
  }

  @media screen and (min-width: 640px) {
    max-width: min(calc(100vw - 16px), 320px);
  }
`

function applyMobileStyles(popover: HTMLElement, arrow?: HTMLElement | null) {
  const restorePopoverStyle = assignStyle(popover, {
    position: 'fixed',
    bottom: '0',
    width: '100%',
    padding: '12px',
  })
  const restoreArrowStyle = assignStyle(arrow, { display: 'none' })
  const restoreDesktopStyles = () => {
    restorePopoverStyle()
    restoreArrowStyle()
  }
  return restoreDesktopStyles
}

interface IProps {
  trigger: React.ReactNode
  content: React.ReactNode
}

export default function Popover({ trigger, content }: IProps) {
  const isLarge = useMedia('(min-width: 640px)', true)

  const renderCallback = useCallback(
    (props: PopoverStateRenderCallbackProps) => {
      const { popover, arrow, defaultRenderCallback } = props
      if (isLarge) return defaultRenderCallback()
      return applyMobileStyles(popover, arrow)
    },
    [isLarge]
  )

  const popover = usePopoverState({ renderCallback })

  return (
    <>
      <Trigger state={popover}>{trigger}</Trigger>
      <PopoverWrapper state={popover} modal={!isLarge}>
        <PopoverArrow className="arrow" />
        {content}
      </PopoverWrapper>
    </>
  )
}
