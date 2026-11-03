'use client';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
export function RetryManagementLoad(){const router=useRouter(),t=useTranslations('management');return <Button onClick={()=>router.refresh()}>{t('retry')}</Button>;}
