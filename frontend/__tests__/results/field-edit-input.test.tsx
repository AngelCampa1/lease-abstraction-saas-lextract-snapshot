import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldEditInput } from '@/components/results/field-edit-input'

describe('FieldEditInput', () => {
  it('renders text input for string fields', () => {
    render(
      <FieldEditInput
        fieldName="tenant_legal_name"
        currentValue="Acme Corp"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('Acme Corp')
  })

  it('renders number input for numeric fields ending in _amount', () => {
    render(
      <FieldEditInput
        fieldName="security_deposit_amount"
        currentValue={5000}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(5000)
  })

  it('renders number input for fields ending in _days', () => {
    render(
      <FieldEditInput
        fieldName="default_cure_period_days"
        currentValue={30}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(30)
  })

  it('renders number input for fields ending in _months', () => {
    render(
      <FieldEditInput
        fieldName="lease_term_months"
        currentValue={60}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(60)
  })

  it('renders number input for fields ending in _percentage', () => {
    render(
      <FieldEditInput
        fieldName="rent_escalation_percentage"
        currentValue={3}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(3)
  })

  it('renders number input for fields ending in _psf', () => {
    render(
      <FieldEditInput
        fieldName="base_rent_psf"
        currentValue={25.5}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(25.5)
  })

  it('renders number input for fields ending in _total', () => {
    render(
      <FieldEditInput
        fieldName="ti_allowance_total"
        currentValue={100000}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(100000)
  })

  it('renders number input for fields ending in _rate', () => {
    render(
      <FieldEditInput
        fieldName="after_hours_hvac_rate"
        currentValue={75}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(75)
  })

  it('renders number input for fields ending in _cost', () => {
    render(
      <FieldEditInput
        fieldName="replacement_cost"
        currentValue={200}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(200)
  })

  it('renders date input for date fields', () => {
    render(
      <FieldEditInput
        fieldName="commencement_date"
        currentValue="2025-01-15"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByTestId('date-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveValue('2025-01-15')
  })

  it('renders Yes/No select for boolean fields', () => {
    render(
      <FieldEditInput
        fieldName="waiver_of_subrogation"
        currentValue={true}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('true')
  })

  it('renders Yes/No select with false value', () => {
    render(
      <FieldEditInput
        fieldName="waiver_of_subrogation"
        currentValue={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('false')
  })

  it('auto-focuses on mount', async () => {
    render(
      <FieldEditInput
        fieldName="tenant_legal_name"
        currentValue="Acme Corp"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    await waitFor(() => {
      const input = screen.getByRole('textbox')
      expect(input).toHaveFocus()
    })
  })

  it('calls onSave with string value on Enter for text fields', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <FieldEditInput
        fieldName="tenant_legal_name"
        currentValue="Acme Corp"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Tenant{Enter}')
    expect(onSave).toHaveBeenCalledWith('New Tenant')
  })

  it('calls onCancel on Escape', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <FieldEditInput
        fieldName="tenant_legal_name"
        currentValue="Acme Corp"
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    )
    const input = screen.getByRole('textbox')
    await user.type(input, '{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })

  it('converts string to number before saving for number fields', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <FieldEditInput
        fieldName="security_deposit_amount"
        currentValue={50000}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '75000{Enter}')
    expect(onSave).toHaveBeenCalledWith(75000)
  })

  it('saves boolean value from select on Enter', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <FieldEditInput
        fieldName="waiver_of_subrogation"
        currentValue={true}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'false')
    await user.keyboard('{Enter}')
    expect(onSave).toHaveBeenCalledWith(false)
  })

  it('handles null currentValue for text fields', () => {
    render(
      <FieldEditInput
        fieldName="tenant_legal_name"
        currentValue={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('')
  })

  it('handles null currentValue for number fields', () => {
    render(
      <FieldEditInput
        fieldName="security_deposit_amount"
        currentValue={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(null)
  })

  it('gives the text input an accessible name derived from the field', () => {
    render(
      <FieldEditInput
        fieldName="tenant_legal_name"
        currentValue="Acme Corp"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('textbox', { name: 'Edit tenant legal name' }),
    ).toBeInTheDocument()
  })

  it('gives the number input an accessible name', () => {
    render(
      <FieldEditInput
        fieldName="security_deposit_amount"
        currentValue={5000}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('spinbutton', { name: 'Edit security deposit amount' }),
    ).toBeInTheDocument()
  })

  it('gives the boolean select an accessible name', () => {
    render(
      <FieldEditInput
        fieldName="waiver_of_subrogation"
        currentValue={true}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('combobox', { name: 'Edit waiver of subrogation' }),
    ).toBeInTheDocument()
  })

  it('gives the date input an accessible name', () => {
    render(
      <FieldEditInput
        fieldName="commencement_date"
        currentValue="2025-01-15"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByTestId('date-input')).toHaveAccessibleName(
      'Edit commencement date',
    )
  })

  it('saves null when a number field is cleared', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <FieldEditInput
        fieldName="security_deposit_amount"
        currentValue={5000}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.keyboard('{Enter}')
    expect(onSave).toHaveBeenCalledWith(null)
  })

  it('saves date value on Enter', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <FieldEditInput
        fieldName="commencement_date"
        currentValue="2025-01-15"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    const input = screen.getByTestId('date-input')
    await user.clear(input)
    await user.type(input, '2025-06-01{Enter}')
    expect(onSave).toHaveBeenCalled()
  })
})
