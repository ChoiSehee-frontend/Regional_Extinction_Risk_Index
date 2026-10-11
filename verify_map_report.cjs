// Exercise the actual embedded script against a small DOM stand-in.
// This verifies event-driven ranking behavior; it does not verify visual layout.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.dataset={};this.listeners={};this.value='';this.textContent='';this.hidden=false;this.classes=new Set();this.classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v),toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)};}
  setAttribute(k,v){this.attributes[k]=String(v);}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
  dispatchEvent(event){event.target??=this;for(const fn of this.listeners[event.type]??[])fn(event);}
  querySelector(selector){if(selector==='button'&&this.tagName==='button')return this;for(const child of this.children){if(selector==='button'&&child.tagName==='button'||selector.startsWith('.')&&child.className===selector.slice(1))return child;const found=child.querySelector(selector);if(found)return found;}return null;}
  closest(selector){let node=this;while(node){if(selector.startsWith('.')&&node.className===selector.slice(1))return node;node=node.parent;}return null;}
  getBoundingClientRect(){return {left:20,top:30,width:100,height:100};}
  focus(){this.focused=true;this.dispatchEvent({type:'focus'});}
  scrollIntoView(){this.scrolled=true;}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
}
const source=fs.readFileSync('부천시_포항시_지도_순위_리포트.html','utf8');
const payload=source.match(/<script id="map-data" type="application\/json">(.*?)<\/script>/s)[1],data=JSON.parse(payload);
const elements=new Map();for(const match of source.matchAll(/id="([^"]+)"/g))elements.set(match[1],new Element());
elements.get('map-data').textContent=payload;elements.get('rank-order').value='asc';elements.get('map-tooltip').append(new Element('button'));
const document={getElementById:id=>{assert(elements.has(id),'Unknown ID '+id);return elements.get(id);},createElement:tag=>new Element(tag),createElementNS:(ns,tag)=>new Element(tag),addEventListener(){}};
const context={document,window:{addEventListener(){}},Intl,Map,Option:class extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value;}},Event:class{constructor(type){this.type=type;}},innerWidth:1400,innerHeight:900,setTimeout:fn=>fn()};
vm.runInNewContext(source.match(/<script>(.*?)<\/script>/s)[1],context,{timeout:5000});
const tbody=elements.get('ranking-body'),city=elements.get('rank-city'),order=elements.get('rank-order'),search=elements.get('rank-search');
const change=element=>element.dispatchEvent({type:'change'}),input=()=>search.dispatchEvent({type:'input'});
function checkSort(sign){const vals=tbody.children.map(row=>Number(row.dataset.index));for(let i=1;i<vals.length;i++)assert(sign*(vals[i]-vals[i-1])>=0);}
assert.equal(elements.get('population-map').dataset.ready,'true');assert.equal(tbody.children.length,66);checkSort(1);
assert.equal(tbody.children[0].dataset.region,'죽장면');assert.equal(tbody.children[0].children[4].textContent,'0.0289');
order.value='desc';change(order);checkSort(-1);assert.equal(tbody.children[0].dataset.region,'중1동');assert.equal(elements.get('rank-index-heading').attributes['aria-sort'],'descending');
elements.get('rank-toggle').dispatchEvent({type:'click'});assert.equal(order.value,'asc');checkSort(1);
city.value='부천시';change(city);assert.equal(tbody.children.length,37);assert(tbody.children.every(row=>row.dataset.city==='부천시'));
city.value='포항시';change(city);assert.equal(tbody.children.length,29);assert.equal(tbody.children[0].dataset.region,'죽장면');
city.value='';search.value=' 심곡 ';input();assert.equal(tbody.children.length,5);checkSort(1);assert(tbody.children.every(row=>row.dataset.region.includes('심곡')));
search.value='부천시 원미구 중1동';input();assert.equal(tbody.children.length,1);assert.equal(tbody.children[0].dataset.region,'중1동');
tbody.children[0].children[8].children[0].dispatchEvent({type:'click',stopPropagation(){}});
assert.equal(elements.get('tip-name').textContent,'중1동');assert.equal(elements.get('map-tooltip').hidden,false);
assert(elements.get('maps').children[0].scrolled);assert.equal(elements.get('maps').children[0].querySelector('.area-picker').value,'중1동');
search.value='없는지역123';input();assert.equal(tbody.children.length,1);assert.match(tbody.children[0].children[0].textContent,/검색 결과가 없습니다/);assert.equal(elements.get('ranking-extremes').children.length,0);
search.value='';input();assert.equal(tbody.children.length,66);
for(const c of data.cities){assert.equal(new Set(c.features.map(f=>f.name)).size,c.features.length);assert.equal(c.features.reduce((s,f)=>s+f.women,0),c.name==='부천시'?90475:41867);assert.equal(c.features.reduce((s,f)=>s+f.older,0),c.name==='부천시'?163538:122192);}
console.log('PASS: 66 regions, numeric sorting both directions, city filters, search, empty state, map selection, and population reconciliation.');
