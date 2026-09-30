import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,Cell,PieChart,Pie} from 'recharts';
import {SC,ST} from './data.js';
export function StatusChart({parcels}){
  const d=Object.keys(ST).map(k=>({n:ST[k][1],v:parcels.filter(p=>p.s===k).length,c:SC[k]}));
  return <div className="card"><h3 className="h19">Parcels by status</h3><div style={{height:220}}><ResponsiveContainer><BarChart data={d}><XAxis dataKey="n"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="v">{d.map(x=><Cell key={x.n} fill={x.c}/>)}</Bar></BarChart></ResponsiveContainer></div></div>;
}
export function TrustChart({parcels}){
  const d=[['Verified',p=>p.t>=75,'#16A34A'],['Needs review',p=>p.t>=50&&p.t<75,'#F59E0B'],['Conflict',p=>p.t<50,'#DC2626']].map(([n,f,c])=>({n,v:parcels.filter(f).length,c}));
  return <div className="card"><h3 className="h19">Trust Score bands</h3><div style={{height:220}}><ResponsiveContainer><PieChart><Pie data={d} dataKey="v" nameKey="n" innerRadius={45} outerRadius={80} label>{d.map(x=><Cell key={x.n} fill={x.c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>;
}
