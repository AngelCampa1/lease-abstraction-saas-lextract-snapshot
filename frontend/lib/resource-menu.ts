import { getResourceHubSections } from './resource-hubs'

export interface ResourceMenuLink {
  label: string
  href: string
  description: string
}

export interface ResourceMenuSection {
  heading: 'Learn' | 'Reference' | 'Segments' | 'Tools'
  links: ResourceMenuLink[]
}

export function getResourceMenuSections(): ResourceMenuSection[] {
  return getResourceHubSections().map((section) => ({
    heading: section.heading,
    links: section.hubs.map((hub) => ({
      label: hub.label,
      href: hub.href,
      description: hub.description,
    })),
  }))
}
