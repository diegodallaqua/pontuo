import { expect, test } from '@playwright/test';
import { makeExam, mockContractApi } from './contract-api';
test('diagnóstico overflow', async ({ page }) => {
  await mockContractApi(page, {
    exam: makeExam({ startedAt: '2026-10-14T10:00:00', finishedAt: '2026-10-14T10:20:00', answeredCount: 0, correctCount: 0, accuracy: 0 }),
  });
  await page.goto('/simulados/100/revisao?questao=1');
  await expect(page.getByText('Resolução comentada')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const report = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - width;
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => el.getBoundingClientRect().right > width + 1)
      .slice(0, 6)
      .map((el) => `${el.tagName}.${el.className} right=${Math.round(el.getBoundingClientRect().right)}`);
    return { overflow, inner: window.innerWidth, offenders };
  });
  if (report.overflow > 0) console.log('OVERFLOW', JSON.stringify(report));
});
