/* Quy Hoạch TP.HCM AI v0.5 — Leaflet; measurement and accessible base layers. */
'use strict';
const $=id=>document.getElementById(id);
const places={hcm:[10.7769,106.7009],thudau:[10.9804,106.6519],vungtau:[10.3460,107.0843]};
let map=null,planningLayer=null,planningMeta=null,planningFeatures=[],selected=null,drawing=false,vertices=[],drawLayer=null,pointMarker=null,basemap=null,measureMode='area',rasterOverlay=null,rasterObjectUrl=null;
const pointKey='qhtphcm-saved-points-v1';
const validCoord=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
const fmt=x=>Number(x).toFixed(6);
function notify(s){const el=$('feedback');el.textContent=s;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.textContent='',6500)}
function error(s){const el=$('mapError');el.hidden=false;el.textContent=s;console.error(s)}
if(!window.L){error('Thư viện Leaflet chưa tải được. Thử tắt chặn CDN unpkg.com hoặc kiểm tra mạng.');}
else init();
function init(){
 try{
  map=L.map('map',{zoomControl:true,preferCanvas:true}).setView([10.77,106.87],9);
  basemap=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  });
  let errors=0,loaded=0;
  basemap.on('tileerror',()=>{errors++;if(errors>=5 && !loaded)error('Không tải được ảnh nền OpenStreetMap. Kiểm tra kết nối tới tile.openstreetmap.org hoặc thử mạng khác.');});
  basemap.on('tileload',()=>{loaded++;$('mapError').hidden=true;});
  basemap.addTo(map);
  L.control.scale({imperial:false,metric:true,position:'bottomleft'}).addTo(map);
  $('baseStyle').onchange=()=>{
    $('map').classList.toggle('grayscaleMap',$('baseStyle').value==='gray');
    notify($('baseStyle').value==='gray'?'Đã bật bản đồ nền đơn sắc.':'Đã bật bản đồ đường phố.');
  };
  $('measureMode').onchange=()=>{measureMode=$('measureMode').value;drawing=false;vertices=[];updateDraw();$('areaResult').textContent='Chưa đo';notify(measureMode==='area'?'Đo diện tích: cần ít nhất 3 đỉnh.':'Đo khoảng cách: cần ít nhất 2 điểm.')};
  map.on('click',e=>{
   if(drawing){vertices.push([e.latlng.lat,e.latlng.lng]);updateDraw();return;}
   setPoint(e.latlng.lat,e.latlng.lng);
  });
  $('place').onchange=()=>map.flyTo(places[$('place').value],12);
  $('goto').onclick=()=>{const parts=$('coords').value.trim().split(/[;,\s]+/).map(Number);if(parts.length!==2||!validCoord(parts[0],parts[1]))return notify('Nhập hai tọa độ hợp lệ: vĩ độ, kinh độ.');setPoint(parts[0],parts[1]);map.flyTo(parts,16)};
  $('showLayer').onchange=()=>showPlanning($('showLayer').checked);
  $('opacity').oninput=()=>{$('opacityNum').textContent=$('opacity').value+'%';if(planningLayer)planningLayer.setStyle({fillOpacity:Number($('opacity').value)/100})};
  $('loadGeo').onclick=loadGeo;
  $('loadRaster').onclick=loadRaster;
  $('removeRaster').onclick=removeRaster;
  $('showRaster').onchange=()=>{if(!rasterOverlay)return; if($('showRaster').checked)rasterOverlay.addTo(map);else map.removeLayer(rasterOverlay)};
  $('rasterOpacity').oninput=()=>{$('rasterOpacityText').textContent=$('rasterOpacity').value+'%';if(rasterOverlay)rasterOverlay.setOpacity(Number($('rasterOpacity').value)/100)};
  $('checkPoint').onclick=()=>{if(!selected)return notify('Chọn một điểm trên bản đồ trước.');querySelectedPoint()};
  $('removeLayer').onclick=()=>{if(planningLayer){map.removeLayer(planningLayer);planningLayer=null;}planningMeta=null;planningFeatures=[];$('pointQueryStatus').textContent='Chưa có lớp dữ liệu để đối chiếu.';$('mapLegend').classList.remove('visible');$('geoFile').value='';$('layerStatus').textContent='Chưa có dữ liệu quy hoạch.';notify('Đã xóa lớp GIS.')};
  $('startDraw').onclick=()=>{drawing=true;vertices=[];updateDraw();map.getContainer().style.cursor='crosshair';notify('Chọn các đỉnh trên bản đồ. Bấm Hoàn tất khi xong.')};
  $('finishDraw').onclick=()=>{drawing=false;map.getContainer().style.cursor='';const min=measureMode==='area'?3:2;if(vertices.length<min){vertices=[];updateDraw();notify('Cần tối thiểu '+min+' điểm để đo.')}else updateDraw()};
  $('undoDraw').onclick=()=>{if(!drawing||!vertices.length)return notify('Chưa có đỉnh đang vẽ.');vertices.pop();updateDraw()};
  $('clearDraw').onclick=()=>{drawing=false;vertices=[];map.getContainer().style.cursor='';updateDraw();$('areaResult').textContent='Chưa đo'};
  $('savePoint').onclick=()=>{if(!selected)return;const arr=readSaved();if(arr.length>=50)return notify('Đã lưu tối đa 50 điểm.');arr.unshift(selected);localStorage.setItem(pointKey,JSON.stringify(arr));renderSaved();notify('Đã lưu vị trí trên trình duyệt này.')};
  $('exportPoints').onclick=exportPoints;
  $('sharePoint').onclick=sharePoint;
  $('printReport').onclick=()=>{if(!planningMeta)notify('Bản đồ chưa có lớp quy hoạch đã xác minh.');window.print()};
  $('searchAddress').onclick=searchAddress;
  $('address').addEventListener('keydown',e=>{if(e.key==='Enter')searchAddress()});
  $('toggleTools').onclick=()=>{const isOpen=$('tools').classList.toggle('toolsOpen');$('toggleTools').setAttribute('aria-expanded',String(isOpen));setTimeout(()=>map.invalidateSize(),300)};
  renderSaved();
  const params=new URLSearchParams(location.search),lat=Number(params.get('lat')),lng=Number(params.get('lng'));
  if(params.has('lat')&&params.has('lng')&&validCoord(lat,lng)){setPoint(lat,lng);map.setView([lat,lng],16)}
  setTimeout(()=>map.invalidateSize(),250);
 }catch(e){error('Không thể khởi động bản đồ: '+(e.message||String(e)));}
}
function closeTools(){if(window.innerWidth<=760){$('tools').classList.remove('toolsOpen');$('toggleTools').setAttribute('aria-expanded','false');setTimeout(()=>map.invalidateSize(),300)}}
function setPoint(lat,lng,props){
 selected={lat,lng};$('savePoint').disabled=false;$('sharePoint').disabled=false;
 if(pointMarker)map.removeLayer(pointMarker);
 pointMarker=L.circleMarker([lat,lng],{radius:7,color:'#fff',weight:2,fillColor:'#e65b3a',fillOpacity:1}).addTo(map);
 let msg='WGS84: '+fmt(lat)+', '+fmt(lng)+'\n';
 if(props){msg+='\nLớp: '+(planningMeta?.name||'Không xác định')+'\nNguồn: '+(planningMeta?.url||'Chưa cung cấp')+'\nQuyền: '+(planningMeta?.rights||'Chưa cung cấp')+'\nThuộc tính:\n';Object.entries(props).slice(0,25).forEach(([k,v])=>msg+=k+': '+String(v).slice(0,250)+'\n');msg+='\nDữ liệu người dùng nạp; chưa xác minh.'}
 else msg+='Chưa có thông tin quy hoạch tại điểm này.';
 const pre=document.createElement('pre');pre.textContent=msg;pre.style.cssText='white-space:pre-wrap;font:inherit;margin:0';$('detailBody').replaceChildren(pre);
}
function validate(geo){
 if(!geo||geo.type!=='FeatureCollection'||!Array.isArray(geo.features))throw Error('Cần GeoJSON FeatureCollection.');
 if(geo.features.length>20000)throw Error('Vượt 20.000 đối tượng.');
 let n=0;for(const f of geo.features){
  if(f.type!=='Feature'||!f.geometry||!['Polygon','MultiPolygon'].includes(f.geometry.type))throw Error('Chỉ nhận Polygon/MultiPolygon.');
  function check(c){if(typeof c?.[0]==='number'){n++;if(n>500000)throw Error('Quá nhiều đỉnh.');if(!validCoord(c[1],c[0]))throw Error('Cần tọa độ WGS84 EPSG:4326.');return;}if(Array.isArray(c))c.forEach(check)}
  check(f.geometry.coordinates);
 }return geo;
}
async function loadGeo(){
 const file=$('geoFile').files[0],name=$('sourceName').value.trim(),url=$('sourceUrl').value.trim(),rights=$('sourceRights').value.trim();
 if(!$('confirmPlan').checked||!$('confirmRights').checked)return notify('Cần xác nhận đúng đồ án 1125/QĐ-TTg và quyền sử dụng dữ liệu.');
 if(!file||!name||!url||!rights)return notify('Cần đủ file, tên, URL nguồn và quyền sử dụng.');
 if(!/1125|2040|2060|quy.ho.ch.chung/i.test(name+' '+url))return notify('Tên hoặc URL nguồn phải liên hệ rõ đồ án 1125/QĐ-TTg (2040/2060).');
 if(!/^https?:\/\//i.test(url))return notify('URL nguồn phải bắt đầu bằng https:// hoặc http://.');
 if(file.size>12*1024*1024)return notify('File vượt 12 MB.');
 try{
  const geo=validate(JSON.parse(await file.text()));
  const layer=L.geoJSON(geo,{style:()=>({color:'#02645f',weight:2,fillColor:'#148c7c',fillOpacity:Number($('opacity').value)/100}),onEachFeature:(f,lyr)=>lyr.on('click',e=>{if(drawing)return;L.DomEvent.stopPropagation(e);setPoint(e.latlng.lat,e.latlng.lng,f.properties||{})})});
  if(planningLayer)map.removeLayer(planningLayer);
  planningLayer=layer;planningMeta={name,url,rights,planId:'1125/QĐ-TTg',verified:false};planningFeatures=geo.features;layer.addTo(map);$('mapLegend').classList.add('visible');
  $('pointQueryStatus').textContent='Đã có '+planningFeatures.length+' đối tượng do người dùng cung cấp, chưa xác minh. Chọn điểm và bấm Tra cứu.';
  $('showLayer').checked=true;$('layerStatus').textContent=name+' · '+geo.features.length+' vùng · CHƯA XÁC MINH · '+file.name;
  if(layer.getBounds().isValid())map.fitBounds(layer.getBounds(),{padding:[35,35],maxZoom:16});
  notify('Đã nạp file GIS của anh. Dữ liệu chưa được xác minh.');
 }catch(e){notify('Không nạp được: '+(e.message||e))}
}
function pointInRing(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>point[1])!==(b[1]>point[1])){
   const x=(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];
   if(point[0]<x)inside=!inside;
  }
 }
 return inside;
}
function pointInPolygon(point,coordinates){
 if(!Array.isArray(coordinates)||!coordinates.length||!pointInRing(point,coordinates[0]))return false;
 return !coordinates.slice(1).some(hole=>pointInRing(point,hole));
}
function matchesFeature(lat,lng,f){
 const point=[lng,lat],g=f.geometry;
 if(!g)return false;
 if(g.type==='Polygon')return pointInPolygon(point,g.coordinates);
 if(g.type==='MultiPolygon')return g.coordinates.some(p=>pointInPolygon(point,p));
 return false;
}
function querySelectedPoint(){
 if(!selected)return;
 if(!planningMeta || !planningFeatures.length){
  $('pointQueryStatus').textContent='Chưa có lớp dữ liệu 1125/QĐ-TTg được cấp quyền và nạp vào website. Không thể xác định quy hoạch tại điểm này.';
  return;
 }
 const hits=planningFeatures.filter(f=>matchesFeature(selected.lat,selected.lng,f));
 if(!hits.length){
  $('pointQueryStatus').textContent='Không tìm thấy polygon giao với điểm trong FILE ĐÃ NẠP. Không đồng nghĩa vị trí nằm ngoài phạm vi đồ án hoặc không có quy hoạch.';
  return;
 }
 const summary='Đã tìm thấy '+hits.length+' vùng giao điểm trong FILE DO NGƯỜI DÙNG CUNG CẤP (chưa xác minh).';
 $('pointQueryStatus').textContent=summary;
 const lines=hits.slice(0,5).map((f,i)=>'Vùng '+(i+1)+': '+Object.entries(f.properties||{}).slice(0,12).map(([k,v])=>k+'='+String(v).slice(0,90)).join('; '));
 const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font:inherit;margin:0';pre.textContent='WGS84: '+fmt(selected.lat)+', '+fmt(selected.lng)+'\n'+summary+'\nNguồn tự khai: '+planningMeta.url+'\n'+lines.join('\n')+'\nKhông dùng kết quả để kết luận pháp lý.';
 $('detailBody').replaceChildren(pre);
}
async function loadSourceCatalog(){
 try{
  const response=await fetch('./data/sources.json?v=1',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const catalog=await response.json();
  if(catalog.plan?.decision!=='1125/QĐ-TTg')throw Error('Danh mục nguồn không đúng đồ án.');
  const n=(catalog.datasets||[]).filter(d=>d.status==='approved_for_public_redistribution').length;
  $('planDatasetStatus').textContent=n?'Có '+n+' bộ dữ liệu được phê duyệt để tích hợp; cần kiểm tra lớp trước khi hiển thị.':'Chưa có dữ liệu GIS vector của đồ án được xác minh quyền tái sử dụng. Đang hiển thị bản đồ nền và liên kết văn bản gốc.';
 }catch(e){$('planDatasetStatus').textContent='Chưa đọc được danh mục nguồn: '+e.message;}
}
loadSourceCatalog();
function showPlanning(show){if(!planningLayer)return;if(show)planningLayer.addTo(map);else map.removeLayer(planningLayer)}
function ringArea(ring){const rad=x=>x*Math.PI/180,R=6378137;let sum=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];let d=rad(b[1]-a[1]);if(d>Math.PI)d-=2*Math.PI;if(d< -Math.PI)d+=2*Math.PI;sum+=d*(2+Math.sin(rad(a[0]))+Math.sin(rad(b[0])))}return Math.abs(sum*R*R/2)}
function updateDraw(){
 if(drawLayer)map.removeLayer(drawLayer);
 drawLayer=L.layerGroup();
 if(measureMode==='area'&&vertices.length>=3)L.polygon(vertices,{color:'#ce6f10',weight:3,fillColor:'#efaa38',fillOpacity:.24}).addTo(drawLayer);
 else if(vertices.length>=2)L.polyline(vertices,{color:'#ce6f10',weight:3}).addTo(drawLayer);
 vertices.forEach(v=>L.circleMarker(v,{radius:4,color:'#ce6f10',fillOpacity:1}).addTo(drawLayer));
 drawLayer.addTo(map);
 if(measureMode==='area'){$('areaResult').textContent=vertices.length>=3?'≈ '+ringArea(vertices).toLocaleString('vi-VN',{maximumFractionDigits:1})+' m² ('+vertices.length+' đỉnh)':vertices.length+' đỉnh đã chọn'}
 else{const distance=vertices.slice(1).reduce((total,p,i)=>total+map.distance(vertices[i],p),0);
 $('areaResult').textContent=vertices.length>=2?'≈ '+(distance>=1000?(distance/1000).toLocaleString('vi-VN',{maximumFractionDigits:3})+' km':distance.toLocaleString('vi-VN',{maximumFractionDigits:1})+' m')+' ('+vertices.length+' điểm)':vertices.length+' điểm đã chọn';}
}
function readSaved(){try{const a=JSON.parse(localStorage.getItem(pointKey)||'[]');return Array.isArray(a)?a.filter(x=>validCoord(x.lat,x.lng)).slice(0,50):[]}catch{return []}}
function renderSaved(){
 const el=$('savedPoints');el.replaceChildren();const arr=readSaved();if(!arr.length){const sp=document.createElement('span');sp.className='hint';sp.textContent='Chưa có điểm nào.';el.append(sp)}
 arr.forEach((p,i)=>{const row=document.createElement('div');row.className='inline';const btn=document.createElement('button');btn.style.flex='1';btn.textContent=(i+1)+'. '+fmt(p.lat)+', '+fmt(p.lng);btn.onclick=()=>{map.flyTo([p.lat,p.lng],16);setPoint(p.lat,p.lng);closeTools()};const del=document.createElement('button');del.textContent='×';del.title='Xóa điểm';del.onclick=()=>{const a=readSaved();a.splice(i,1);localStorage.setItem(pointKey,JSON.stringify(a));renderSaved()};row.append(btn,del);el.append(row)})
}
function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/geo+json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function exportPoints(){const arr=readSaved();if(!arr.length)return notify('Chưa có điểm để xuất.');download('vi-tri-da-luu.geojson',{type:'FeatureCollection',features:arr.map((p,i)=>({type:'Feature',properties:{name:'Điểm '+(i+1)},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))});notify('Đã xuất GeoJSON.')}
async function sharePoint(){if(!selected)return;const url=new URL(location.href);url.searchParams.set('lat',fmt(selected.lat));url.searchParams.set('lng',fmt(selected.lng));try{await navigator.clipboard.writeText(url.toString());notify('Đã sao chép liên kết.')}catch{notify('Liên kết: '+url.toString())}}
let lastSearch=0;
async function searchAddress(){
 const q=$('address').value.trim();if(q.length<3)return notify('Nhập ít nhất 3 ký tự.');
 if(Date.now()-lastSearch<1200)return notify('Vui lòng giãn cách ít nhất 1 giây.');lastSearch=Date.now();
 const btn=$('searchAddress');btn.disabled=true;const results=$('addressResults');results.replaceChildren();results.textContent='Đang tìm...';
 try{
  const params=new URLSearchParams({q:q+', Việt Nam',format:'json',limit:'5'});
  const resp=await fetch('https://nominatim.openstreetmap.org/search?'+params,{headers:{Accept:'application/json'}});
  if(!resp.ok)throw Error('Mã HTTP '+resp.status);
  const json=await resp.json();results.replaceChildren();if(!json.length)return notify('Không tìm thấy địa danh.');
  json.forEach(p=>{const lat=Number(p.lat),lng=Number(p.lon);if(!validCoord(lat,lng))return;const option=document.createElement('button');option.className='addressResult';option.textContent=p.display_name;option.onclick=()=>{map.flyTo([lat,lng],16);setPoint(lat,lng);$('coords').value=fmt(lat)+', '+fmt(lng);results.replaceChildren();closeTools()};results.append(option)})
 }catch(e){results.replaceChildren();notify('Không thể tìm địa chỉ: '+e.message)}finally{btn.disabled=false}
}

/* v0.7 — optional local image overlay, never an official GIS layer */
function removeRaster(){
 if(map&&rasterOverlay){map.removeLayer(rasterOverlay);rasterOverlay=null}
 if(rasterObjectUrl){URL.revokeObjectURL(rasterObjectUrl);rasterObjectUrl=null}
 $('rasterStatus').textContent='Chưa có ảnh Raster đã định vị được nạp.';
 $('rasterFile').value='';
}
async function loadRaster(){
 if(!map)return notify('Bản đồ nền chưa sẵn sàng.');
 const file=$('rasterFile').files[0];
 if(!file || !['image/png','image/jpeg'].includes(file.type))return notify('Chọn ảnh PNG hoặc JPG đã căn chỉnh.');
 if(file.size>15*1024*1024)return notify('Ảnh vượt 15 MB. Vui lòng tối ưu ảnh hoặc tạo raster tiles hợp lệ.');
 if(!$('rasterRights').checked)return notify('Cần xác nhận đúng đồ án và quyền sử dụng ảnh.');
 const ids=['rasterSouth','rasterWest','rasterNorth','rasterEast'];
 const fields=ids.map(id=>$(id).value.trim());
 if(fields.some(v=>!v||!/^-?\d+(\.\d+)?$/.test(v)))return notify('Nhập đủ bốn giới hạn tọa độ WGS84 dạng thập phân.');
 const [south,west,north,east]=fields.map(Number);
 if(!validCoord(south,west)||!validCoord(north,east)||north<=south||east<=west)return notify('Giới hạn tọa độ không hợp lệ: Bắc phải lớn hơn Nam, Đông lớn hơn Tây.');
 if(north-south>5||east-west>5)return notify('Phạm vi quá lớn so với vùng bản vẽ dự kiến; kiểm tra lại tọa độ.');
 // Reject thumbnails/invalid image files before drawing them.
 const pendingUrl=URL.createObjectURL(file);
 try {
  const img=new Image();img.src=pendingUrl;
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Ảnh không đọc được.'))});
  if(img.naturalWidth<300||img.naturalHeight<300)throw Error('Ảnh quá nhỏ để tham khảo bản vẽ.');
  const layer=L.imageOverlay(pendingUrl,[[south,west],[north,east]],{opacity:Number($('rasterOpacity').value)/100,interactive:false,alt:'Ảnh bản vẽ do người dùng cung cấp, chưa kiểm chứng độ chính xác tọa độ'});
  if(rasterOverlay)map.removeLayer(rasterOverlay);
  if(rasterObjectUrl)URL.revokeObjectURL(rasterObjectUrl);
  rasterOverlay=layer;rasterObjectUrl=pendingUrl;
  layer.addTo(map);layer.bringToBack(); // Leaflet overlay pane stays above the OSM tile pane.
  $('showRaster').checked=true;map.fitBounds([[south,west],[north,east]],{padding:[20,20],maxZoom:15});
  $('rasterStatus').textContent=file.name+' · '+img.naturalWidth+'×'+img.naturalHeight+' · ĐÃ NẠP CỤC BỘ · TỌA ĐỘ NGƯỜI DÙNG KHAI BÁO · CHƯA KIỂM ĐỊNH. Phải đối chiếu điểm khống chế trước khi sử dụng.';
  notify('Đã phủ ảnh Raster tại tọa độ khai báo. Chưa xác minh căn chỉnh.');
 } catch(e){URL.revokeObjectURL(pendingUrl);notify('Không nạp được ảnh: '+e.message)}
}
