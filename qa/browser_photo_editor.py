"""Photo-editor interaction regressions, using a JPEG uploaded as a user's file.

Exercises real pointer gestures and real JSON downloads. The generated demo JPEG
is only a repeatable UI fixture: these checks do not establish real-photo accuracy.
"""
import json
import math
import os
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = pathlib.Path(os.environ.get('DENLI_QA_OUT', str(ROOT / 'qa/results/current')))
URL = os.environ.get('DENLI_TEST_URL', 'http://127.0.0.1:8765')
CHROME = os.environ.get('DENLI_CHROME')
TARGETS = {
    'wall': [[174, 211], [896, 211], [898, 729], [174, 729]],
    'ref': [[581, 425], [622, 425], [622, 481], [581, 481]],
}
OUT.mkdir(parents=True, exist_ok=True)


def points(page):
    """Read displayed image-space annotations, without changing application state."""
    return page.locator('#points g').evaluate_all('''groups => Object.fromEntries(
      ['wall','ref'].map(key => [key, groups.filter(g => g.dataset.key === key)
        .map(g => {const c=g.querySelector('circle');return [+c.getAttribute('cx'),+c.getAttribute('cy')];})]))''')


def assert_points(actual, expected, tolerance=1e-6):
    for key, corners in expected.items():
        for index, target in enumerate(corners):
            for axis in range(2):
                assert math.isclose(actual[key][index][axis], target[axis], abs_tol=tolerance), (key, index, actual, expected)


def dimensions(page):
    return [int(page.locator('#wall-length').input_value()), int(page.locator('#wall-height').input_value())]


def assert_unconfirmed(page):
    assert page.locator('.walltab .dot.ok').count() == 0
    assert page.locator('#confirm-dimensions').inner_text() == 'Використати ці розміри'


def measure_and_confirm(page):
    page.locator('#measure').click()
    message = page.locator('#measurement-result').inner_text()
    assert 'Чутливість' in message, message
    page.locator('#confirm-dimensions').click()
    assert 'Оцінка за фото' in page.locator('#dimension-source').inner_text()
    assert page.locator('.walltab .dot.ok').count() == 1


def drag_annotations(page):
    for key, corners in TARGETS.items():
        for index, (x, y) in enumerate(corners):
            circle = page.locator(f'#points [data-key="{key}"][data-index="{index}"] circle')
            circle.scroll_into_view_if_needed()
            start = circle.bounding_box()
            svg = page.locator('#points').bounding_box()
            width, height = page.locator('#room-image').evaluate('im => [im.naturalWidth, im.naturalHeight]')
            page.mouse.move(start['x'] + start['width'] / 2, start['y'] + start['height'] / 2)
            page.mouse.down()
            page.mouse.move(svg['x'] + x / width * svg['width'], svg['y'] + y / height * svg['height'], steps=5)
            page.mouse.up()
    assert_points(points(page), TARGETS, tolerance=0.1)


def pan_photo(page):
    """Find visible background away from handles, then pan with a pointer drag."""
    page.locator('#photo-scroll').scroll_into_view_if_needed()
    origin = page.locator('#photo-scroll').evaluate('''frame => {
      const f=frame.getBoundingClientRect(),svg=frame.querySelector('svg'),s=svg.getBoundingClientRect();
      const im=frame.querySelector('img');
      const handles=[...svg.querySelectorAll('circle')].map(c => [
        s.left+(+c.getAttribute('cx'))/im.naturalWidth*s.width,
        s.top+(+c.getAttribute('cy'))/im.naturalHeight*s.height]);
      const x0=Math.max(f.left,s.left,0)+55,x1=Math.min(f.right,s.right,innerWidth)-55;
      const y0=Math.max(f.top,s.top,0)+55,y1=Math.min(f.bottom,s.bottom,innerHeight)-55;
      for(let x=x0;x<=x1;x+=30)for(let y=y0;y<=y1;y+=30)
        if(svg.contains(document.elementFromPoint(x,y)) && handles.every(p=>Math.hypot(p[0]-x,p[1]-y)>35))return {x,y,left:frame.scrollLeft,top:frame.scrollTop};
      return null;
    }''')
    assert origin, 'No visible background region for the pan gesture'
    page.mouse.move(origin['x'], origin['y'])
    page.mouse.down()
    page.mouse.move(origin['x'] - 40, origin['y'] - 35, steps=5)
    page.mouse.up()
    scroll = page.locator('#photo-scroll').evaluate('f => [f.scrollLeft, f.scrollTop]')
    assert abs(scroll[0] - origin['left']) > 10 or abs(scroll[1] - origin['top']) > 10, (origin, scroll)


results = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME, args=['--no-sandbox'])
    for viewport in [390, 1280]:
        page = browser.new_page(viewport={'width': viewport, 'height': 1000}, accept_downloads=True, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='domcontentloaded')
        page.locator('#next').click()
        page.locator('#room-file').set_input_files(str(ROOT / 'assets/demo-room.jpg'))
        page.wait_for_function('document.querySelectorAll("#points g").length === 8')
        assert page.locator('#room-image').get_attribute('src').startswith('blob:')
        assert 'Масштаб фото ще не визначено' in page.locator('#dimension-source').inner_text()
        # No click on the canned demo button and no direct assignment of points.
        drag_annotations(page)
        measure_and_confirm(page)
        original_points = points(page)
        original_dimensions = dimensions(page)
        assert original_dimensions == [3700, 2750]

        # Zoom and pan are view operations; they must preserve geometry and approval.
        for expected in ['200%', '300%', '400%']:
            page.locator('#zoom-in').click()
            assert page.locator('#zoom-level').inner_text() == expected
            assert_points(points(page), original_points)
            assert dimensions(page) == original_dimensions
            assert page.locator('.walltab .dot.ok').count() == 1
        assert page.locator('#zoom-in').is_disabled()
        pan_photo(page)
        assert_points(points(page), original_points)
        assert dimensions(page) == original_dimensions
        assert page.locator('.walltab .dot.ok').count() == 1

        # Picking an off-centre handle without moving must not jump its annotation.
        page.locator('#photo-editor details summary').click()
        page.locator('#active-point').select_option('wall-1')
        circle = page.locator('#points [data-key="wall"][data-index="1"] circle')
        circle.scroll_into_view_if_needed()
        box = circle.bounding_box()
        page.mouse.move(box['x'] + box['width'] / 2 + 4, box['y'] + box['height'] / 2 + 2)
        page.mouse.down()
        page.mouse.up()
        assert_points(points(page), original_points)
        assert page.locator('.walltab .dot.ok').count() == 1

        # Selector/nudge must affect exactly the selected point and invalidate scale.
        page.locator('#active-point').select_option('ref-2')
        assert_points(points(page), original_points)
        page.locator('[data-nudge="left"]').click()
        changed = json.loads(json.dumps(original_points))
        changed['ref'][2][0] -= 1
        assert_points(points(page), changed)
        assert_unconfirmed(page)
        assert 'Масштаб фото ще не визначено' in page.locator('#dimension-source').inner_text()
        page.locator('#confirm-dimensions').click()
        page.locator('#next').click()
        assert page.locator('#room-file').count() == 1
        page.locator('[data-nudge="right"]').click()
        assert_points(points(page), original_points)
        assert_unconfirmed(page)
        for expected in ['300%', '200%', '100%']:
            page.locator('#zoom-out').click()
            assert page.locator('#zoom-level').inner_text() == expected
        assert page.locator('#zoom-out').is_disabled()
        measure_and_confirm(page)
        assert dimensions(page) == original_dimensions

        # Empty inputs cannot convert missing values into accepted zero dimensions.
        for field in ['wall-length', 'wall-height']:
            saved = page.locator('#' + field).input_value()
            page.locator('#' + field).fill('')
            page.locator('#confirm-dimensions').click()
            assert page.locator('#' + field).evaluate('el => el.validity.valueMissing')
            assert_unconfirmed(page)
            page.locator('#next').click()
            assert page.locator('#room-file').count() == 1
            page.locator('#' + field).fill(saved)
            measure_and_confirm(page)

        # Keep the default minimal style: this also covers the former 2750 mm blocker.
        page.locator('#next').click()
        assert page.locator('[data-style="minimal"]').get_attribute('aria-pressed') == 'true'
        page.locator('#next').click()
        page.locator('#budget').fill('')
        page.locator('#next').click()
        assert page.locator('#budget').count() == 1
        assert page.locator('#budget').evaluate('el => el.validity.valueMissing')
        page.locator('#budget').fill('200000')
        page.locator('#next').click()
        assert page.locator('#review-errors').inner_text() == ''
        page.locator('#next').click()
        with page.expect_download() as download:
            page.locator('#export-project').click()
        assert download.value.suggested_filename == 'denli-project.json'
        destination = OUT / f'photo-editor-project-{viewport}.json'
        download.value.save_as(destination)
        project = json.loads(destination.read_text())
        assert project['schema'] == 'denli-project/1'
        assert project['status'] == 'draft-not-for-production'
        assert project['measurement'][0]['source'] == 'photo'
        assert project['measurement'][0]['confirmed'] is True
        assert_points(project['measurement'][0]['points'], original_points)
        assert project['input']['walls'] == [{'length': 3700, 'height': 2750}]
        assert project['input']['style'] == 'minimal'
        assert project['plan']['valid'] is True
        assert project['quote']['total'] > 0
        assert project['quote']['total'] == sum(line['v'] for line in project['quote']['lines'])
        assert 'blob:' not in json.dumps(project)
        assert errors == [], errors
        results.append({'viewport': viewport, 'status': 'passed', 'dimensions': original_dimensions,
                        'source': 'photo', 'quote_total': project['quote']['total'],
                        'json_download': destination.name, 'browser_errors': errors})
        page.close()
    browser.close()

report = {'status': 'passed', 'fixture': 'uploaded generated demo JPEG; no real accuracy claim',
          'checks': ['eight pointer-dragged annotations', 'zoom 1–4 and pan preserve geometry',
                     'off-centre handle press does not jump', 'selector/nudge invalidates scale',
                     'empty dimensions and budget blocked', 'default style at measured 2750 mm',
                     'actual JSON downloads retain photo provenance'], 'runs': results}
(OUT / 'photo-editor-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
