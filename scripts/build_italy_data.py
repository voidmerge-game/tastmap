#!/usr/bin/env python3
"""Build the two benchmark-era historical map layers from Natural Earth 10m admin-1.
Requires pyshp + shapely. Generated GeoJSON is converted to TopoJSON by geo2topo_italy.ts.
"""
from __future__ import annotations
import json, os, urllib.request, zipfile
from pathlib import Path
import shapefile
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public' / 'data'
CACHE = Path('/var/tmp/ne')
SHP = CACHE / 'admin1' / 'ne_10m_admin_1_states_provinces.shp'
URL = 'https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip'
REGION = box(-8, 33, 30, 52)

def load_units():
    if not SHP.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        zpath = CACHE / 'admin1.zip'
        urllib.request.urlretrieve(URL, zpath)
        with zipfile.ZipFile(zpath) as z: z.extractall(CACHE / 'admin1')
    sf = shapefile.Reader(str(SHP), encoding='utf-8')
    fields = [f[0] for f in sf.fields[1:]]
    out = []
    for rec in sf.shapeRecords():
        props = dict(zip(fields, rec.record))
        geom = shape(rec.shape.__geo_interface__)
        if not geom.is_empty: out.append((props, geom))
    return out

UNITS = load_units()
def matching(pred):
    gs = [g for p, g in UNITS if pred(p)]
    if not gs: raise RuntimeError('No Natural Earth admin-1 units match requested historical union')
    return unary_union(gs).buffer(0)
def unit(p, name): return p.get('admin') == 'Italy' and p.get('name') == name
def in_region(name): return lambda p: p.get('admin') == 'Italy' and p.get('region') == name
def any_region(*names): return lambda p: p.get('admin') == 'Italy' and p.get('region') in names
def any_of(*predicates): return lambda p: any(fn(p) for fn in predicates)
def feature(name, geom, owner):
    geom = geom.intersection(REGION).buffer(0).simplify(0.003, preserve_topology=True)
    if geom.is_empty: raise RuntimeError('Empty historical feature: ' + name)
    return {'type':'Feature','properties':{'NAME':name,'SUBJECTO':owner},'geometry':mapping(geom)}

def build_1815():
    piemonte = matching(any_of(any_region('Piemonte','Liguria','Sardegna'), lambda p: unit(p, 'Aoste')))
    # Savoy and Nice were attached to the Kingdom of Sardinia until 1860; current NE admin-1 outlines are a close 10m proxy.
    french_savoy = matching(lambda p: p.get('admin') == 'France' and p.get('name') in {'Savoie','Haute-Savoie','Alpes-Maritimes'})
    sardinia = unary_union([piemonte, french_savoy]).buffer(0)
    lombardy_venetia = matching(any_of(any_region('Lombardia','Veneto'), lambda p: unit(p,'Udine') or unit(p,'Pordenone')))
    parma = matching(lambda p: unit(p,'Parma') or unit(p,'Piacenza'))
    modena = matching(lambda p: unit(p,'Modena') or unit(p,'Reggio Emilia') or unit(p,'Massa-Carrara'))
    tuscany = matching(lambda p: p.get('admin') == 'Italy' and p.get('region') == 'Toscana' and p.get('name') != 'Massa-Carrara')
    papal = matching(any_of(any_region('Lazio','Umbria','Marche'), lambda p: p.get('admin')=='Italy' and p.get('name') in {'Bologna','Ferrara','Ravenna','Forlì-Cesena','Rimini'}))
    two_sicilies = matching(any_region('Abruzzo','Molise','Campania','Apulia','Basilicata','Calabria','Sicily'))
    austrian = matching(lambda p: p.get('admin') in {'Austria','Slovenia','Croatia'}).intersection(box(8,43,20,50))
    france = matching(lambda p: p.get('admin') == 'France' and p.get('name') not in {'Savoie','Haute-Savoie','Alpes-Maritimes'}).intersection(box(-8,41,9,52))
    san_marino = matching(lambda p: p.get('admin') == 'San Marino')
    items = [
      ('Kingdom of Sardinia', sardinia, 'sardinia'),
      ('Lombardy–Venetia', lombardy_venetia, 'austria'),
      ('Duchy of Parma', parma, 'duchies'),
      ('Duchy of Modena', modena, 'duchies'),
      ('Grand Duchy of Tuscany', tuscany, 'duchies'),
      ('Papal States', papal, 'papal'),
      ('Kingdom of the Two Sicilies', two_sicilies, 'twosicilies'),
      ('Austrian Empire', austrian, 'austria'), ('France', france, 'france'), ('San Marino', san_marino, 'independent'),
    ]
    return {'type':'FeatureCollection','features':[feature(*x) for x in items]}

def build_1871():
    excluded = {'Bozen','Trento','Trieste','Gorizia'}
    kingdom = matching(lambda p: p.get('admin') == 'Italy' and p.get('name') not in excluded)
    austro_hungary = matching(lambda p: p.get('admin') in {'Austria','Slovenia','Croatia'}).intersection(box(8,43,20,50))
    france = matching(lambda p: p.get('admin') == 'France').intersection(box(-8,41,9,52))
    san_marino = matching(lambda p: p.get('admin') == 'San Marino')
    items = [('Kingdom of Italy', kingdom, 'italy'),('Austria-Hungary', austro_hungary, 'austria'),('France', france, 'france'),('San Marino', san_marino, 'independent')]
    return {'type':'FeatureCollection','features':[feature(*x) for x in items]}

PUBLIC.mkdir(parents=True, exist_ok=True)
for name, fc in [('italy_1815',build_1815()),('italy_1871',build_1871())]:
    with open(PUBLIC / f'{name}.geojson','w',encoding='utf-8') as f: json.dump(fc,f,ensure_ascii=False,separators=(',',':'))
    print(name, len(fc['features']), 'features', (PUBLIC/f'{name}.geojson').stat().st_size, 'bytes')
