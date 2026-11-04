#!/usr/bin/env python3
"""Convert *already decoded DXF* geometry to GIS GeoJSON for local verification.

This program does NOT decode binary DWG. Convert DWG to DXF with a trusted
desktop converter (for example ODA File Converter), then run this script.
No invented coordinate transform: accepts only explicit WGS84 input.
"""
import argparse
import json
import math
import sys
from pathlib import Path
import ezdxf

def is_wgs84(x,y):
    return math.isfinite(x) and math.isfinite(y) and -180 <= x <= 180 and -90 <= y <= 90

def convert(inp, output, source_crs, plan_id):
    if source_crs != "EPSG:4326":
        raise ValueError("CRS không phải WGS84. Phải xác minh CRS và chuyển đổi chính xác bằng QGIS trước (VN-2000 có múi chiếu/tham số riêng).")
    doc=ezdxf.readfile(str(inp))
    auditor=doc.audit()
    if auditor.has_errors:
        raise ValueError(f"DXF có {len(auditor.errors)} lỗi; cần sửa CAD trước.")
    features=[]
    skipped={}
    for entity in doc.modelspace():
        typ=entity.dxftype()
        layer=entity.dxf.layer
        coords=None
        closed=False
        if typ=="LINE":
            coords=[list(entity.dxf.start)[:2],list(entity.dxf.end)[:2]]
        elif typ=="LWPOLYLINE":
            coords=[[float(x),float(y)] for x,y,*_ in entity.get_points("xy")]
            closed=bool(entity.closed)
        elif typ=="POLYLINE" and entity.is_2d_polyline:
            coords=[[float(v.dxf.location.x),float(v.dxf.location.y)] for v in entity.vertices]
            closed=bool(entity.is_closed)
        if not coords or len(coords)<2:
            skipped[typ]=skipped.get(typ,0)+1
            continue
        if not all(is_wgs84(x,y) for x,y in coords):
            raise ValueError(f"Đối tượng layer '{layer}' có tọa độ ngoài WGS84. Không được gán EPSG:4326 giả.")
        if closed and len(coords)>=3:
            if coords[0]!=coords[-1]:
                coords.append(coords[0])
            geometry={"type":"Polygon","coordinates":[coords]}
        else:
            geometry={"type":"LineString","coordinates":coords}
        features.append({"type":"Feature","properties":{
            "cad_layer":layer, "cad_type":typ,
            "plan_id_claimed":plan_id, "verification":"UNVERIFIED"},
            "geometry":geometry})
    result={"type":"FeatureCollection","features":features}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False),encoding="utf-8")
    return {"features":len(features),"skipped":skipped}
def main():
    parser=argparse.ArgumentParser(description="Local verified-CRS DXF to GeoJSON converter")
    parser.add_argument("input",type=Path)
    parser.add_argument("output",type=Path)
    parser.add_argument("--source-crs",required=True,help="Only EPSG:4326 accepted; reproject in QGIS first")
    parser.add_argument("--plan-id",default="1125/QD-TTg")
    args=parser.parse_args()
    try:
        print(json.dumps(convert(args.input,args.output,args.source_crs,args.plan_id),ensure_ascii=False,indent=2))
    except (ValueError, OSError, ezdxf.DXFError) as err:
        print("Conversion refused:",str(err),file=sys.stderr)
        sys.exit(2)
if __name__=="__main__":
    main()
