export const sections = [
  'overview',
  'obligations',
  'savings',
  'months',
  'history',
  'analytics',
  'settings'
] as const;
export type Section = (typeof sections)[number];
export const sectionPaths: Record<Section, string> = {
  overview: '/',
  obligations: '/obligations',
  savings: '/savings',
  months: '/months',
  history: '/history',
  analytics: '/analytics',
  settings: '/settings',
};
