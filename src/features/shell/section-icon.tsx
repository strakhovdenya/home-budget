import SvgIcon from '@mui/material/SvgIcon';
import type { Section } from './sections';

const paths: Record<Section, string> = {
  overview: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  obligations: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2zm3 4v2h6V6H9zm0 5v2h6v-2H9z',
  savings: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 4v5h5v2h-7V6h2z',
  months: 'M7 2h2v2h6V2h2v2h4v18H3V4h4V2zM5 9v11h14V9H5zm3 3h3v3H8v-3z',
  history: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 4v5h5v2h-7V6h2z',
  settings: 'M4 5h7v2H4V5zm11 0h5v2h-5V5zM4 11h11v2H4v-2zm15 0h1v2h-1v-2zM4 17h3v2H4v-2zm7 0h9v2h-9v-2zM11 3h4v6h-4V3zm4 6h4v6h-4V9zM7 15h4v6H7v-6z',
};

export function SectionIcon({ section }: { section: Section }) {
  return <SvgIcon aria-hidden="true" fontSize="small"><path d={paths[section]} /></SvgIcon>;
}
