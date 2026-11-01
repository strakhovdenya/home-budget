export const sections = ['overview', 'obligations', 'savings', 'months', 'settings'] as const;
export type Section = (typeof sections)[number];
export const sectionPaths: Record<Section, string> = {
  overview: '/', obligations: '/obligations', savings: '/savings', months: '/months', settings: '/settings',
};
