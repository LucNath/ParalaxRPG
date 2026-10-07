import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ path: '.env', quiet: true });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'npm run dev --workspace @paralax/api', url: 'http://127.0.0.1:4000/api/v1/health/ready', reuseExistingServer: !process.env.CI, timeout: 120000 },
    { command: 'npm run dev --workspace @paralax/web', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, timeout: 120000 },
  ],
});
