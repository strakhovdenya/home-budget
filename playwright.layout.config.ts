import {defineConfig} from '@playwright/test';
import {allLayoutCases,journeyCases} from './scripts/e2e/layout-harness';
const name=process.env.HB_H_CASE;
if(process.cwd()!=='/work'||!/^[a-f0-9]{32}$/.test(process.env.HB_E2E_RUN_ID??'')||!allLayoutCases.includes(name??''))throw Error('H_ISOLATED_CASE_REQUIRED');
const locale=name!.startsWith('H-DE')?'de':name!.startsWith('H-EN')?'en':'ru';
const width=name!.split('-')[2]==='320'?320:name!.split('-')[2]==='375'?375:1280;
const webkit = name!.startsWith('H-WK');
const baseURL = webkit ? 'https://127.0.0.1:3443' : 'http://127.0.0.1:3000';
let testMatch = 'layout.spec.ts';
if (journeyCases.includes(name!)) testMatch = 'journey.spec.ts';
if (name === 'H-LABELS') testMatch = 'label.spec.ts';
if (name === 'H-FILTERS') testMatch = 'history-filter.spec.ts';
if (name!.includes('-A11Y')) testMatch = 'accessibility.spec.ts';
export default defineConfig({
 testDir:'./tests/layout-e2e',testMatch,workers:1,fullyParallel:false,retries:0,forbidOnly:true,timeout:name!.includes('-A11Y')?240000:150000,
 reporter:[['./tests/e2e/support/layout-reporter.ts']],outputDir:'/work/test-results/h-artifacts',
 use:{baseURL,ignoreHTTPSErrors:webkit,browserName:name!.startsWith('H-FF')?'firefox':name!.startsWith('H-WK')?'webkit':'chromium',locale,timezoneId:'Europe/Berlin',viewport:{width,height:width===320?800:width===375?812:900},serviceWorkers:'block',trace:'off',video:'off',screenshot:'off',actionTimeout:10000,navigationTimeout:20000},
 webServer:{command:'node --import tsx tests/e2e/support/layout-server.ts',url:baseURL+'/login',ignoreHTTPSErrors:webkit,reuseExistingServer:false,timeout:60000,gracefulShutdown:{signal:'SIGTERM',timeout:5000}},
});
