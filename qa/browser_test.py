"""Prototype workflow checks; no claim of measurement or pricing accuracy."""
import json, pathlib, os
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = pathlib.Path(os.environ.get('DENLI_QA_OUT', str(ROOT/'qa/results/current')))
OUT.mkdir(parents=True,exist_ok=True)
URL = os.environ.get('DENLI_TEST_URL','http://127.0.0.1:8765')
CHROME = os.environ.get('DENLI_CHROME')
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=CHROME,args=['--no-sandbox'])
 for width,layout in [(1440,'straight'),(390,'L'),(768,'U')]:
  page=browser.new_page(viewport={'width':width,'height':1000},accept_downloads=True)
  errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL,wait_until='networkidle')
  assert page.locator('#cfg-body button').count()==3
  assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
  page.screenshot(path=str(OUT/f'landing-{width}.png'),full_page=True)
  page.locator(f'[data-layout="{layout}"]').click()
  page.locator('#next').click()
  # Missing wall dimensions must prevent silent advancement.
  page.locator('#next').click()
  assert page.locator('#room-file').count()==1
  for wall in range({'straight':1,'L':2,'U':3}[layout]):
   page.locator(f'[data-wall="{wall}"]').click()
   page.locator('#demo-room').click()
   page.locator('#room-image').wait_for()
   page.wait_for_function('document.querySelector("#room-image").naturalWidth > 0')
  if layout=='straight':
   # Real file-upload path, point editing, wrong geometry rejection, then valid demo.
   page.locator('#room-file').set_input_files(str(ROOT/'assets/demo-room.jpg'))
   page.wait_for_function('document.querySelector("#room-image").src.startsWith("blob:")')
   assert 'Масштаб фото ще не визначено' in page.locator('#dimension-source').inner_text()
   page.locator('#demo-room').click()
   page.wait_for_function('document.querySelector("#points g") !== null')
   page.locator('#measure').click()
   assert 'Чутливість' in page.locator('#measurement-result').inner_text()
   length=int(page.locator('#wall-length').input_value())
   assert 3000<length<4500
   page.locator('#confirm-dimensions').click()
  page.locator('#next').click()
  page.locator('[data-style="scandi"]').click()
  page.locator('#reference-url').fill('javascript:alert(1)')
  page.locator('#add-reference').click()
  assert page.locator('#references .chip').count()==0
  page.locator('#reference-url').fill('https://pinterest.com/example/')
  page.locator('#add-reference').click()
  page.locator('#reference-file').set_input_files(str(ROOT/'assets/style-walnut.jpg'))
  page.wait_for_function('document.querySelectorAll("#references .chip").length === 2')
  page.locator('#next').click()
  page.locator('#notes').fill('<img src=x onerror=alert(1)> Побажання до проєкту')
  page.locator('#next').click()
  page.locator('#next').click()
  page.locator('#export-project').wait_for()
  assert 'Не рендер вашого проєкту' in page.locator('#cfg-body').inner_text()
  assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
  with page.expect_download() as download:
   page.locator('#export-project').click()
  path=OUT/f'project-{layout}.json';download.value.save_as(path)
  data=json.loads(path.read_text())
  assert data['schema']=='denli-project/1'
  assert data['status']=='draft-not-for-production'
  assert len(data['plan']['walls'])=={'straight':1,'L':2,'U':3}[layout]
  assert data['quote']['total']==sum(l['v'] for l in data['quote']['lines'])
  assert data['references'][1]['included'] is False
  assert not any('blob:' in json.dumps(v) for v in data.values())
  page.locator('.internal summary').click()
  with page.expect_download() as download:
   page.locator('#export-parts').click()
  csvpath=OUT/f'parts-{layout}.csv';download.value.save_as(csvpath)
  assert 'DRAFT NOT FOR PRODUCTION' in csvpath.read_text(encoding='utf-8-sig')
  page.evaluate('window.print = () => { window.printRequested = true; }')
  page.locator('#print').click()
  assert page.evaluate('window.printRequested === true')
  assert page.locator('#kp-print img').count()==0 # notes HTML is escaped
  page.emulate_media(media='print')
  page.pdf(path=str(OUT/f'proposal-{layout}.pdf'),format='A4',print_background=True)
  page.emulate_media(media='screen')
  page.locator('#cfg').screenshot(path=str(OUT/f'result-{width}.png'))
  assert errors==[],errors
  results.append({'viewport':width,'layout':layout,'browser_errors':errors,'quote_total':data['quote']['total']})
  # Changing input recalculates; impossible dimensions refuse a quote.
  page.locator('#back').click()
  page.locator('#back').click()
  page.locator('#back').click()
  page.locator('#back').click()
  page.locator('[data-wall="0"]').click()
  page.locator('#wall-length').fill('1200')
  page.locator('#confirm-dimensions').click()
  for _ in range(3):page.locator('#next').click()
  page.locator('#next').click()
  assert page.locator('#export-project').count()==0
  assert len(page.locator('#review-errors').inner_text())>0
  page.close()
 browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
print(json.dumps(results,ensure_ascii=False))
