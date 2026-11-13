"""Regressions: photo provenance, stale annotations and upload races."""
import json, pathlib, os
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('DENLI_CHROME'),args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1200,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('DENLI_TEST_URL','http://127.0.0.1:8765'),wait_until='domcontentloaded')
 page.locator('#next').click()
 page.locator('#room-file').set_input_files(str(root/'assets/demo-room.jpg'))
 page.wait_for_function('document.querySelector("#room-image").src.startsWith("blob:")')
 page.locator('#confirm-dimensions').click()
 assert 'Масштаб фото ще не визначено' in page.locator('#dimension-source').inner_text()
 page.locator('#next').click();assert page.locator('#room-file').count()==1
 page.locator('#ref-type').select_option('card')
 page.locator('#demo-room').click()
 assert page.locator('#ref-type').input_value()=='a4'
 assert page.locator('#ref-orientation').input_value()=='portrait'
 page.wait_for_function('document.querySelectorAll("#points g").length === 8')
 page.locator('#measure').click();assert 'Чутливість' in page.locator('#measurement-result').inner_text()
 page.locator('#points g').first.focus();page.keyboard.press('ArrowRight')
 page.locator('#confirm-dimensions').click()
 assert 'Масштаб фото ще не визначено' in page.locator('#dimension-source').inner_text()
 page.locator('#next').click();assert page.locator('#room-file').count()==1
 # A slow pending decode must not overwrite a user's newer demo choice.
 page.evaluate('''() => { const original=HTMLImageElement.prototype.decode; HTMLImageElement.prototype.decode=async function(){await new Promise(r=>setTimeout(r,500));return original.call(this);}; }''')
 page.locator('#room-file').set_input_files(str(root/'assets/style-walnut.jpg'))
 page.locator('#demo-room').click()
 page.wait_for_timeout(800)
 assert page.locator('#room-image').get_attribute('src')=='assets/demo-room.jpg'
 page.locator('#wall-length').fill('4000');page.locator('#confirm-dimensions').click()
 assert 'вручну' in page.locator('#dimension-source').inner_text()
 page.locator('#next').click();assert page.locator('[data-style]').count()==6
 assert errors==[],errors
 b.close()
out=pathlib.Path(os.environ.get('DENLI_QA_OUT',str(root/'qa/results/current')))
out.mkdir(parents=True,exist_ok=True)
(out/'provenance-results.json').write_text(json.dumps({'status':'passed','checks':['unscaled defaults stay unscaled','demo resets reference','point edits require recalculation','new choice wins pending image decode','explicit manual entry accepted'],'browser_errors':errors},ensure_ascii=False,indent=2))
print('Provenance regression checks passed')
