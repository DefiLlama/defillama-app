import type { ComponentProps } from 'react'

export type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]
export type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>
