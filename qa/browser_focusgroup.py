"""First-visit usability regression checks for the course focus-group demo.

Runs against an existing local server. Uses the same DENLI_* environment
variables as the other browser checks; screenshots are written under focusgroup/.
"""
import json
import os
from pathlib import Path
import re

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('DENLI_QA_OUT', str(ROOT / 'qa/results/current'))) / 'focusgroup'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('DENLI_TEST_URL', 'http://127.0.0.1:8765')
CHROME = os.environ.get('DENLI_CHROME')


def luminance(color):
    channels = [int(value) / 255 for value in re.findall(r'\d+', color)[:3]]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
    return sum(v * weight for v, weight in zip(linear, [.2126, .7152, .0722]))


def snapshot(page, width, step):
    bounds = page.locator('#cfg').evaluate('''root => {
      const box = root.getBoundingClientRect();
      return {
        client: root.clientWidth, scroll: root.scrollWidth, left: root.scrollLeft,
        buttons: [...root.querySelectorAll('#cfg-foot button')]
          .filter(el => !el.hidden).map(el => {
            const r = el.getBoundingClientRect();
            return {text: el.textContent, fits: r.left >= box.left && r.right <= box.right};
          })
      };
    }''')
    assert bounds['scroll'] <= bounds['client'] + 1, (width, step, bounds)
    assert bounds['left'] == 0, (width, step, bounds)
    assert all(button['fits'] for button in bounds['buttons']), (width, step, bounds)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, step)
    page.locator('#cfg').screenshot(path=str(OUT / f'{width}-step-{step}.png'))


results = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME, args=['--no-sandbox'])
    for width in [320, 390, 1440]:
        page = browser.new_page(
            viewport={'width': width, 'height': 900}, reduced_motion='reduce',
            is_mobile=width < 600, has_touch=width < 600, accept_downloads=True,
        )
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        colors = page.locator('.top .btn-primary').evaluate('''el => ({
          color: getComputedStyle(el).color,
          background: getComputedStyle(el).backgroundColor
        })''')
        light, dark = sorted([luminance(colors['color']), luminance(colors['background'])], reverse=True)
        ratio = (light + .05) / (dark + .05)
        assert ratio >= 4.5, (width, 'header CTA contrast', colors, ratio)
        page.locator('.top .btn-primary').click()
        # A user following the main CTA must see the start of the configurator.
        page.wait_for_function('''() => document.querySelector('#cfg').getBoundingClientRect().top
          >= document.querySelector('.top').getBoundingClientRect().bottom - 1''')
        snapshot(page, width, 1)
        page.locator('#next').click()
        page.locator('#demo-room').click()
        page.wait_for_function('document.querySelector("#room-image").naturalWidth > 0')
        snapshot(page, width, 2)
        if width < 600:
            # A phone user can enlarge the small reference and pan without
            # accidentally changing the calibration points.
            for _ in range(3):
                page.locator('#zoom-in').click()
            assert page.locator('#zoom-level').inner_text() == '400%'
            frame = page.locator('#photo-scroll')
            frame.scroll_into_view_if_needed()
            initial_points = page.locator('#points circle').evaluate_all(
                'els => els.map(el => [el.getAttribute("cx"), el.getAttribute("cy")])')
            before = frame.evaluate('el => ({x: el.scrollLeft, y: el.scrollTop})')
            box = frame.bounding_box()
            touch = page.context.new_cdp_session(page)
            start = {'x': box['x'] + 70, 'y': box['y'] + 100}
            touch.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [start]})
            touch.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [
                {'x': start['x'] - 40, 'y': start['y'] - 50}]})
            touch.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            after = frame.evaluate('el => ({x: el.scrollLeft, y: el.scrollTop})')
            assert after['x'] > before['x'] and after['y'] > before['y'], (width, before, after)
            assert initial_points == page.locator('#points circle').evaluate_all(
                'els => els.map(el => [el.getAttribute("cx"), el.getAttribute("cy")])')
            snapshot(page, width, '2-zoom')
            touch.detach()
            for _ in range(3):
                page.locator('#zoom-out').click()
        page.locator('#measure').click()
        assert 'Чутливість' in page.locator('#measurement-result').inner_text()
        page.locator('#confirm-dimensions').click()
        # Keep the default style: a first-time visitor need not discover a hidden
        # requirement to change selections before reaching their first result.
        page.locator('#next').click()
        snapshot(page, width, 3)
        page.locator('#next').click()
        snapshot(page, width, 4)
        page.locator('#next').click()
        snapshot(page, width, 5)
        assert not page.locator('#review-errors').inner_text().strip()
        page.locator('#next').click()
        page.locator('#export-project').wait_for()
        snapshot(page, width, 'result')
        with page.expect_download() as download:
            page.locator('#export-project').click()
        project_path = OUT / f'project-{width}.json'
        download.value.save_as(project_path)
        project = json.loads(project_path.read_text())
        assert project['schema'] == 'denli-project/1'
        assert project['quote']['total'] > 0
        assert errors == [], errors
        results.append({'width': width, 'all_steps_fit': True, 'header_contrast': round(ratio, 2),
                        'exported_total': project['quote']['total'], 'browser_errors': errors})
        page.close()
    browser.close()

(OUT / 'results.json').write_text(json.dumps(results, indent=2, ensure_ascii=False))
print(json.dumps(results, ensure_ascii=False))
