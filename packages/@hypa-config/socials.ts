import socialsConfig from './json/socials.json' with { type: 'json' }

export type SocialLinkId =
  | 'youtube'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'x'

export type SocialLink = {
  id: SocialLinkId
  label: string
  href: string
}

export const SOCIAL_LINKS = socialsConfig.links as SocialLink[]
