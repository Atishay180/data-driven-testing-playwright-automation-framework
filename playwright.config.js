// @ts-check
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './src/tests',

  reporter: 'html',

  timeout: 10 * 60 * 1000,  //10 min

  expect: {
    timeout: 40 * 1000
  },

  use: {
    actionTimeout: 30 * 1000,

    browserName: "chromium",

    trace: 'retain-on-failure',

    screenshot: "only-on-failure",

    headless: false,
  },

});

