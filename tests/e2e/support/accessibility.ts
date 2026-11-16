import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Reach controls by real Tab events: no focus(), click(), or application handlers.
export async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  for (let step = 0; step < 160; step++) {
    if (await target.evaluate(element => element === document.activeElement)) {
      const focus = await target.evaluate(element => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        const field = element.closest('.MuiInputBase-root');
        return {
          keyboard: element.matches(':focus-visible'), outline: style.outlineStyle,
          outlineWidth: style.outlineWidth, shadow: style.boxShadow,
          componentFocus: element.classList.contains('Mui-focusVisible') || !!field?.classList.contains('Mui-focused'),
          visible: bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth,
        };
      });
      expect(focus.keyboard && focus.visible, 'I_VISIBLE_KEYBOARD_FOCUS').toBe(true);
      expect(focus.componentFocus || (focus.outline !== 'none' && focus.outlineWidth !== '0px') || focus.shadow !== 'none',
        'I_FOCUS_INDICATOR_PRESENT').toBe(true);
      test.info().annotations.push({ type: 'keyboard-focus', description: JSON.stringify(focus) });
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw Error('I_CONTROL_UNREACHABLE_BY_TAB');
}

export async function activate(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter') {
  await tabTo(page, target);
  await page.keyboard.press(key);
}

export async function typeText(page: Page, target: Locator, text: string) {
  await tabTo(page, target);
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(text);
  await expect(target).toHaveValue(text);
}

export async function auditAccessibility(page: Page, stage: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const violations = result.violations.map(rule => ({ id: rule.id, impact: rule.impact,
    nodes: rule.nodes.map(node => ({ target: node.target, failure: node.failureSummary })) }));
  test.info().annotations.push({ type: 'axe', description: JSON.stringify({ stage, version: result.testEngine.version,
    violations, incomplete: result.incomplete.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => node.target) })),
    passes: result.passes.length }) });
  expect(violations, `I_WCAG_A_AA_${stage}`).toEqual([]);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, includeHidden: true })).toHaveCount(1);
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByRole('main')).toHaveCount(0);
  } else {
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
}
