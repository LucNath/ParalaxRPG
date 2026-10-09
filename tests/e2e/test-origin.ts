import { test } from '@playwright/test';

/** Keep API fixture Origin and anonymous URLs aligned with the browser under test. */
export function testOrigin() {
  return new URL(test.info().project.use.baseURL ?? 'http://localhost:3000').origin;
}
