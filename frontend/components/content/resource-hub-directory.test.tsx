import { render, screen, within } from '@testing-library/react'
import { ResourceHubDirectory } from './resource-hub-directory'

describe('ResourceHubDirectory', () => {
  it('renders every attached child resource for a hub', () => {
    render(<ResourceHubDirectory hubHref="/resources/comparisons" />)

    const directory = screen.getByRole('navigation', {
      name: 'Comparisons resources',
    })

    expect(within(directory).getAllByRole('link')).toHaveLength(30)
    expect(
      within(directory).getByRole('link', { name: 'Lextract vs LeaseLens' })
    ).toHaveAttribute('href', '/resources/comparisons/leaselens')
  })

  it('renders nothing for an unknown hub', () => {
    const { container } = render(<ResourceHubDirectory hubHref="/missing" />)

    expect(container).toBeEmptyDOMElement()
  })
})
