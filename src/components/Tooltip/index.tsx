import React from 'react'
import styled from 'styled-components'
import { Button } from 'ariakit/button'
import { Tooltip as AriaTooltip, TooltipAnchor, useTooltipState } from 'ariakit/tooltip'

interface ITooltip {
  content: string | null
  style?: {}
  children: React.ReactNode
}

const TooltipTrigger = styled(Button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.text1};
  padding: 0;
  display: flex;
  align-items: center;
`

const TooltipPopver = styled(AriaTooltip)`
  font-size: 0.85rem;
  padding: 0.5rem;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};
  border: 1px solid ${({ theme }) => theme.bg3};
  color: ${({ theme }) => theme.text1};
  border-radius: 8px;
  max-width: 228px;
  box-shadow: ${({ theme }) => theme.shadowSm};
`

export default function Tooltip({ content, children, ...props }: ITooltip) {
  const tooltip = useTooltipState()

  if (!content || content === '') return <>{children}</>

  return (
    <>
      <TooltipAnchor state={tooltip} as={TooltipTrigger} {...props}>
        {children}
      </TooltipAnchor>
      <TooltipPopver state={tooltip}>{content}</TooltipPopver>
    </>
  )
}
