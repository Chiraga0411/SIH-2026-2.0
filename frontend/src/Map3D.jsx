import {useEffect,useRef} from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {SC} from './data.js';

/* The mock parcels are drawn in SVG units (600x380). Until real ULPIN geometries come from the backend,
   we place them on real coordinates in Chandigarh (Sector 22 area). Replace toGeoJSON() with GET /parcels (GeoJSON). */
const CENTER=[76.7794,30.7333],KX=0.0000118,KY=0.0000101;
/* grid point (300,190) maps to the state's centre; each state passes its own centre (see GEO in data.js) */
const geo=(x,y,c=CENTER)=>[c[0]+(x-300)*KX,c[1]-(y-190)*KY];
export const toGeoJSON=(parcels,c=CENTER)=>({type:'FeatureCollection',features:parcels.map(p=>{
  const ring=p.pts.split(' ').map(q=>{const [x,y]=q.split(',').map(Number);return geo(x,y,c)});ring.push(ring[0]);
  return {type:'Feature',properties:{id:p.id,name:p.n,ulpin:p.u,status:SC[p.s],zone:p.z==='R'?'#8FB4E3':'#B7A3E0',trust:p.t},
    geometry:{type:'Polygon',coordinates:[ring]}}})});

const STYLES={Map:'mapbox://styles/mapbox/streets-v12',Satellite:'mapbox://styles/mapbox/satellite-streets-v12',Terrain:'mapbox://styles/mapbox/outdoors-v12'};

export default function Map3D({parcels,sel,mstyle,layers,onSelect,center=CENTER}){
  const box=useRef(),map=useRef(),first=useRef(true),cur=useRef();
  cur.current={parcels,sel,layers,onSelect,center};

  const refresh=()=>{
    const m=map.current;if(!m||!m.getSource('parcels'))return;
    const {parcels,sel,layers,center}=cur.current;
    m.getSource('parcels').setData(toGeoJSON(parcels,center));
    m.setPaintProperty('parcels-fill','fill-color',layers.zones?['get','zone']:'#ffffff');
    m.setPaintProperty('parcels-line','line-color',layers.status?['get','status']:'#ffffff');
    m.setFilter('parcels-sel',['==',['get','id'],sel??-1]);
  };

  const setup=()=>{
    const m=map.current;
    if(!m.getSource('mapbox-dem')){
      m.addSource('mapbox-dem',{type:'raster-dem',url:'mapbox://mapbox.mapbox-terrain-dem-v1',tileSize:512,maxzoom:14});
    }
    m.setTerrain({source:'mapbox-dem',exaggeration:1.3});
    if(!m.getSource('parcels')){
      m.addSource('parcels',{type:'geojson',data:toGeoJSON(cur.current.parcels,cur.current.center)});
      m.addLayer({id:'parcels-fill',type:'fill',source:'parcels',paint:{'fill-color':['get','zone'],'fill-opacity':0.5}});
      m.addLayer({id:'parcels-line',type:'line',source:'parcels',paint:{'line-color':['get','status'],'line-width':2.5}});
      m.addLayer({id:'parcels-sel',type:'line',source:'parcels',filter:['==',['get','id'],-1],paint:{'line-color':'#ffffff','line-width':5}});
    }
    refresh();
  };

  // create the map once
  useEffect(()=>{
    mapboxgl.accessToken=import.meta.env.VITE_MAPBOX_TOKEN;
    const m=new mapboxgl.Map({container:box.current,style:STYLES[mstyle]||STYLES.Satellite,center:cur.current.center,zoom:16,pitch:60,bearing:-20});
    map.current=m;
    m.addControl(new mapboxgl.NavigationControl(),'top-right');
    m.on('style.load',setup);                    // also fires again after setStyle()
    m.on('click','parcels-fill',e=>cur.current.onSelect?.(e.features[0].properties.id));
    m.on('mouseenter','parcels-fill',()=>{m.getCanvas().style.cursor='pointer'});
    m.on('mouseleave','parcels-fill',()=>{m.getCanvas().style.cursor=''});
    return()=>m.remove();
  },[]);

  // state switcher: fly to the chosen state's centre
  const lastC=useRef(center);
  useEffect(()=>{
    if(lastC.current===center)return;
    lastC.current=center;
    map.current?.flyTo({center,zoom:16,pitch:60,bearing:-20,duration:2200,essential:true});
  },[center]);

  // Map / Satellite / Terrain buttons
  useEffect(()=>{
    if(first.current){first.current=false;return}
    map.current?.setStyle(STYLES[mstyle]);
  },[mstyle]);

  // data, layer toggles, selection
  useEffect(refresh,[parcels,layers,sel]);

  // fly to the selected parcel (also works for ULPIN search)
  useEffect(()=>{
    const m=map.current,p=parcels.find(x=>x.id===sel);if(!m||!p)return;
    const pts=p.pts.split(' ').map(q=>{const [x,y]=q.split(',').map(Number);return geo(x,y,cur.current.center)});
    const lng=pts.reduce((s,q)=>s+q[0],0)/pts.length,lat=pts.reduce((s,q)=>s+q[1],0)/pts.length;
    m.flyTo({center:[lng,lat],zoom:17.5,duration:1200});
  },[sel]);

  return <div ref={box} style={{position:'absolute',inset:0}}/>;
}