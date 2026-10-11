
(() => {
"use strict";
const root = document.getElementById("population-map");
const data = JSON.parse(document.getElementById("map-data").textContent);
const tooltip = document.getElementById("map-tooltip");
const number = new Intl.NumberFormat("ko-KR");
const ns = "http://www.w3.org/2000/svg";
const bands = new Map(data.bands.map(b => [b[0], {range:b[1],color:b[2]}]));
bands.set("자료 없음", {range:"산출 불가",color:"#D1D5DB"});
const states = [];
let active = null, pinned = false, lastPosition = {x:24,y:24};
function htmlElement(tag, className, text) {const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function svgElement(tag, attrs) {const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
for (const [label,range,color] of data.bands) {
  const item=htmlElement("div","legend-item");const swatch=htmlElement("span","swatch");swatch.style.background=color;swatch.setAttribute("aria-hidden","true");
  const labelGroup=htmlElement("div",null,label);labelGroup.append(htmlElement("span","range",range));item.append(swatch,labelGroup);document.getElementById("legend").append(item);
}
function positionTip(x,y) {
  lastPosition={x,y};const box=tooltip.getBoundingClientRect();let left=x+16,top=y+16;
  if(left+box.width>innerWidth-12)left=x-box.width-16;
  if(top+box.height>innerHeight-12)top=y-box.height-16;
  tooltip.style.left=Math.max(12,Math.min(left,innerWidth-box.width-12))+"px";
  tooltip.style.top=Math.max(12,Math.min(top,innerHeight-box.height-12))+"px";
}
function hideTip(force=false) {
  if(pinned&&!force)return;
  if(active)active.path.classList.remove("active");active=null;pinned=false;
  tooltip.hidden=true;tooltip.classList.remove("pinned");
}
function showTip(feature,path,event,keep=false) {
  if(pinned&&!keep)return;
  if(active)active.path.classList.remove("active");active={feature,path};path.classList.add("active");
  const band=bands.get(feature.band);
  document.getElementById("tip-name").textContent=feature.name;
  document.getElementById("tip-place").textContent=feature.city+" "+feature.district;
  document.getElementById("tip-index").textContent=feature.index===null?"—":feature.index.toFixed(4);
  document.getElementById("tip-color").style.background=band.color;
  document.getElementById("tip-band").textContent=feature.band+" · "+band.range;
  document.getElementById("tip-women").textContent=number.format(feature.women)+"명";
  document.getElementById("tip-older").textContent=number.format(feature.older)+"명";
  const note=document.getElementById("tip-note");note.hidden=!feature.note;note.textContent=feature.note||"";
  pinned=keep;tooltip.classList.toggle("pinned",keep);document.getElementById("tip-hint").textContent=keep?"다른 지역을 누르면 정보가 바뀝니다.":"클릭하면 정보를 고정합니다.";
  tooltip.hidden=false;
  const bounds=path.getBoundingClientRect();positionTip(event?.clientX??(bounds.left+bounds.width/2),event?.clientY??(bounds.top+bounds.height/2));
  if(keep)document.getElementById("selection-announcement").textContent=feature.city+" "+feature.district+" "+feature.name+", 지수 "+(feature.index===null?"산출 불가":feature.index.toFixed(4))+", "+feature.band;
}
tooltip.querySelector("button").addEventListener("click",()=>hideTip(true));
tooltip.addEventListener("pointerdown",e=>e.stopPropagation());
document.addEventListener("keydown",e=>{if(e.key==="Escape")hideTip(true);});
document.addEventListener("click",e=>{if(!tooltip.contains(e.target)&&!e.target.closest(".region")&&!e.target.closest(".area-picker"))hideTip(true);});
window.addEventListener("resize",()=>{if(!tooltip.hidden)positionTip(lastPosition.x,lastPosition.y);});
for(const city of data.cities) {
  const card=htmlElement("section","map-card");card.setAttribute("aria-label",city.name+" 지도");
  const head=htmlElement("div","map-header"), heading=htmlElement("div");heading.append(htmlElement("h2",null,city.name));
  const unit=city.name==="부천시"?"행정동":"읍면동";
  heading.append(htmlElement("p","city-meta",city.features.length+"개 "+unit+" · 도시 전체 지수 "+city.index.toFixed(4)+" ("+city.band+")"));
  const controls=htmlElement("div","map-controls");const actions=[];
  for(const [symbol,label,action] of [["+","확대","in"],["−","축소","out"],["전체","전체 보기","reset"]]) {
    const btn=htmlElement("button",null,symbol);btn.type="button";btn.setAttribute("aria-label",city.name+" "+label);controls.append(btn);actions.push([btn,action]);
  }
  head.append(heading,controls);card.append(head);
  const stage=htmlElement("div","map-stage");const svg=svgElement("svg",{viewBox:"0 0 1000 800",class:"map-svg",role:"group","aria-label":city.name+"의 "+unit+"별 지방소멸위험지수 지도"});
  const desc=svgElement("desc",{});desc.textContent="각 지역에 마우스를 올리거나 선택하면 인구와 위험 단계를 확인할 수 있습니다.";svg.append(desc);
  const layer=svgElement("g",{"data-map-layer":city.name});svg.append(layer);stage.append(svg,htmlElement("span","direction","↑ 북"));
  const zoomLabel=htmlElement("span","zoom-level","1.0배");stage.append(zoomLabel);card.append(stage);
  const footer=htmlElement("div","map-footer");footer.append(htmlElement("span",null,"휠로 확대 · 확대 후 드래그로 이동"));
  const picker=htmlElement("select","area-picker");picker.setAttribute("aria-label",city.name+" 읍면동 선택");
  picker.append(new Option("읍면동 선택",""));footer.append(picker);card.append(footer);document.getElementById("maps").append(card);
  const state={city,svg,layer,k:1,x:0,y:0,drag:null,suppressClick:false,paths:new Map()};states.push(state);
  function limit() {state.x=Math.min(0,Math.max(1000*(1-state.k),state.x));state.y=Math.min(0,Math.max(800*(1-state.k),state.y));}
  function drawTransform() {limit();layer.setAttribute("transform",`translate(${state.x} ${state.y}) scale(${state.k})`);zoomLabel.textContent=state.k.toFixed(1)+"배";stage.style.cursor=state.k>1?"grab":"default";}
  function zoom(newK,point={x:500,y:400}) {newK=Math.max(1,Math.min(8,newK));const factor=newK/state.k;state.x=point.x-(point.x-state.x)*factor;state.y=point.y-(point.y-state.y)*factor;state.k=newK;drawTransform();hideTip(true);}
  function svgPoint(clientX,clientY) {const point=svg.createSVGPoint();point.x=clientX;point.y=clientY;return point.matrixTransform(svg.getScreenCTM().inverse());}
  for(const feature of city.features) {
    const path=svgElement("path",{d:feature.path,class:"region",fill:bands.get(feature.band).color,"fill-rule":"evenodd",tabindex:"0",role:"button","aria-label":feature.district+" "+feature.name+" · "+feature.band,"data-region":feature.name,"data-index":feature.index??""});
    layer.append(path);state.paths.set(feature.name,{path,feature});
    path.addEventListener("pointerenter",event=>{if(!state.drag)showTip(feature,path,event);});
    path.addEventListener("pointermove",event=>{if(!pinned&&!state.drag)showTip(feature,path,event);});
    path.addEventListener("pointerleave",()=>hideTip());
    path.addEventListener("focus",()=>showTip(feature,path,null));
    path.addEventListener("blur",()=>hideTip());
    path.addEventListener("click",event=>{if(!state.suppressClick){picker.value=feature.name;showTip(feature,path,event,true);}});
    path.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();picker.value=feature.name;showTip(feature,path,null,true);}});
  }
  for(const outline of city.outlines)layer.append(svgElement("path",{d:outline.path,class:"district-outline","fill-rule":"evenodd"}));
  for(const feature of [...city.features].sort((a,b)=>(a.district+" "+a.name).localeCompare(b.district+" "+b.name,"ko")))picker.append(new Option(feature.district+" "+feature.name,feature.name));
  picker.addEventListener("change",()=>{if(!picker.value){hideTip(true);return;}const {feature,path}=state.paths.get(picker.value);state.k=1;state.x=state.y=0;drawTransform();showTip(feature,path,null,true);});
  for(const [btn,action] of actions)btn.addEventListener("click",event=>{event.stopPropagation();if(action==="reset"){state.k=1;state.x=state.y=0;drawTransform();hideTip(true);}else zoom(state.k*(action==="in"?1.5:1/1.5));});
  stage.addEventListener("wheel",event=>{event.preventDefault();zoom(state.k*Math.exp(-event.deltaY*.0015),svgPoint(event.clientX,event.clientY));},{passive:false});
  stage.addEventListener("pointerdown",event=>{if(event.button!==0||state.k===1)return;const point=svgPoint(event.clientX,event.clientY);state.drag={id:event.pointerId,point,x:state.x,y:state.y,moved:false,target:event.target};event.target.setPointerCapture(event.pointerId);});
  stage.addEventListener("pointermove",event=>{if(!state.drag||state.drag.id!==event.pointerId)return;const point=svgPoint(event.clientX,event.clientY);const dx=point.x-state.drag.point.x,dy=point.y-state.drag.point.y;if(Math.abs(dx)+Math.abs(dy)>5)state.drag.moved=true;if(state.drag.moved){state.x=state.drag.x+dx;state.y=state.drag.y+dy;drawTransform();stage.style.cursor="grabbing";hideTip(true);}});
  function finishDrag(event){if(!state.drag||state.drag.id!==event.pointerId)return;state.suppressClick=state.drag.moved;const target=state.drag.target;if(target.hasPointerCapture(event.pointerId))target.releasePointerCapture(event.pointerId);state.drag=null;drawTransform();setTimeout(()=>{state.suppressClick=false;},0);}
  stage.addEventListener("pointerup",finishDrag);stage.addEventListener("pointercancel",finishDrag);stage.addEventListener("pointerleave",()=>{if(!state.drag)hideTip();});drawTransform();
}
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

root.dataset.ready="true";
})();
