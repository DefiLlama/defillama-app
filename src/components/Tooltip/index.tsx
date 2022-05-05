import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import styled from 'styled-components'
import { transparentize } from 'polished'

interface ITooltip {
  content: string | null
  children: React.ReactNode
}

const TooltipContent = styled(TooltipPrimitive.Content)`
  font-size: 0.85rem;
  padding: 0.5rem;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.bg3};
  box-shadow: 0 4px 8px 0 ${({ theme }) => transparentize(0.9, theme.shadow1)};
  color: ${({ theme }) => theme.text2};
  border-radius: 8px;
  max-width: 228px;
`

const TooltipTrigger = styled(TooltipPrimitive.Trigger)`
  background: none;
  font-size: inherit;
  padding: 0;
`

const TooltipArrow = styled(TooltipPrimitive.Arrow)`
  fill: ${({ theme }) => theme.bg2};
`

export const Provider = TooltipPrimitive.Provider
export const TooltipRoot = TooltipPrimitive.Root

export default function Tooltip({ content, children }: ITooltip) {
  if (!content || content === '') return <>{children}</>

  return (
    <TooltipRoot>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={5}>
        {content}
        <TooltipArrow />
      </TooltipContent>
    </TooltipRoot>
  )
}
