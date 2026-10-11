const rankingFeatures=data.cities.flatMap(city=>city.features);
const rankCity=document.getElementById("rank-city"),rankOrder=document.getElementById("rank-order"),rankSearch=document.getElementById("rank-search");
const rankingBody=document.getElementById("ranking-body");
function renderRanking(){
  const query=rankSearch.value.trim().replace(/\s+/g,"").toLocaleLowerCase("ko");
  const filtered=rankingFeatures.filter(f=>(!rankCity.value||f.city===rankCity.value)&&(!query||(f.city+f.district+f.name).toLocaleLowerCase("ko").includes(query)));
  const ascending=rankOrder.value==="asc",direction=ascending?1:-1;
  const rows=[...filtered].sort((a,b)=>{
    if(a.index===null&&b.index!==null)return 1;if(b.index===null&&a.index!==null)return -1;
    return direction*((a.index??0)-(b.index??0))||(a.city+a.district+a.name).localeCompare(b.city+b.district+b.name,"ko");
  });
  document.getElementById("rank-toggle").textContent="지수 "+(ascending?"↑":"↓");
  document.getElementById("rank-toggle").setAttribute("aria-label",ascending?"지수 오름차순 정렬 중. 내림차순으로 변경":"지수 내림차순 정렬 중. 오름차순으로 변경");
  document.getElementById("rank-index-heading").setAttribute("aria-sort",ascending?"ascending":"descending");
  document.getElementById("ranking-caption").textContent=(rankCity.value||"두 도시 전체")+" · "+rows.length+" / "+rankingFeatures.length+"개 지역 표시 · "+(ascending?"지수 오름차순 (위험 높은 순)":"지수 내림차순 (위험 낮은 순)");
  rankingBody.replaceChildren();
  let rank=0,previous=undefined;
  rows.forEach((f,i)=>{
    if(f.index!==previous)rank=i+1;previous=f.index;
    const tr=htmlElement("tr");tr.dataset.city=f.city;tr.dataset.region=f.name;tr.dataset.index=f.index??"";
    for(const value of [f.index===null?"—":rank,f.city,f.district,f.name])tr.append(htmlElement("td",null,value));
    tr.append(htmlElement("td","index-cell",f.index===null?"—":f.index.toFixed(4)));
    const bandCell=htmlElement("td"),bandWrap=htmlElement("span","rank-band"),swatch=htmlElement("span","swatch");swatch.style.background=bands.get(f.band).color;swatch.setAttribute("aria-hidden","true");bandWrap.append(swatch,htmlElement("span",null,f.band));bandCell.append(bandWrap);tr.append(bandCell);
    tr.append(htmlElement("td","numeric",number.format(f.women)),htmlElement("td","numeric",number.format(f.older)));
    const mapCell=htmlElement("td"),mapButton=htmlElement("button","rank-map-link","보기");mapButton.type="button";mapButton.setAttribute("aria-label",f.city+" "+f.name+" 지도에서 보기");
    mapButton.addEventListener("click",event=>{
      event.stopPropagation();hideTip(true);
      const state=states.find(s=>s.city.name===f.city),card=state.svg.closest(".map-card"),picker=card.querySelector(".area-picker");
      card.scrollIntoView({block:"center",behavior:"auto"});picker.value=f.name;picker.dispatchEvent(new Event("change"));state.paths.get(f.name).path.focus({preventScroll:true});
    });mapCell.append(mapButton);tr.append(mapCell);rankingBody.append(tr);
  });
  if(!rows.length){const tr=htmlElement("tr"),td=htmlElement("td",null,"검색 결과가 없습니다. 도시 또는 검색어를 변경해 주세요.");td.colSpan=9;tr.append(td);rankingBody.append(tr);}
  const extremes=document.getElementById("ranking-extremes");extremes.replaceChildren();
  const valid=filtered.filter(f=>f.index!==null).sort((a,b)=>a.index-b.index);
  if(valid.length){
    for(const [label,feature] of [["지수 최저 · 소멸 위험 가장 높음",valid[0]],["지수 최고 · 소멸 위험 가장 낮음",valid[valid.length-1]]]){
      const tied=valid.filter(f=>f.index===feature.index),card=htmlElement("div","extreme-card");
      card.append(htmlElement("p","extreme-label",label),htmlElement("p","extreme-name",feature.city+" "+feature.district+" "+feature.name+(tied.length>1?" 외 "+(tied.length-1)+"곳":"")),htmlElement("p","extreme-value",feature.index.toFixed(4)),htmlElement("p","extreme-band",feature.band));extremes.append(card);
    }
  }
}
rankCity.addEventListener("change",renderRanking);rankOrder.addEventListener("change",renderRanking);rankSearch.addEventListener("input",renderRanking);
document.getElementById("rank-toggle").addEventListener("click",()=>{rankOrder.value=rankOrder.value==="asc"?"desc":"asc";renderRanking();});
renderRanking();
