"""Append the report and ranking while preserving the supplied map and its data."""
from pathlib import Path
import csv
import json
import re
from collections import Counter

BASE = Path(__file__).resolve().parent
SOURCE = Path("C:/Users/세희/Documents/Codex/2026-10-11/god/outputs/부천시_포항시_인터랙티브지도.html")
OUTPUT = BASE / "부천시_포항시_지도_순위_리포트.html"
source = SOURCE.read_text(encoding="utf-8")
match = re.search(r'<script id="map-data" type="application/json">(.*?)</script>', source, re.S)
assert match, "Map data missing"
data = json.loads(match.group(1))
assert [(c["name"], len(c["features"])) for c in data["cities"]] == [("부천시", 37), ("포항시", 29)]

def load_csv(city, token):
    path = next(p for p in BASE.glob("*.csv") if city in p.name and token in p.name)
    return {re.sub(r"\s*\(.*", "", row[0]): row for row in list(csv.reader(path.read_text(encoding="cp949").splitlines()))[1:]}

def population(row, column):
    return int(row[column].replace(",", ""))

for city in data["cities"]:
    rows = load_csv(city["name"][:2], "65세" if city["name"] == "부천시" else "여성")
    for feature in city["features"]:
        prefix = "경기도" if city["name"] == "부천시" else "경상북도"
        key = f'{prefix} {city["name"]} {feature["district"]} {feature["name"]}'
        inputs = [rows[key]]
        if feature["name"] == "죽장면":
            inputs.append(rows[key + "상옥출장소"])
        women = sum(population(row, 1) for row in inputs)
        older = sum(population(row, 2) for row in inputs)
        assert (women, older) == (feature["women"], feature["older"]), key
        assert abs(women / older - feature["index"]) < 1e-12, key
    assert abs(sum(f["women"] for f in city["features"]) / sum(f["older"] for f in city["features"]) - city["index"]) < 1e-12
    print(city["name"], Counter(f["band"] for f in city["features"]))

css = (BASE / "report_styles.css").read_text(encoding="utf-8")
markup = (BASE / "report_additions.html").read_text(encoding="utf-8")
script = (BASE / "report_ranking.js").read_text(encoding="utf-8")
result = source.replace("</style>", css + "\n</style>", 1)
result = result.replace("</main>", markup + "\n</main>", 1)
result = result.replace('root.dataset.ready="true";', script + '\nroot.dataset.ready="true";', 1)
result = result.replace("<title>부천시·포항시 지방소멸위험지수 지도</title>", "<title>지방소멸위험지수 분석 리포트 — 포항시와 부천시를 중심으로 | 22500729 최세희</title>")
original_heading = '<div><p class="eyebrow">부천시 · 포항시</p><h1>지방소멸위험지수 지도</h1><p class="intro">지역에 마우스를 올리거나 누르면 지수와 인구 수를 볼 수 있습니다.</p></div>'
report_heading = '''<div class="report-cover">
    <p class="eyebrow">도시의 재생과 활성화</p>
    <h1>지방소멸위험지수 분석 리포트</h1>
    <p class="cover-subtitle">포항시와 부천시를 중심으로</p>
    <p class="cover-author">22500729 최세희</p>
    <p class="intro">지역을 선택하면 지수와 인구 수를 볼 수 있습니다. 지도 아래에서 지역별 순위와 비교 리포트를 확인하세요.</p>
  </div>'''
assert original_heading in result, "Original heading missing"
result = result.replace(original_heading, report_heading, 1)
result = result.replace("지역에 마우스를 올리거나 누르면 지수와 인구 수를 볼 수 있습니다.", "지역을 선택하면 지수와 인구 수를 볼 수 있습니다. 지도 아래에서 지역별 순위와 비교 리포트를 확인하세요.")
assert re.search(r'<script id="map-data" type="application/json">(.*?)</script>', result, re.S).group(1) == match.group(1), "Map data changed"
assert result.count('id="regional-ranking"') == 1
OUTPUT.write_text(result, encoding="utf-8")
scripts = re.findall(r"<script>(.*?)</script>", result, re.S)
(BASE / "map_script_check.js").write_text("\n".join(scripts), encoding="utf-8")
print("Saved", OUTPUT.name, OUTPUT.stat().st_size, "bytes")
