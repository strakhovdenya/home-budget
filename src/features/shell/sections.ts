export const sections = ['overview', 'obligations', 'savings', 'months', 'history', 'settings'] as const;
export type Section = (typeof sections)[number];
export const sectionPaths: Record<Section, string> = {
  overview: '/', obligations: '/obligations', savings: '/savings', months: '/months', history: '/history', settings: '/settings',
};
