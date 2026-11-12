'use client';

import { Suspense, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import { Preferences } from '@/shared/ui/preferences';
import { SectionIcon } from './section-icon';
import {parsePeriod} from '@/domain/periods/period';
import { sectionPaths, sections } from './sections';

export function AppShell({ children, sessionControl }: { children: ReactNode; sessionControl?: ReactNode }) {
  const t = useTranslations('shell');
  const nav = useTranslations('navigation');
  const path = usePathname();
  const [open, setOpen] = useState(false);
  function links(period:string|null){
    return <List disablePadding>{sections.map(section=>{
      const href=section==='obligations'&&period&&(path==='/'||path==='/obligations')?sectionPaths[section]+'?period='+period:sectionPaths[section];
      return <ListItemButton component={Link} href={href} prefetch={section==='history'?false:undefined} key={section}
        selected={path===sectionPaths[section]} aria-current={path===sectionPaths[section]?'page':undefined} onClick={()=>setOpen(false)}>
        <ListItemIcon sx={{minWidth:36,color:'inherit'}}><SectionIcon section={section}/></ListItemIcon>
        <ListItemText primary={nav(section)} slotProps={{primary:{sx:{fontWeight:550}}}}/>
      </ListItemButton>;
    })}</List>;
  }
  function navigation(){return <Box component="nav" aria-label={t('navigation')}><Suspense fallback={links(null)}><ContextNavigation render={links}/></Suspense></Box>;}
  const brand = <Stack spacing={0.5}><Typography sx={{ fontWeight: 750, fontSize: 22, letterSpacing: '-0.04em' }}>Home Budget<Box component="span" sx={{ color: 'primary.main' }}>.</Box></Typography><Typography variant="caption" color="text.secondary">{t('tagline')}</Typography></Stack>;
  return <Box sx={{ minHeight: '100svh' }}>
    <a className="skip-link" href="#main-content">{t('skip')}</a>
    <Box component="aside" sx={{ display: { xs: 'none', md: 'flex' }, position: 'fixed', inset: '0 auto 0 0', width: 264, p: 3, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', flexDirection: 'column', gap: 5 }}>
      {brand}{navigation()}
      <Box sx={{ mt: 'auto' }}><Divider sx={{ mb: 2 }} /><Typography variant="caption" color="text.secondary">{t('footer')}</Typography></Box>
    </Box>
    <Drawer open={open} onClose={() => setOpen(false)} sx={{ display: { md: 'none' } }} slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': t('navigation'), sx: { width: 'min(320px, 90vw)', p: 3 } } }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>{brand}<IconButton aria-label={t('closeMenu')} onClick={() => setOpen(false)}><Box component="span" aria-hidden="true">×</Box></IconButton></Stack>
      {navigation()}
    </Drawer>
    <Box sx={{ ml: { md: '264px' } }}>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: { xs: 2, md: 5 }, py: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton aria-label={t('openMenu')} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)} sx={{ display: { md: 'none' } }}><Box component="span" aria-hidden="true">☰</Box></IconButton>
            <Typography sx={{ display: { md: 'none' }, fontWeight: 700 }}>Home Budget</Typography>
            <Chip size="small" variant="outlined" label={t('preview')} sx={{ display: { xs: 'none', md: 'flex' }, color: 'text.secondary' }} />
          </Stack>
          <Stack spacing={1}><Preferences />{sessionControl}</Stack>
        </Stack>
      </Box>
      <Box component="main" id="main-content" tabIndex={-1} sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 4, lg: 6 }, outline: 'none' }}>{children}</Box>
    </Box>
  </Box>;
}

function ContextNavigation({render}:{render:(period:string|null)=>ReactNode}){
  const query=useSearchParams(),values=query?.getAll('period')??[],period=values.length===1?parsePeriod(values[0]):null;
  return render(period?.ok?period.value:null);
}
