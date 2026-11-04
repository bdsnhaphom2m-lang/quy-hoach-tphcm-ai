/* Quy Hoạch TP.HCM — transparent, user-supplied GIS MVP. No official planning data included. */
'use strict';
const $ = (id) => document.getElementById(id);
const places = { hcm:{center:[106.7009,10.7769],zoom:12},thudau:{center:[106.6519,10.9804],zoom:12},vungtau:{center:[107.0843,10.3460],zoom:12} };
let selected=null, planningMeta=null, drawing=false, vertices=[], loadedFeatures=0;
const pointKey='qhtphcm-saved-points-v1';
const validCoord=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;
const fmt=(n)=>Number(n).toFixed(6);
function notify(message){$('feedback').textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('feedback').textContent='',5000)}
const rasterStyle={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',maxzoom:19}},layers:[{id:'osm',type:'raster',source:'osm'}]};
if(!maplibregl.supported()){throw Error('Trình duyệt không hỗ trợ WebGL. Hãy bật tăng tốc phần cứng hoặc thử Chrome/Edge mới.');}
const map = new maplibregl.Map({container:'map',style:rasterStyle,center:[106.87,10.77],zoom:9,maxZoom:19,attributionControl:true});
map.addControl(new maplibregl.NavigationControl(),'top-right');
let tileErrorCount=0;
map.on('error',e=>{console.error('MapLibre:',e.error||e);tileErrorCount++;
 if(tileErrorCount===3){const el=$('mapError');el.hidden=false;el.textContent='Không tải được ô bản đồ nền. Kiểm tra kết nối tới OpenStreetMap hoặc thử mạng khác. (Các thao tác GIS có thể bị ảnh hưởng.)';}
});
map.on('idle',()=>{if(map.isSourceLoaded('osm')){$('mapError').hidden=true;tileErrorCount=0;}});

const emptyCollection=()=>({type:'FeatureCollection',features:[]});
map.on('load',()=>{
  map.addSource('planning',{type:'geojson',data:emptyCollection()});
  map.addLayer({id:'planning-fill',type:'fill',source:'planning',filter:['any',['==',['geometry-type'],'Polygon'],['==',['geometry-type'],'MultiPolygon']],paint:{'fill-color':'#148c7c','fill-opacity':0.55}});
  map.addLayer({id:'planning-line',type:'line',source:'planning',filter:['any',['==',['geometry-type'],'Polygon'],['==',['geometry-type'],'MultiPolygon']],paint:{'line-color':'#02645f','line-width':2}});
  map.addSource('draw',{type:'geojson',data:emptyCollection()});
  map.addLayer({id:'draw-fill',type:'fill',source:'draw',paint:{'fill-color':'#efaa38','fill-opacity':0.25}});
  map.addLayer({id:'draw-line',type:'line',source:'draw',paint:{'line-color':'#ce6f10','line-width':3}});
  map.addLayer({id:'draw-vertices',type:'circle',source:'draw',paint:{'circle-radius':5,'circle-color':'#d06c00'}});
});
function selectedDetail(info){ $('detailBody').replaceChildren(); const p=document.createElement('div');p.textContent=info; $('detailBody').append(p); }
function setPoint(lng,lat,feature){selected={lng,lat};$('savePoint').disabled=false;$('sharePoint').disabled=false;let text=`WGS84: ${fmt(lat)}, ${fmt(lng)}\n`;
 if(feature){text+=`\nLớp: ${planningMeta?.name||'Chưa xác định'}\nNguồn: ${planningMeta?.url||'Không có'}\nQuyền: ${planningMeta?.rights||'Không có'}\nThuộc tính:\n`;
 const props=feature.properties||{};for(const [key,value] of Object.entries(props).slice(0,25))text+=`${key}: ${String(value).slice(0,250)}\n`;
 text+='\nChỉ là dữ liệu do người sử dụng nạp. Phải đối chiếu hồ sơ pháp lý.';
 }else text+='Không xác định thuộc tính quy hoạch tại điểm này.';
 const el=document.createElement('pre');el.textContent=text;el.style.cssText='white-space:pre-wrap;font:inherit;margin:0;';$('detailBody').replaceChildren(el);
}
map.on('click',(e)=>{if(drawing){vertices.push([e.lngLat.lng,e.lngLat.lat]);updateDraw();return;}
 const hits=map.getLayer('planning-fill')?map.queryRenderedFeatures(e.point,{layers:['planning-fill']}):[];
 setPoint(e.lngLat.lng,e.lngLat.lat,hits[0]);
});
$('place').onchange=()=>{const p=places[$('place').value];map.flyTo({center:p.center,zoom:p.zoom})};
$('goto').onclick=()=>{const parts=$('coords').value.trim().split(/[;,\s]+/).map(Number);if(parts.length!==2||!validCoord(parts[0],parts[1]))return notify('Tọa độ không hợp lệ. Nhập: vĩ độ, kinh độ.');const [lat,lng]=parts;map.flyTo({center:[lng,lat],zoom:16});setPoint(lng,lat)};
function walkCoords(coord,fn){if(typeof coord?.[0]==='number'){fn(coord);return;}if(Array.isArray(coord))for(const c of coord)walkCoords(c,fn)}
function validCollection(geo){if(!geo||geo.type!=='FeatureCollection'||!Array.isArray(geo.features))throw Error('Tệp phải là GeoJSON FeatureCollection.');if(geo.features.length>20000)throw Error('Tệp quá nhiều đối tượng (>20.000). Hãy chia nhỏ tệp.');
 let total=0;for(const f of geo.features){if(f.type!=='Feature'||!f.geometry||!['Polygon','MultiPolygon'].includes(f.geometry.type))throw Error('MVP chỉ hỗ trợ Polygon/MultiPolygon.');walkCoords(f.geometry.coordinates,c=>{total++;if(total>500000)throw Error('Tệp có quá nhiều đỉnh.');if(!validCoord(c[1],c[0]))throw Error('Tọa độ phải thuộc EPSG:4326 (kinh độ, vĩ độ).')});}return geo;}
$('loadGeo').onclick=async()=>{const file=$('geoFile').files[0],name=$('sourceName').value.trim(),url=$('sourceUrl').value.trim(),rights=$('sourceRights').value.trim();if(!file||!name||!url||!rights)return notify('Cần đủ tệp, tên, URL nguồn và quyền sử dụng.');if(!/^https?:\/\//i.test(url))return notify('URL nguồn phải bắt đầu bằng http:// hoặc https://.');if(file.size>12*1024*1024)return notify('Tệp vượt 12 MB. Hãy chia nhỏ.');
 try{const geo=validCollection(JSON.parse(await file.text()));if(!map.getSource('planning'))throw Error('Bản đồ chưa sẵn sàng.');map.getSource('planning').setData(geo);planningMeta={name,url,rights,file:file.name,loadedAt:new Date().toISOString(),status:'Người dùng cung cấp — chưa được xác minh'};loadedFeatures=geo.features.length;$('layerStatus').textContent=`${name} · ${loadedFeatures} vùng · CHƯA XÁC MINH · ${file.name}`;$('showLayer').checked=true;showPlanning(true);let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;for(const f of geo.features)walkCoords(f.geometry.coordinates,c=>{west=Math.min(west,c[0]);east=Math.max(east,c[0]);south=Math.min(south,c[1]);north=Math.max(north,c[1]);});if(Number.isFinite(west))map.fitBounds([[west,south],[east,north]],{padding:55,maxZoom:16});notify('Đã nạp GeoJSON từ máy của anh. Dữ liệu chưa được xác minh.');}catch(err){notify('Không nạp được: '+err.message)}};
function showPlanning(show){for(const id of ['planning-fill','planning-line'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',show?'visible':'none')}
$('showLayer').onchange=()=>showPlanning($('showLayer').checked);
$('opacity').oninput=()=>{const x=Number($('opacity').value)/100;$('opacityNum').textContent=`${Math.round(x*100)}%`;if(map.getLayer('planning-fill'))map.setPaintProperty('planning-fill','fill-opacity',x)};
$('removeLayer').onclick=()=>{if(map.getSource('planning'))map.getSource('planning').setData(emptyCollection());planningMeta=null;loadedFeatures=0;$('geoFile').value='';$('layerStatus').textContent='Chưa có dữ liệu quy hoạch.';notify('Đã bỏ lớp GIS.')};
const rad=(x)=>x*Math.PI/180;
// Approximate spherical polygon area on WGS84 sphere. Measurements are NOT cadastral.
function ringArea(ring){const R=6378137;let sum=0;for(let i=0;i<ring.length;i++){const p1=ring[i],p2=ring[(i+1)%ring.length];let delta=rad(p2[0]-p1[0]);if(delta>Math.PI)delta-=2*Math.PI;if(delta< -Math.PI)delta+=2*Math.PI;sum+=delta*(2+Math.sin(rad(p1[1]))+Math.sin(rad(p2[1])))}return Math.abs(sum*R*R/2)}
function updateDraw(){if(!map.getSource('draw'))return;const feats=vertices.map(c=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:c}}));if(vertices.length>=2)feats.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:vertices}});if(vertices.length>=3)feats.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...vertices,vertices[0]]]}});map.getSource('draw').setData({type:'FeatureCollection',features:feats});$('areaResult').textContent=vertices.length>=3?`≈ ${ringArea(vertices).toLocaleString('vi-VN',{maximumFractionDigits:1})} m² (${vertices.length} đỉnh)`:`${vertices.length} đỉnh đã chọn`}
$('startDraw').onclick=()=>{drawing=true;vertices=[];updateDraw();map.getCanvas().style.cursor='crosshair';notify('Chọn các đỉnh trên bản đồ, rồi bấm Hoàn tất.')};
$('finishDraw').onclick=()=>{if(!drawing)return;drawing=false;map.getCanvas().style.cursor='';if(vertices.length<3){vertices=[];updateDraw();notify('Cần tối thiểu 3 đỉnh để đo diện tích.')}else updateDraw()};
$('undoDraw').onclick=()=>{if(!drawing || !vertices.length)return notify('Bắt đầu đo để dùng chức năng lùi đỉnh.');vertices.pop();updateDraw()};
$('clearDraw').onclick=()=>{drawing=false;vertices=[];map.getCanvas().style.cursor='';updateDraw();$('areaResult').textContent='Chưa đo'};
function readSaved(){try{const data=JSON.parse(localStorage.getItem(pointKey)||'[]');return Array.isArray(data)?data.filter(x=>validCoord(x.lat,x.lng)).slice(0,50):[]}catch{return []}}
function renderSaved(){const container=$('savedPoints');container.replaceChildren();const saved=readSaved();if(!saved.length){const span=document.createElement('span');span.className='hint';span.textContent='Chưa có điểm nào.';container.append(span);return}saved.forEach((p,i)=>{const line=document.createElement('div');line.className='inline';const btn=document.createElement('button');btn.textContent=`${i+1}. ${fmt(p.lat)}, ${fmt(p.lng)}`;btn.style.flex='1';btn.onclick=()=>{map.flyTo({center:[p.lng,p.lat],zoom:17});setPoint(p.lng,p.lat)};const del=document.createElement('button');del.textContent='×';del.title='Xóa điểm';del.onclick=()=>{const s=readSaved();s.splice(i,1);localStorage.setItem(pointKey,JSON.stringify(s));renderSaved()};line.append(btn,del);container.append(line)})}
$('savePoint').onclick=()=>{if(!selected)return;const s=readSaved();if(s.length>=50)return notify('Tối đa 50 điểm lưu trên trình duyệt.');s.unshift(selected);localStorage.setItem(pointKey,JSON.stringify(s));renderSaved();notify('Đã lưu điểm trong trình duyệt này.')};
// Explicit, non-autocomplete search. Respect the public Nominatim usage policy.
let lastAddressSearch=0, addressAbort=null;
function clearAddressResults(){ $('addressResults').replaceChildren(); }
function showAddressResult(item){
 const btn=document.createElement('button');btn.type='button';btn.className='addressResult';
 btn.textContent=item.display_name;
 btn.onclick=()=>{const lat=Number(item.lat),lng=Number(item.lon);if(!validCoord(lat,lng))return;map.flyTo({center:[lng,lat],zoom:16});setPoint(lng,lat);clearAddressResults();$('coords').value=fmt(lat)+', '+fmt(lng);if(window.innerWidth<=760)closeTools();};
 $('addressResults').append(btn);
}
$('searchAddress').onclick=async()=>{
 const q=$('address').value.trim();
 if(q.length<3)return notify('Nhập ít nhất 3 ký tự địa chỉ / địa danh.');
 if(Date.now()-lastAddressSearch<1200)return notify('Vui lòng tìm lại sau ít nhất 1 giây.');
 lastAddressSearch=Date.now();
 if(addressAbort)addressAbort.abort();addressAbort=new AbortController();
 const btn=$('searchAddress');btn.disabled=true;clearAddressResults();
 const status=document.createElement('span');status.className='hint';status.textContent='Đang tra cứu địa danh…';$('addressResults').append(status);
 try{
  const params=new URLSearchParams({q:q+', Việt Nam',format:'json',limit:'5',addressdetails:'0'});
  const response=await fetch('https://nominatim.openstreetmap.org/search?'+params,{signal:addressAbort.signal,headers:{'Accept':'application/json'}});
  if(!response.ok)throw Error('Dịch vụ tìm kiếm không phản hồi ('+response.status+').');
  const results=await response.json();clearAddressResults();
  if(!Array.isArray(results)||!results.length){notify('Không tìm thấy. Thử thêm tên quận/phường hoặc nhập tọa độ.');return;}
  results.filter(p=>validCoord(Number(p.lat),Number(p.lon))).forEach(showAddressResult);
 }catch(e){clearAddressResults();if(e.name!=='AbortError')notify('Không tra cứu được địa chỉ: '+e.message)}
 finally{btn.disabled=false;}
};
$('address').addEventListener('keydown',e=>{if(e.key==='Enter')$('searchAddress').click()});
function downloadJson(name,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/geo+json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('exportPoints').onclick=()=>{
 const saved=readSaved();if(!saved.length)return notify('Chưa có điểm lưu để xuất.');
 downloadJson('vi-tri-da-luu.geojson',{type:'FeatureCollection',features:saved.map((p,i)=>({type:'Feature',properties:{name:'Điểm '+(i+1),note:'Tọa độ do người dùng lưu; không phải quy hoạch'},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))});
 notify('Đã xuất điểm lưu ra GeoJSON.');
};
$('sharePoint').onclick=async()=>{
 if(!selected)return;
 const link=new URL(location.href);link.searchParams.set('lat',fmt(selected.lat));link.searchParams.set('lng',fmt(selected.lng));
 try{await navigator.clipboard.writeText(link.toString());notify('Đã sao chép liên kết vị trí.')}catch{notify('Không thể sao chép tự động; hãy dùng: '+link.toString())}
};
function closeTools(){$('tools').classList.remove('toolsOpen');$('toggleTools').setAttribute('aria-expanded','false');setTimeout(()=>map.resize(),100)}
$('toggleTools').onclick=()=>{const open=$('tools').classList.toggle('toolsOpen');$('toggleTools').setAttribute('aria-expanded',String(open));setTimeout(()=>map.resize(),100)};
const incoming=new URLSearchParams(location.search),shareLat=Number(incoming.get('lat')),shareLng=Number(incoming.get('lng'));
if(incoming.has('lat')&&incoming.has('lng')&&validCoord(shareLat,shareLng)){map.once('load',()=>{map.flyTo({center:[shareLng,shareLat],zoom:16});setPoint(shareLng,shareLat);$('coords').value=fmt(shareLat)+', '+fmt(shareLng)})}
$('printReport').onclick=()=>{if(!planningMeta)notify('Báo cáo hiện chưa có lớp quy hoạch đã xác minh; chỉ in bản đồ nền và vị trí.');window.print()};
renderSaved();
