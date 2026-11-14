#!/usr/bin/env python3
"""Build the portable DENLI handoff from repository Markdown, using only Python stdlib."""
from __future__ import annotations

import argparse
import html
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def inline(text: str) -> str:
    saved: list[str] = []

    def hold(value: str) -> str:
        saved.append(value)
        return f"\x00{len(saved) - 1}\x00"

    text = re.sub(r"`([^`]+)`", lambda m: hold("<code>" + html.escape(m[1]) + "</code>"), text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^\s)]+)\)",
        lambda m: hold('<a href="' + html.escape(m[2], quote=True) + '">' + html.escape(m[1]) + "</a>"),
        text,
    )
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\x00(\d+)\x00", lambda m: saved[int(m[1])], text)
    return text


def sanitize(source: str, kind: str) -> str:
    """Drop local session recovery notes and make existing document links portable."""
    if kind == "research":
        source = re.sub(
            r"## 1\. Восстановленный запрос\n.*?(?=\n## 2\.)",
            "## 1. Задача исследования\n\n"
            "Фото помещения и визуальные референсы → предварительный проект и расчёт → точный замер перед производством. "
            "Для прототипа созданы собственные стартовые модули, правила и условные цены. "
            "Они не являются утверждёнными производственными данными DENLI. "
            "Внешняя система — **VIYAR PRO**; её форматы и ограничения описаны в [интеграционном обзоре](docs/INTEGRATION.md). "
            "Целевая погрешность расчёта стоимости остаётся ±5%.\n",
            source,
            flags=re.S,
        )
    else:
        source = re.sub(
            r"## Восстановленный контекст\n.*?(?=\n## Подтверждённые)",
            "## Задача интеграции\n\n"
            "Фото помещения и референсы → предварительный дизайн и бюджет → точный замер. "
            "Производственное продолжение: модель → деталировка с каждой кромкой и обработкой → расчёт поставщика → смета DENLI. "
            "Целевая внешняя система — **VIYAR PRO**.\n",
            source,
            flags=re.S,
        )
    source = re.sub(r"\]\(/[^)\n]+/data/demo-catalog\.json\)", "](data/demo-catalog.json)", source)
    source = re.sub(r"\]\(/[^)\n]+/INTEGRATION\.md\)", "](docs/INTEGRATION.md)", source)
    source = source.replace("](../INTEGRATION.md)", "](docs/INTEGRATION.md)")
    source = source.replace("](../../data/demo-catalog.json)", "](data/demo-catalog.json)")
    source = source.replace("](../data/demo-catalog.json)", "](data/demo-catalog.json)")
    # Repository Markdown is relative to its own location; the artifact sits at the root.
    source = source.replace("](../../sketchup/README.md)", "](sketchup/README.md)")
    source = source.replace("](../sketchup/README.md)", "](sketchup/README.md)")
    return source


def render_markdown(source: str, prefix: str) -> tuple[str, str]:
    """Render the simple heading/list/table/code subset used by the supplied documents."""
    lines = source.splitlines()
    out: list[str] = []
    toc: list[str] = []
    paragraph: list[str] = []
    list_tag: str | None = None
    count = 0
    i = 0

    def flush() -> None:
        if paragraph:
            out.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    def close_list() -> None:
        nonlocal list_tag
        if list_tag:
            out.append(f"</{list_tag}>")
            list_tag = None

    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            flush()
            close_list()
            block: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i])
                i += 1
            out.append("<pre><code>" + html.escape("\n".join(block)) + "</code></pre>")
        elif re.match(r"^#{1,6} ", line):
            flush()
            close_list()
            depth, title = line.split(" ", 1)
            if len(depth) > 1:
                count += 1
                anchor = f"{prefix}-{count}"
                level = min(len(depth) + 1, 6)
                out.append(f'<h{level} id="{anchor}">' + inline(title) + f"</h{level}>")
                if len(depth) == 2:
                    toc.append(f'<li><a href="#{anchor}">' + html.escape(title) + "</a></li>")
        elif line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|\-]+\|", lines[i + 1]):
            flush()
            close_list()
            headers = [cell.strip() for cell in line.strip().strip("|").split("|")]
            out.append('<div class="table-scroll" tabindex="0" role="region" aria-label="Таблица с горизонтальной прокруткой"><table><thead><tr>')
            out.extend("<th scope=\"col\">" + inline(cell) + "</th>" for cell in headers)
            out.append("</tr></thead><tbody>")
            i += 2
            while i < len(lines) and lines[i].startswith("|"):
                cells = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                out.append("<tr>" + "".join("<td>" + inline(cell) + "</td>" for cell in cells) + "</tr>")
                i += 1
            out.append("</tbody></table></div>")
            continue
        elif re.match(r"^(?:[-*] |\d+\. )", line):
            flush()
            wanted = "ol" if re.match(r"^\d+\.", line) else "ul"
            if list_tag != wanted:
                close_list()
                list_tag = wanted
                out.append(f"<{wanted}>")
            item = re.sub(r"^(?:[-*] |\d+\. )", "", line)
            out.append("<li>" + inline(item) + "</li>")
        elif not line.strip():
            flush()
            close_list()
        else:
            close_list()
            paragraph.append(line)
        i += 1
    flush()
    close_list()
    return "\n".join(out), "<ol class=\"doc-toc\">" + "".join(toc) + "</ol>"


STYLE = r"""
:root{color-scheme:light;--bg:#f5f1ea;--paper:#fbf9f5;--ink:#25231e;--muted:#69645a;--brass:#93622b;--line:#ded6c9;--green:#365c47;--dark:#282c25}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:32px}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}a{color:var(--brass);text-decoration-thickness:1px;text-underline-offset:3px}a:hover{color:#5c3b18}a:focus-visible,button:focus-visible,[tabindex]:focus-visible{outline:3px solid #2d6cdf;outline-offset:4px}button{font:inherit;cursor:pointer}.shell{max-width:1420px;margin:auto;padding:0 42px}.top{border-bottom:1px solid var(--line)}.top .shell{min-height:84px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-weight:800;letter-spacing:.2em;font-size:22px;color:var(--ink);text-decoration:none}.brand span{display:inline-block;letter-spacing:.09em;font-size:10px;font-weight:600;color:var(--muted);margin-left:18px;vertical-align:middle}.meta{font-size:12px;color:var(--muted);letter-spacing:.04em}.hero{padding:68px 0 40px}.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--brass);font-weight:700}.hero h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(40px,5.1vw,70px);font-weight:400;letter-spacing:-.04em;line-height:1.08;margin:18px 0 24px;max-width:940px}.hero .lead{max-width:760px;font-size:19px;line-height:1.7;color:#59544b}.actions{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 24px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:11px 20px;border:1px solid var(--ink);border-radius:6px;color:var(--ink);background:transparent;font-size:13px;font-weight:650;text-decoration:none}.button.primary{background:var(--ink);color:#fff}.button:hover{background:#e8e1d5;color:var(--ink)}.hero-note{font-size:13px;color:var(--muted);max-width:770px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);margin:36px 0 0;background:var(--paper)}.metric{padding:22px 26px;border-right:1px solid var(--line)}.metric:last-child{border:0}.metric b{display:block;font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.25}.metric span{font-size:12px;color:var(--muted);display:block;margin-top:6px}.layout{display:grid;grid-template-columns:205px minmax(0,1fr);gap:52px;padding-top:20px;padding-bottom:80px}.sidebar nav{position:sticky;top:28px;padding-top:16px}.nav-label{font-size:10px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase;margin-bottom:16px}.sidebar a{display:block;font-size:13px;line-height:1.5;padding:9px 0;color:#5e584e;text-decoration:none}.sidebar a:hover{color:var(--brass)}.sidebar .nav-rule{height:1px;background:var(--line);margin:18px 0}.sidebar small{display:block;font-size:11px;color:var(--muted);line-height:1.6;margin-top:24px}.content{min-width:0}.chapter{padding:34px 0 42px;border-top:1px solid var(--line)}.chapter:first-child{padding-top:22px}.chapter h2{font-family:Georgia,"Times New Roman",serif;font-size:clamp(28px,3vw,38px);font-weight:400;letter-spacing:-.02em;line-height:1.25;margin:8px 0 22px}.chapter h3{font-size:20px;line-height:1.4;margin:36px 0 16px}.chapter p{margin:0 0 18px}.chapter ul,.chapter ol{padding-left:24px}.chapter li{margin:9px 0}.chapter .intro{font-size:17px;color:#5d574e;max-width:830px}.badge{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--green);background:#e7eee6;border:1px solid #c9d7c7;padding:5px 8px;border-radius:3px;display:inline-block}.badge.draft{color:#79521d;background:#f2e8d8;border-color:#e1d0b4}.status-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0}.status-card{background:var(--paper);padding:25px;border:1px solid var(--line);border-radius:7px}.status-card h3{margin:16px 0 12px;font-size:19px}.status-card p,.status-card ul{font-size:14px}.status-card ul{padding-left:18px;margin-bottom:0}.callout{background:#ede5d8;border-left:3px solid var(--brass);padding:18px 22px;font-size:14px;line-height:1.75;margin:22px 0}.flow{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;list-style:none!important;padding:0!important;margin:24px 0}.flow li{padding:16px 14px;background:var(--paper);border:1px solid var(--line);margin:0;font-size:12px}.flow b{display:block;color:var(--brass);font-size:11px;margin-bottom:7px;letter-spacing:.1em}.flow strong{display:block;font-size:13px;margin-bottom:6px}.flow span{color:var(--muted)}.table-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:6px;margin:22px 0 28px;background:var(--paper)}table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.7;min-width:620px}th{text-align:left;background:#ebe4d8;font-size:11px;letter-spacing:.03em;font-weight:700}th,td{padding:16px 18px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:0}td:first-child{min-width:150px}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.86em;background:#e9e3d9;border-radius:3px;padding:2px 5px;overflow-wrap:anywhere}pre{overflow-x:auto;background:var(--dark);color:#f2eee6;border-radius:7px;padding:23px;font-size:13px;line-height:1.8;margin:22px 0}pre code{padding:0;background:none;color:inherit;overflow-wrap:normal}.doc-toc{display:grid;grid-template-columns:1fr 1fr;gap:6px 28px;list-style:none;padding:20px!important;margin:22px 0 30px;background:var(--paper);border:1px solid var(--line);border-radius:6px;counter-reset:none}.doc-toc li{font-size:12px;line-height:1.6;margin:2px 0}.doc-toc a{text-decoration:none}.document p,.document li{font-size:14px}.document h3{border-top:1px solid var(--line);padding-top:28px}.document .table-scroll+ p{margin-top:24px}.file-map td:first-child{width:37%}.source-link{font-size:13px}.milestones{list-style:none!important;padding:0!important;counter-reset:milestone}.milestones li{position:relative;padding:0 0 24px 48px;margin:0}.milestones li:before{counter-increment:milestone;content:counter(milestone,decimal-leading-zero);position:absolute;left:0;top:2px;font-size:12px;color:var(--brass);font-weight:700}.milestones strong{display:block;font-size:15px;margin-bottom:5px}.milestones span{font-size:14px;color:var(--muted)}.footer{border-top:1px solid var(--line);padding:26px 0;color:var(--muted);font-size:11px}.footer .shell{display:flex;justify-content:space-between;gap:20px}.skip{position:absolute;left:16px;top:-70px;background:var(--ink);color:white;padding:12px;z-index:3}.skip:focus{top:16px}.print-only{display:none}
@media(max-width:1100px){.shell{padding:0 28px}.layout{grid-template-columns:170px minmax(0,1fr);gap:32px}.flow{grid-template-columns:repeat(3,1fr)}}
@media(max-width:800px){.shell{padding:0 22px}.hero{padding-top:42px}.layout{display:block;padding-top:0}.sidebar nav{position:static;display:flex;gap:9px;flex-wrap:wrap;padding:10px 0 30px}.sidebar a{padding:6px 10px;border:1px solid var(--line);border-radius:4px;font-size:11px}.sidebar .nav-label,.sidebar .nav-rule,.sidebar small{display:none}.brand span{display:none}.status-grid{grid-template-columns:1fr}.doc-toc{grid-template-columns:1fr}.metric{padding:18px}.metrics{grid-template-columns:repeat(2,1fr)}.metric:nth-child(2){border-right:0}.metric:nth-child(-n+2){border-bottom:1px solid var(--line)}.hero .lead{font-size:17px}.chapter{padding-bottom:30px}.footer .shell{display:block}.footer span{display:block;margin:5px 0}}
@media(max-width:480px){.shell{padding:0 18px}.top .shell{min-height:70px}.meta{font-size:10px}.hero h1{font-size:39px}.actions{gap:8px}.button{font-size:12px;padding:10px 14px}.flow{grid-template-columns:1fr 1fr}.flow li:last-child{grid-column:1/-1}.chapter h2{font-size:29px}.status-card{padding:20px}pre{padding:17px}.hero-note{font-size:12px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{body{background:white;font-size:10pt}.shell{max-width:none;padding:0}.top .shell{min-height:46px}.hero{padding:25px 0}.hero h1{font-size:32pt}.hero .lead{font-size:12pt}.actions,.sidebar,.skip,.doc-toc{display:none}.layout{display:block}.chapter{padding:25px 0;break-inside:auto}.chapter h2{font-size:23pt}.chapter h3{break-after:avoid}.document p,.document li{font-size:10pt}.table-scroll{overflow:visible}table{min-width:0;font-size:9pt}th,td{padding:8px}pre{white-space:pre-wrap;color:black;background:#eee;overflow-wrap:anywhere}.metrics,.status-grid,.flow{break-inside:avoid}.document{break-before:page}.print-only{display:block}.footer{font-size:9pt}a{color:inherit}h2,h3{page-break-after:avoid}}
"""


def build(research_path: Path, integration_path: Path) -> str:
    research, research_toc = render_markdown(sanitize(research_path.read_text(), "research"), "research")
    integration, integration_toc = render_markdown(sanitize(integration_path.read_text(), "integration"), "integration")
    return f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="DENLI: прототип кухни по фото, полный исследовательский обзор и техническая передача команде.">
<title>DENLI · Материалы для команды</title><style>{STYLE}</style></head>
<body><a class="skip" href="#overview">К содержанию</a>
<header class="top"><div class="shell"><a href="#top" class="brand">DENLI<span>ПРОЕКТ КУХНИ ПО ФОТО</span></a><span class="meta">Передача команде · 13.11.2026</span></div></header>
<main id="top" class="shell">
<section class="hero" aria-labelledby="hero-title"><div class="eyebrow">Прототип · исследование · интеграция</div>
<h1 id="hero-title">От фотографии кухни<br>к проверяемому проекту.</h1>
<p class="lead">Исходники работающего браузерного прототипа, стартовый каталог, исследование замеров и план подключения производства — в одном комплекте для команды DENLI.</p>
<div class="actions"><a class="button primary" href="index.html">Открыть локальный прототип ↗</a><a class="button" href="https://github.com/kkarpushin/denli-kitchen">Репозиторий GitHub ↗</a><button class="button" type="button" onclick="window.print()">Печать / PDF</button></div>
<p class="hero-note">Прототип запускается через локальный HTTP-сервер. Этот документ можно открыть отдельно, без интернета. <a href="https://denli-kitchen.pages.dev/">Онлайн-прототип на Cloudflare</a> открывается без входа в ChatGPT. Исходники остаются в закрытом репозитории; <a href="docs/CLOUDFLARE.md">инструкция публикации</a> входит в комплект.</p>
<div class="metrics" aria-label="Состав комплекта"><div class="metric"><b>3</b><span>планировки в прототипе</span></div><div class="metric"><b>7</b><span>научных работ в обзоре</span></div><div class="metric"><b>4</b><span>патентные семьи</span></div><div class="metric"><b>12</b><span>синтетических Node-проверок</span></div></div></section>
<div class="layout"><aside class="sidebar"><nav aria-label="Содержание документа"><div class="nav-label">В этом комплекте</div><a href="#overview">01 · Что уже работает</a><a href="#start">02 · Запуск и проверка</a><a href="#files">03 · Карта исходников</a><a href="#next">04 · Следующие этапы</a><div class="nav-rule"></div><a href="#research">Исследование целиком</a><a href="#integration">Интеграция целиком</a><a href="#top">Наверх ↑</a><small>Исследование описывает источники на 13 ноября 2026 года. Производственная готовность и точность ±5% пока не подтверждены.</small></nav></aside>
<div class="content">
<section id="overview" class="chapter"><div class="eyebrow">01 / Рабочий результат</div><h2>Пройти путь клиента<br>и получить черновой расчёт.</h2>
<p class="intro">Пользователь выбирает планировку, добавляет фото или размеры, определяет стиль и комплектацию. Прототип строит модульный эскиз и рассчитывает демонстрационную смету. Результат можно распечатать или передать следующему участнику в JSON.</p>
<ol class="flow"><li><b>01</b><strong>Планировка</strong><span>Прямая, угловая, П-образная</span></li><li><b>02</b><strong>Фото и размеры</strong><span>Ручной ввод или разметка с эталоном</span></li><li><b>03</b><strong>Стиль</strong><span>Материалы и визуальные референсы</span></li><li><b>04</b><strong>Комплектация</strong><span>Техника и бюджет</span></li><li><b>05</b><strong>Результат</strong><span>Эскиз, смета, PDF, JSON, CSV</span></li></ol>
<div class="status-grid"><article class="status-card"><span class="badge">Реализовано в прототипе</span><h3>Что команда может использовать</h3><ul><li>Браузерный сценарий и изображения примеров стиля.</li><li>Геометрию плоской стены по известному прямоугольному эталону; оценку чувствительности к точкам.</li><li>Правила компоновки и стартовый каталог с условными ценами в UAH.</li><li>Проверку допустимости схемы, расчёт строк и итогов, экспорт проекта.</li><li>Исходники тестов и черновой Ruby-адаптер SketchUp.</li></ul></article>
<article class="status-card"><span class="badge draft">Требует следующего этапа</span><h3>Что ещё предстоит доказать</h3><ul><li>Точность размеров на реальных кухнях и погрешность цены ±5%.</li><li>Производственную пригодность модулей, кромок и обработок.</li><li>Запуск адаптера в SketchUp Desktop; настоящие Dynamic Components.</li><li>Цепочку SketchUp → VIYAR → сверенную смету поставщика.</li><li>Нейросетевой обмер, серверную библиотеку, заявки и оплату.</li></ul></article></div>
<div class="callout"><strong>Статус данных.</strong> Модули, правила и цены придуманы для старта прототипа и требуют утверждения конструктором. Изображения — примеры стиля, а не рендер загруженной комнаты. CSV — внутренняя черновая деталировка, а не готовое производственное задание.</div>
<p>Фото и референсы обрабатываются в браузере и не входят в экспорт JSON. Закрытие вкладки удаляет их из текущего сеанса. Схема пока не проверяет окна, двери, коммуникации и конкретные механизмы; финальный проект требует точного замера.</p></section>

<section id="start" class="chapter"><div class="eyebrow">02 / Первый запуск</div><h2>Локальная работа без сервера приложения.</h2>
<p>Нужны Git и Node.js 22 или новее. У самого приложения нет npm-зависимостей, API-ключей или платных сервисов. Доступ к закрытому репозиторию выдаёт его владелец. Команды выполняются в терминале:</p>
<pre><code>git clone https://github.com/kkarpushin/denli-kitchen.git
cd denli-kitchen
npm start</code></pre>
<p>Откройте <a href="http://127.0.0.1:8765/">http://127.0.0.1:8765/</a> для прототипа или <a href="http://127.0.0.1:8765/HANDOFF.html">HANDOFF.html</a> для этого документа. Прямое открытие <code>index.html</code> через <code>file://</code> не заменяет HTTP-сервер: приложение загружает модули и JSON.</p>
<p>Во втором терминале, из папки проекта:</p><pre><code>npm test
npm run build
npm run examples</code></pre>
<p>Для браузерного прогона нужны Python 3.10+ и Playwright/Chromium. Установите зависимости QA по <a href="README.md">README</a>. Скрипты <code>qa/browser_test.py</code> и <code>qa/browser_provenance.py</code> принимают адрес приложения и путь к браузеру через <code>DENLI_TEST_URL</code> и <code>DENLI_CHROME</code>.</p>
<div class="callout"><strong>Объём имеющейся проверки.</strong> В версии 0.1.1 — 14 синтетических Node-проверок, включая 480 комбинаций планировки и 72 сочетания высоты и стиля, и браузерные сценарии на ширинах 1440, 768, 390 и 320 px. Они проверяют расчётный код и интерфейс. Реальный SketchUp, точность замеров и производственная смета этими проверками не покрываются.</div>
<p>Для ознакомления: пройдите сценарий с ручными размерами, сохраните JSON, затем повторите с фото и эталоном. Сравните происхождение размеров в итоговом документе. Пробный импорт в SketchUp выполняйте по <a href="sketchup/README.md">инструкции адаптера</a>.</p></section>

<section id="files" class="chapter"><div class="eyebrow">03 / Навигация по проекту</div><h2>Где продолжать работу.</h2><div class="table-scroll file-map" tabindex="0" role="region" aria-label="Карта файлов"><table><thead><tr><th scope="col">Файл или раздел</th><th scope="col">Назначение</th></tr></thead><tbody>
<tr><td><a href="README.md">README.md</a></td><td>Установка, запуск, состав проекта и текущие ограничения.</td></tr>
<tr><td><a href="index.html">index.html</a> · <a href="app.mjs">app.mjs</a></td><td>Интерфейс, сценарий, предпросмотр и экспорт результата.</td></tr>
<tr><td><a href="measure.mjs">measure.mjs</a></td><td>Плоская проективная геометрия и чувствительность к разметке.</td></tr>
<tr><td><a href="engine.mjs">engine.mjs</a> · <a href="data/demo-catalog.json">data/demo-catalog.json</a></td><td>Расчёт, допустимые модули, материалы, правила и условные цены.</td></tr>
<tr><td><a href="sketchup/README.md">sketchup/README.md</a> · <a href="sketchup/denli_draft.rb">denli_draft.rb</a></td><td>Порядок запуска и черновой импорт проекта в SketchUp.</td></tr>
<tr><td><a href="docs/research/PHOTO_MEASUREMENT.md">docs/research/PHOTO_MEASUREMENT.md</a></td><td>Полный обзор научных методов, патентных пересечений и эксперимента.</td></tr>
<tr><td><a href="docs/INTEGRATION.md">docs/INTEGRATION.md</a></td><td>Форматы SketchUp / VIYAR, контракт детали и критерии сверки.</td></tr>
<tr><td><a href="docs/FOCUS_GROUP.md">docs/FOCUS_GROUP.md</a></td><td>Сценарий показа, проба на фото участника и вопросы для обсуждения.</td></tr>
<tr><td><a href="docs/ACCEPTANCE.md">docs/ACCEPTANCE.md</a></td><td>Критерии приёмки следующего этапа и порядок передачи команде.</td></tr>
<tr><td><a href="examples/straight.json">examples/straight.json</a> · <a href="examples/L.json">L.json</a> · <a href="examples/U.json">U.json</a></td><td>Три демонстрационных проекта для проверки и пробного импорта.</td></tr>
<tr><td><a href="tests/">tests/</a> · <a href="qa/">qa/</a></td><td>Расчётные и браузерные проверки.</td></tr>
<tr><td><a href="build.mjs">build.mjs</a></td><td>Сборка статического сайта по перечню разрешённых файлов.</td></tr>
</tbody></table></div><p>Этот документ пересобирается командой <code>python3 scripts/build_handoff.py</code> из Markdown в репозитории. Для чтения HTML не нужны внешние шрифты, библиотеки или сетевые запросы. Ссылки на первичные источники открываются при переходе.</p></section>

<section id="next" class="chapter"><div class="eyebrow">04 / Практическое продолжение</div><h2>Четыре проверяемых этапа.</h2><ol class="milestones">
<li><strong>Утвердить один производственный модуль.</strong><span>Конструктор проверяет размеры, материалы, фасады, кромки, зазоры и фурнитуру. Результат: версия каталога и контрольный состав деталей.</span></li>
<li><strong>Провести один проект через SketchUp.</strong><span>Импортировать JSON в реальном приложении, сверить геометрию и связи деталей, проверить один Undo. Результат: сохранённая модель и протокол расхождений.</span></li>
<li><strong>Получить и сверить расчёт VIYAR.</strong><span>Начать с одной контрольной детали и четырёх её кромок; затем расширить до проверенной кухни. Результат: импорт, прочитанные обратно данные и цена того же состава.</span></li>
<li><strong>Измерить качество на реальных помещениях.</strong><span>Собрать контрольные фото, замеры и сметы; сравнить геометрию с эталоном, MoGe-3 и Depth Pro. Результат: ошибки в мм и процентах, доля отказов и доля смет в пределах ±5% на отложенной выборке.</span></li>
</ol><p>Следующие два раздела содержат исследование и проект интеграции полностью, с первичными источниками. Удалены только служебные записи о восстановлении рабочих сессий; ссылки на файлы перенесены внутрь этого комплекта.</p></section>

<section id="research" class="chapter document"><div class="eyebrow">Исследование / Полный текст</div><h2>Замер кухни по обычной фотографии.</h2><p class="source-link">Исходный документ: <a href="docs/research/PHOTO_MEASUREMENT.md">PHOTO_MEASUREMENT.md</a> · Состояние источников: 13 ноября 2026 года.</p>{research_toc}{research}</section>
<section id="integration" class="chapter document"><div class="eyebrow">Интеграция / Полный текст</div><h2>SketchUp и VIYAR PRO.</h2><p class="source-link">Исходный документ: <a href="docs/INTEGRATION.md">INTEGRATION.md</a> · Проект интеграции, требующий практической проверки.</p>{integration_toc}{integration}</section>
</div></div></main><footer class="footer"><div class="shell"><span>DENLI · Материалы для передачи команде · 13 ноября 2026</span><span>Прототип и исследование. Производственное подключение — следующий этап.</span></div></footer></body></html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research", type=Path, default=ROOT / "docs/research/PHOTO_MEASUREMENT.md")
    parser.add_argument("--integration", type=Path, default=ROOT / "docs/INTEGRATION.md")
    args = parser.parse_args()
    output = ROOT / "HANDOFF.html"
    output.write_text(build(args.research, args.integration), encoding="utf-8")
    print(f"Built {output.name} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
