'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Alert, Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Preferences } from '@/shared/ui/preferences';
import { SectionIcon } from './section-icon';
import { sectionPaths, type Section } from './sections';

export function PlaceholderScreen({ section }: { section: Section }) {
  const t = useTranslations('screens');
  const nav = useTranslations('navigation');
  const preferences = useTranslations('preferences');
  return <Stack spacing={{ xs: 3, md: 4 }}>
    <Box><Typography variant="overline" color="primary.main">{t('eyebrow')}</Typography><Typography component="h1" variant="h1" sx={{ mt: 1 }}>{nav(section)}</Typography></Box>
    <Card variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderColor: 'divider' }}>
      <CardContent>
        <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', bgcolor: 'action.selected', color: 'primary.main', borderRadius: 3, mb: 3 }}><SectionIcon section={section} /></Box>
        <Typography component="h2" variant="h2" sx={{ mb: 2 }}>{t(`${section}.title`)}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 640, mb: 3 }}>{t(`${section}.description`)}</Typography>
        {section === 'settings' ? <Stack spacing={2} sx={{ maxWidth: 480 }}><Preferences /><Typography variant="body2" color="text.secondary">{preferences('saved')}</Typography></Stack>
          : <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}><Chip label={t('status')} variant="outlined" color="warning" /><Typography variant="body2" color="text.secondary">{t('empty')}</Typography></Stack>}
      </CardContent>
    </Card>
    {section === 'overview' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
      {(['obligations', 'savings', 'months'] as const).map((item) => <Card key={item} variant="outlined">
        <CardActionArea component={Link} href={sectionPaths[item]} sx={{ height: '100%' }}><CardContent sx={{ p: 3 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 3 }}><SectionIcon section={item} /><Box component="span" aria-hidden="true" color="text.secondary">↗</Box></Stack>
          <Typography component="h2" variant="h3" sx={{ mb: 1 }}>{nav(item)}</Typography>
          <Typography variant="body2" color="text.secondary">{t('status')}</Typography>
        </CardContent></CardActionArea>
      </Card>)}
    </Box>}
    <Alert severity="info" variant="outlined" sx={{ alignItems: 'center' }}>{t('notice')}</Alert>
  </Stack>;
}
