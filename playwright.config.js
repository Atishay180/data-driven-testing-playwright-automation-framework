// @ts-check
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CommonUtilities } from './src/utils/CommonUtilities.js';

// ESM has no __dirname, so build it
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Locally this loads .env; in CI there is no .env, so values come from the workflow's env:
dotenv.config({ path: path.resolve(__dirname, '.env') });

// One report folder per run, decided once in the main process.
// Workers are started after this line and inherit the value.
process.env.REPORT_PATH ??= path.join('reports', CommonUtilities.getCurrentDate());

export default defineConfig({
  testDir: './src/tests',

  fullyParallel: true,                  // every Excel row is its own test, so rows can run in parallel
  forbidOnly: !!process.env.CI,         // fail if someone left test.only in the code
  retries: process.env.CI ? 1 : 0,      // retries ONE failed row, not the whole sheet
  workers: Number(process.env.MAX_PARALLEL_EXECUTIONS) || 2,   // same default (2) as your old code

  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'results/junit.xml' }],
    ['list'],
    ['./src/reporters/ExcelReporter.js'],   // writes reports/<date>/ExecutionReport.xlsx
  ],

  timeout: 10 * 60 * 1000,              // now a true PER-ROW timeout (10 min)

  expect: {
    timeout: 40 * 1000
  },

  use: {
    baseURL: process.env.BASE_URL,
    actionTimeout: 30 * 1000,
    browserName: 'chromium',
    headless: !!process.env.CI,         // visible browser locally, headless in CI
    trace: 'retain-on-failure',         // these two now really apply, because we use the built-in page
    screenshot: 'only-on-failure',
  },
});