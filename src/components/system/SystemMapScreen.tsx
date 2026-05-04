'use client';
// ═══════════════════════════════════════════════════════════
// SystemMapScreen · Live Adaptive System Monitor v2
// Layout horizontal izquierda→derecha (n8n-style).
// Swimlanes: Misión / Hábitos / Looksmax / Wellness / Coach
// ═══════════════════════════════════════════════════════════

import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  Handle, Position, MarkerType, type NodeProps, type Edge,
} from '@xyflow/react';
import {
  IconPlayerPlay, IconCheckbox, IconGitBranch,
  IconPackage, IconHeartbeat, IconBrain,
  IconDatabase, IconLayoutDashboard, IconBolt,
  IconMoon, IconSparkles, IconMap2,
} from '@tabler/icons-react';
import { isHabitDone, currentStreak, adherence, type HabitId } from '@/lib/common/habits';
import { loadSessions, averageScore } from '@/lib/genesis/sessionHistory';
import { PROFILE_KEY, DEFAULT_PROFILE, type OperatorProfile } from '@/lib/genesis/progression';
import { useInventory, TOOLS, type ToolPillar } from '@/lib/looksmax/inventory';

// ─── Colors ────────────────────────────────────────────────────
const C = { mission:'#d4956a', habits:'#72c472', looksmax:'#a094f5', wellness:'#72b8f8', inventory:'#c49af5', coach:'#5ec4c4', nucleus:'#e87a3a', night:'#8b7edd', store:'#606070', screen:'#454555' } as const;

// ─── Icon map (string key → component, keeps node data serialisable) ──
const IMAP = {
  mission:   IconPlayerPlay,
  habits:    IconCheckbox,
  gate:      IconGitBranch,
  inventory: IconPackage,
  wellness:  IconHeartbeat,
  coach:     IconBrain,
  store:     IconDatabase,
  screen:    IconLayoutDashboard,
  nucleus:   IconBolt,
  night:     IconMoon,
  looksmax:  IconSparkles,
  system:    IconMap2,
} as const;
type IKey = keyof typeof IMAP;

// ─── Habit groups ───────────────────────────────────────────────
const GRP = {
  protocol: ['morning_protocol','breathing','journaling'] as HabitId[],
  night:    ['night_protocol','no_screens_before_bed','slept_in_gate'] as HabitId[],
  nucleus:  ['salt_water_morning','coffee_9am','nsdr_session','no_caffeine_pm','optic_flow_walk','desk_closure','lunch_clean','rule_20_20_20'] as HabitId[],
  looksmax_free: ['mewing_check','jaw_release','chin_tuck','face_yoga','chewing_apples','sleep_supine','hydration_3L','sodium_low','floss'] as HabitId[],
  wellness: ['bruxism_exercise','deep_meditation','lymphatic_facial'] as HabitId[],
  looksmax_gated: ['tongue_scraper','cinnamon_paste','mouth_tape','chewing_advanced','spf_am','vitc_am','retinoid_pm','exfoliation_weekly','eye_drops_am','brow_grooming_week','derma_roller_week','minoxidil_application','finasteride_dose','potassium_intake','electrolyte_intake'] as HabitId[],
};

// ─── Helpers ────────────────────────────────────────────────────
function todayISO() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function isoBack(n:number) { const d=new Date(); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function computeGroup(ids:HabitId[]) {
  const n=ids.length||1;
  return {
    total:ids.length, doneToday:ids.filter(id=>isHabitDone(id)).length,
    avgStreak:Math.round(ids.reduce((s,id)=>s+currentStreak(id),0)/n),
    avgAdh7:Math.round(ids.reduce((s,id)=>s+adherence(id,7),0)/n*100),
    series7:Array.from({length:7},(_,di)=>{ const iso=isoBack(6-di); return ids.filter(id=>isHabitDone(id,iso)).length/n; }),
  };
}
function loadProfile():OperatorProfile { try { const r=typeof window!=='undefined'&&localStorage.getItem(PROFILE_KEY); return r?JSON.parse(r) as OperatorProfile:DEFAULT_PROFILE; } catch { return DEFAULT_PROFILE; } }

// ─── Shared micro UI ──────────────────────────────────────────
function Sp({ series, color }:{series:number[];color:string}) {
  const W=68,H=16,max=Math.max(...series,0.01),n=series.length,bw=Math.floor(W/n)-1;
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>{series.map((v,i)=>{ const h=Math.max(2,Math.round(v/max*H)); return <rect key={i} x={i*(bw+1)} y={H-h} width={bw} height={h} fill={color} opacity={0.8} rx={1}/>; })}</svg>;
}

const hOpt={style:{opacity:0,width:8,height:8,border:'none',background:'transparent'}};

function St({label,val,c}:{label:string;val:string;c:string}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
      <span style={{fontFamily:'var(--font-ui,sans-serif)',fontSize:10,color:'rgba(255,255,255,0.32)'}}>{label}</span>
      <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:10,color:c,fontWeight:500}}>{val}</span>
    </div>
  );
}

// n8n-style node: colored header strip + body
function NCard({
  ikey, kicker, title, color, w=245, children,
}:{
  ikey:IKey; kicker:string; title:string; color:string; w?:number; children?:React.ReactNode;
}) {
  const Icon = IMAP[ikey];
  return (
    <div style={{
      width:w, borderRadius:13, overflow:'hidden',
      background:'rgba(10,10,14,0.97)',
      border:`1px solid ${color}45`,
      boxShadow:`0 6px 28px ${color}1a, 0 1px 4px rgba(0,0,0,0.6)`,
    }}>
      {/* Header strip */}
      <div style={{
        background:`${color}22`,
        borderBottom:`1px solid ${color}30`,
        padding:'7px 11px',
        display:'flex', alignItems:'center', gap:7,
      }}>
        <Icon size={13} color={color} />
        <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,letterSpacing:'0.22em',textTransform:'uppercase',color,opacity:0.85}}>
          {kicker}
        </span>
      </div>
      {/* Body */}
      <div style={{padding:'9px 12px'}}>
        <div style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.88)',marginBottom:7,lineHeight:1.2}}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Node components ───────────────────────────────────────────
function ScreenNode({data:d}:NodeProps) {
  const{label,kicker,color,num,ikey}=d as {label:string;kicker:string;color:string;num?:string;ikey:IKey};
  return <NCard ikey={ikey??'screen'} kicker={`${num?num+' · ':''}${kicker}`} title={label} color={color} w={175}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
  </NCard>;
}

function MissionNode({data:d}:NodeProps) {
  const{label,kicker,color,scoreToday,avgScore7,streak,series7,ikey}=d as {label:string;kicker:string;color:string;scoreToday:number|null;avgScore7:number|null;streak:number;series7:number[];ikey:IKey};
  return <NCard ikey={ikey??'mission'} kicker={kicker} title={label} color={color}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
    <St label="score hoy" val={scoreToday!=null?`${scoreToday}`:'— sin sesión'} c={color}/>
    <St label="prom. 7d"  val={avgScore7!=null?`${avgScore7}`:'— sin datos'}   c={color}/>
    <St label="racha"     val={`${streak}d`} c={streak>0?C.habits:'rgba(255,255,255,0.3)'}/>
    <div style={{marginTop:7}}><Sp series={series7} color={color}/></div>
  </NCard>;
}

function HabitGroupNode({data:d}:NodeProps) {
  const{label,kicker,color,total,doneToday,avgStreak,avgAdh7,series7,ikey}=d as {label:string;kicker:string;color:string;total:number;doneToday:number;avgStreak:number;avgAdh7:number;series7:number[];ikey:IKey};
  const pct=total>0?Math.round(doneToday/total*100):0;
  const vc=doneToday===total?C.habits:doneToday>0?color:'rgba(255,255,255,0.22)';
  return <NCard ikey={ikey??'habits'} kicker={kicker} title={label} color={color}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
    <St label="hoy"      val={`${doneToday}/${total} · ${pct}%`} c={vc}/>
    <St label="racha p." val={`${avgStreak}d`} c={color}/>
    <St label="adh. 7d"  val={`${avgAdh7}%`}   c={color}/>
    <div style={{marginTop:7}}><Sp series={series7} color={color}/></div>
  </NCard>;
}

function GateNode({data:d}:NodeProps) {
  const{label,kicker,color,ownedCount,totalTools,unlockedHabits}=d as {label:string;kicker:string;color:string;ownedCount:number;totalTools:number;unlockedHabits:number};
  return <NCard ikey="gate" kicker={kicker} title={label} color={color} w={210}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
    <St label="tools activas" val={`${ownedCount}/${totalTools}`} c={ownedCount>0?C.habits:'rgba(255,255,255,0.3)'}/>
    <St label="hábitos hab."  val={`${unlockedHabits}`}          c={color}/>
  </NCard>;
}

function InventoryNode({data:d}:NodeProps) {
  const{label,color,total,owned}=d as {label:string;color:string;total:number;owned:number};
  return <NCard ikey="inventory" kicker="inventario" title={label} color={color} w={175}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
    <St label="adquiridas" val={`${owned}/${total}`} c={owned>0?C.habits:'rgba(255,255,255,0.28)'}/>
  </NCard>;
}

function WellnessNode({data:d}:NodeProps) {
  const{label,kicker,color,doneToday,streak,adh7}=d as {label:string;kicker:string;color:string;doneToday:boolean;streak:number;adh7:number};
  return <NCard ikey="wellness" kicker={kicker} title={label} color={color} w={210}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
    <St label="hoy"     val={doneToday?'✓  completado':'·  pendiente'} c={doneToday?C.habits:'rgba(255,255,255,0.28)'}/>
    <St label="racha"   val={`${streak}d`} c={color}/>
    <St label="adh. 7d" val={`${adh7}%`}   c={color}/>
  </NCard>;
}

function CoachNode({data:d}:NodeProps) {
  const{label,kicker,color,desc}=d as {label:string;kicker:string;color:string;desc:string};
  return <NCard ikey="coach" kicker={kicker} title={label} color={color} w={255}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
    <div style={{fontFamily:'var(--font-ui,sans-serif)',fontSize:10,color:'rgba(255,255,255,0.38)',lineHeight:1.6}}>{desc}</div>
  </NCard>;
}

function DataStoreNode({data:d}:NodeProps) {
  const{label,storeKey,color,desc}=d as {label:string;storeKey:string;color:string;desc:string};
  return <NCard ikey="store" kicker="localStorage" title={label} color={color} w={210}>
    <Handle type="target" position={Position.Left}  {...hOpt}/>
    <Handle type="source" position={Position.Right} {...hOpt}/>
    <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:8.5,color:'rgba(255,255,255,0.25)',marginBottom:5}}>{storeKey}</div>
    <div style={{fontFamily:'var(--font-ui,sans-serif)',fontSize:10,color:'rgba(255,255,255,0.38)'}}>{desc}</div>
  </NCard>;
}

const nodeTypes = { screen:ScreenNode, mission:MissionNode, habitGroup:HabitGroupNode, gate:GateNode, inventory:InventoryNode, wellness:WellnessNode, coach:CoachNode, dataStore:DataStoreNode };

// ─── Edge helpers ───────────────────────────────────────────────
const ARR = (c:string) => ({ type:MarkerType.ArrowClosed, color:c, width:14, height:14 });
const solid  = (c:string):Edge['style'] => ({stroke:c,strokeWidth:1.8});
const dashed = (c:string):Edge['style'] => ({stroke:c,strokeWidth:1.3,strokeDasharray:'5 3'});
const faint  = (c:string):Edge['style'] => ({stroke:c,strokeWidth:1,strokeDasharray:'3 5',opacity:0.5});

// ─── Layout constants ───────────────────────────────────────────
// Columns (x): 310px per slot. Rows (y): 250px per lane.
const X = (col:number) => col * 310;
const Y = (lane:number) => lane * 250;

// ─── Main ───────────────────────────────────────────────────────
export default function SystemMapScreen() {
  const inventory = useInventory();

  const live = useMemo(()=>{
    const sessions=loadSessions();
    const today=todayISO();
    const todaySess=sessions.find(s=>s.date===today)??null;
    const weekAvg=averageScore(7);
    const profile=loadProfile();
    const sess7=Array.from({length:7},(_,di)=>{ const iso=isoBack(6-di); const s=sessions.find(r=>r.date===iso); return s?s.score/100:0; });
    const totalOwned=TOOLS.filter(t=>inventory.has(t.id)).length;
    const unlockedH=new Set<HabitId>(); TOOLS.forEach(t=>{ if(inventory.has(t.id)) t.enables.forEach(h=>unlockedH.add(h)); });
    const pillarData=(['oral','structure','skin','eyes','hair','metabolism'] as ToolPillar[]).map(p=>{ const ts=TOOLS.filter(t=>t.pillar===p); return {pillar:p,total:ts.length,owned:ts.filter(t=>inventory.has(t.id)).length}; });
    return {
      todaySess,weekAvg,profile,sess7,totalOwned,unlockedH,pillarData,sessionCount:sessions.length,
      protocol: computeGroup(GRP.protocol),
      night:    computeGroup(GRP.night),
      nucleus:  computeGroup(GRP.nucleus),
      looksFree:computeGroup(GRP.looksmax_free),
      wellness: computeGroup(GRP.wellness),
      looksGated:computeGroup(GRP.looksmax_gated),
    };
  },[inventory]);

  const nodes = useMemo(()=>{
    const{todaySess,weekAvg,profile,sess7,totalOwned,unlockedH,pillarData,sessionCount,protocol,night,nucleus,looksFree,wellness,looksGated}=live;
    const PL:{[k in ToolPillar]:string}={oral:'Oral',structure:'Estructura',skin:'Piel',eyes:'Ojos',hair:'Cabello',metabolism:'Metabolismo'};

    return [
      // ── Lane labels (col -1, x=-195) ─────────────────────────
      {id:'lbl_0',type:'screen',position:{x:-195,y:Y(0)+20}, data:{label:'misión',   kicker:'flujo 01',color:C.mission,  ikey:'mission'  as IKey}},
      {id:'lbl_1',type:'screen',position:{x:-195,y:Y(1)+20}, data:{label:'hábitos',  kicker:'flujo 02',color:C.habits,   ikey:'habits'   as IKey}},
      {id:'lbl_2',type:'screen',position:{x:-195,y:Y(2)+20}, data:{label:'looksmax', kicker:'flujo 03',color:C.looksmax, ikey:'looksmax' as IKey}},
      {id:'lbl_3',type:'screen',position:{x:-195,y:Y(3)+20}, data:{label:'wellness', kicker:'flujo 04',color:C.wellness, ikey:'wellness' as IKey}},
      {id:'lbl_4',type:'screen',position:{x:-195,y:Y(4)+20}, data:{label:'coach',    kicker:'flujo 05',color:C.coach,    ikey:'coach'    as IKey}},

      // ── Lane 0: Mission flow ──────────────────────────────────
      {id:'welcome', type:'screen',  position:{x:X(0),y:Y(0)}, data:{label:'WelcomeScreen',    kicker:'pantalla · inicio',     color:C.mission, ikey:'screen'  as IKey}},
      {id:'mission', type:'mission', position:{x:X(1),y:Y(0)}, data:{label:'Misión matutina',  kicker:'genesis · protocolo',   color:C.mission, ikey:'mission' as IKey,
        scoreToday:todaySess?.score??null, avgScore7:weekAvg, streak:profile.stats?.disciplina??0, series7:sess7}},
      {id:'summary', type:'screen',  position:{x:X(2),y:Y(0)}, data:{label:'SummaryScreen',    kicker:'resultado · sesión',    color:C.mission, ikey:'screen'  as IKey}},
      {id:'xp_level',type:'mission', position:{x:X(3),y:Y(0)}, data:{label:'XP · Nivel · Stats',kicker:'progression · operator',color:C.mission,ikey:'mission' as IKey,
        scoreToday:profile.level, avgScore7:profile.xp, streak:profile.phasesCompleted, series7:sess7}},
      {id:'store_sessions',type:'dataStore',position:{x:X(4),y:Y(0)}, data:{label:'Sesiones',       storeKey:'morning-awakening-sessions', color:C.store, desc:`${sessionCount} sesiones · max 365`}},
      {id:'store_profile', type:'dataStore',position:{x:X(5),y:Y(0)}, data:{label:'Perfil Operador',storeKey:'morning-awakening-profile',  color:C.store, desc:`lv.${profile.level} · ${profile.xp} XP`}},

      // ── Lane 1: Core habits ───────────────────────────────────
      {id:'store_habits',type:'dataStore',position:{x:X(0),y:Y(1)}, data:{label:'Hábitos', storeKey:'ma-habits', color:C.store,
        desc:`${GRP.protocol.length+GRP.night.length+GRP.nucleus.length+GRP.looksmax_free.length+GRP.looksmax_gated.length+GRP.wellness.length} tipos`}},
      {id:'h_protocol', type:'habitGroup',position:{x:X(1),y:Y(1)}, data:{label:'Protocolos',   kicker:'hábitos · core',    color:C.habits,  ikey:'habits'   as IKey, ...protocol}},
      {id:'h_night',    type:'habitGroup',position:{x:X(2),y:Y(1)}, data:{label:'Noche',         kicker:'hábitos · noche',   color:C.night,   ikey:'night'    as IKey, ...night}},
      {id:'h_nucleus',  type:'habitGroup',position:{x:X(3),y:Y(1)}, data:{label:'Nucleus · día', kicker:'hábitos · jornada', color:C.nucleus, ikey:'nucleus'  as IKey, ...nucleus}},
      {id:'h_wellness', type:'habitGroup',position:{x:X(4),y:Y(1)}, data:{label:'Wellness',      kicker:'hábitos · sesiones',color:C.wellness,ikey:'wellness' as IKey, ...wellness}},

      // ── Lane 2: Looksmax ──────────────────────────────────────
      {id:'h_free',   type:'habitGroup',position:{x:X(0),y:Y(2)}, data:{label:'Looksmax libre', kicker:'hábitos · free tier',  color:C.looksmax, ikey:'looksmax' as IKey, ...looksFree}},
      {id:'gate_inv', type:'gate',      position:{x:X(1),y:Y(2)}, data:{label:'Gate inventario', kicker:'condición · tools',    color:C.inventory, ownedCount:totalOwned, totalTools:TOOLS.length, unlockedHabits:unlockedH.size}},
      {id:'h_gated',  type:'habitGroup',position:{x:X(2),y:Y(2)}, data:{label:'Looksmax gated',  kicker:'hábitos · inventario', color:C.looksmax, ikey:'looksmax' as IKey, ...looksGated}},
      {id:'store_inventory',type:'dataStore',position:{x:X(3),y:Y(2)}, data:{label:'Inventario', storeKey:'ma-looksmax-inventory', color:C.store, desc:`${totalOwned}/${TOOLS.length} tools adquiridas`}},
      // Inventory pillars — 2 columns of 3
      ...pillarData.slice(0,3).map((p,i)=>({ id:`inv_${p.pillar}`,type:'inventory',position:{x:X(4),y:Y(2)-20+i*88}, data:{label:PL[p.pillar as ToolPillar],color:C.inventory,total:p.total,owned:p.owned} })),
      ...pillarData.slice(3,6).map((p,i)=>({ id:`inv_${p.pillar}`,type:'inventory',position:{x:X(5),y:Y(2)-20+i*88}, data:{label:PL[p.pillar as ToolPillar],color:C.inventory,total:p.total,owned:p.owned} })),

      // ── Lane 3: Wellness ──────────────────────────────────────
      {id:'wellness_hub', type:'screen',  position:{x:X(0),y:Y(3)}, data:{label:'Wellness Hub',       kicker:'herramientas · hub',    color:C.wellness, ikey:'wellness' as IKey}},
      {id:'w_bruxism',    type:'wellness',position:{x:X(1),y:Y(3)}, data:{label:'Bruxismo',            kicker:'wellness · ejercicio',  color:C.wellness,
        doneToday:isHabitDone('bruxism_exercise'),  streak:currentStreak('bruxism_exercise'),  adh7:Math.round(adherence('bruxism_exercise',7)*100)}},
      {id:'w_meditation', type:'wellness',position:{x:X(2),y:Y(3)}, data:{label:'Meditación profunda', kicker:'wellness · mindfulness', color:C.wellness,
        doneToday:isHabitDone('deep_meditation'),    streak:currentStreak('deep_meditation'),    adh7:Math.round(adherence('deep_meditation',7)*100)}},
      {id:'w_lymphatic',  type:'wellness',position:{x:X(3),y:Y(3)}, data:{label:'Drenaje linfático',   kicker:'wellness · facial',     color:C.wellness,
        doneToday:isHabitDone('lymphatic_facial'),   streak:currentStreak('lymphatic_facial'),   adh7:Math.round(adherence('lymphatic_facial',7)*100)}},

      // ── Lane 4: Coach + Nucleus ───────────────────────────────
      {id:'coach',         type:'coach',  position:{x:X(0),y:Y(4)}, data:{label:'Coach System',     kicker:'inteligencia · adaptativa', color:C.coach,
        desc:'Reminders horarios · Tips bank 50+ · Conditions · Flare controls · Pill schedule · Quick log'}},
      {id:'nucleus_screen',type:'screen', position:{x:X(2),y:Y(4)}, data:{label:'Nucleus Timeline', kicker:'day mode · jornada',        color:C.nucleus, ikey:'nucleus' as IKey}},
    ];
  },[live]);

  const edges = useMemo(():Edge[]=>[
    // ── Mission flow (solid + arrows) ──────────────────
    {id:'e-w-m',  source:'welcome', target:'mission',  type:'smoothstep', style:solid(C.mission),  markerEnd:ARR(C.mission)},
    {id:'e-m-s',  source:'mission', target:'summary',  type:'smoothstep', style:solid(C.mission),  markerEnd:ARR(C.mission)},
    {id:'e-s-xp', source:'summary', target:'xp_level', type:'smoothstep', style:solid(C.mission),  markerEnd:ARR(C.mission)},
    {id:'e-xp-ss',source:'xp_level',target:'store_sessions',type:'smoothstep',style:dashed(C.store), markerEnd:ARR(C.store)},
    {id:'e-xp-sp',source:'store_sessions',target:'store_profile',type:'smoothstep',style:dashed(C.store),markerEnd:ARR(C.store)},

    // ── Mission → habits store (cross-lane write) ──────
    {id:'e-m-sh',  source:'mission',  target:'store_habits', type:'smoothstep', style:dashed(C.habits),  markerEnd:ARR(C.habits)},
    {id:'e-wh-sh', source:'w_bruxism',target:'store_habits', type:'smoothstep', style:faint(C.habits)},
    {id:'e-wm-sh', source:'w_meditation',target:'store_habits',type:'smoothstep',style:faint(C.habits)},
    {id:'e-wl-sh', source:'w_lymphatic',target:'store_habits', type:'smoothstep',style:faint(C.habits)},

    // ── Lane 1: store → habit groups ──────────────────
    {id:'e-sh-hp', source:'store_habits', target:'h_protocol', type:'smoothstep', style:solid(C.habits),   markerEnd:ARR(C.habits)},
    {id:'e-hp-hn', source:'h_protocol',   target:'h_night',    type:'smoothstep', style:solid(C.night),    markerEnd:ARR(C.night)},
    {id:'e-hn-hnu',source:'h_night',      target:'h_nucleus',  type:'smoothstep', style:solid(C.nucleus),  markerEnd:ARR(C.nucleus)},
    {id:'e-hnu-hw',source:'h_nucleus',    target:'h_wellness', type:'smoothstep', style:solid(C.wellness), markerEnd:ARR(C.wellness)},

    // ── Lane 2: Looksmax flow ──────────────────────────
    {id:'e-hf-gi', source:'h_free',    target:'gate_inv', type:'smoothstep', style:solid(C.inventory),  markerEnd:ARR(C.inventory)},
    {id:'e-gi-hg', source:'gate_inv',  target:'h_gated',  type:'smoothstep', style:solid(C.looksmax),   markerEnd:ARR(C.looksmax),
      label:'desbloquea', labelStyle:{fill:'rgba(255,255,255,0.45)',fontSize:9,fontFamily:'monospace'}},
    {id:'e-hg-si', source:'h_gated',   target:'store_inventory',type:'smoothstep',style:dashed(C.store), markerEnd:ARR(C.store)},
    // inventory store → pillars (left col)
    ...(['oral','structure','skin'] as ToolPillar[]).map(p=>({ id:`e-si-${p}`, source:'store_inventory', target:`inv_${p}`, type:'smoothstep' as const, style:faint(C.inventory) })),
    ...(['eyes','hair','metabolism'] as ToolPillar[]).map(p=>({ id:`e-si-${p}`, source:'store_inventory', target:`inv_${p}`, type:'smoothstep' as const, style:faint(C.inventory) })),

    // ── Lane 3: Wellness hub → sessions ───────────────
    {id:'e-wh-wb', source:'wellness_hub', target:'w_bruxism',    type:'smoothstep', style:solid(C.wellness),  markerEnd:ARR(C.wellness)},
    {id:'e-wb-wm', source:'w_bruxism',    target:'w_meditation', type:'smoothstep', style:solid(C.wellness),  markerEnd:ARR(C.wellness)},
    {id:'e-wm-wl', source:'w_meditation', target:'w_lymphatic',  type:'smoothstep', style:solid(C.wellness),  markerEnd:ARR(C.wellness)},

    // ── Lane 4: Coach feeds ────────────────────────────
    {id:'e-sh-co', source:'store_habits',   target:'coach',  type:'smoothstep', style:dashed(C.coach), markerEnd:ARR(C.coach)},
    {id:'e-ss-co', source:'store_sessions', target:'coach',  type:'smoothstep', style:dashed(C.coach), markerEnd:ARR(C.coach)},
  ],[]);

  return (
    <div style={{width:'100%',height:'100dvh',background:'#070709',position:'relative'}}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={{x:220,y:80,zoom:0.72}}
        minZoom={0.12}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        proOptions={{hideAttribution:true}}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="rgba(255,255,255,0.045)" />
        <Controls
          showInteractive={false}
          style={{
            background:'rgba(12,12,16,0.92)',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12,
            boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
            bottom:90,
          }}
        />
        <MiniMap
          nodeStrokeWidth={0}
          nodeColor={(n)=>{
            const d=n.data as {color?:string};
            return d.color ? d.color+'aa' : '#333';
          }}
          style={{
            background:'rgba(10,10,14,0.92)',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12,
          }}
          maskColor="rgba(7,7,9,0.7)"
        />
      </ReactFlow>

      {/* Fixed header */}
      <div style={{
        position:'absolute',top:0,left:0,right:0,
        padding:'12px 18px 8px',
        background:'linear-gradient(180deg,rgba(7,7,9,0.96) 0%,rgba(7,7,9,0) 100%)',
        zIndex:10,pointerEvents:'none',
        display:'flex',alignItems:'flex-end',gap:12,
      }}>
        <div>
          <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:8,letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)'}}>
            MA · sistema · live map
          </div>
          <div style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:16,fontWeight:700,color:'rgba(255,255,255,0.72)',marginTop:2,letterSpacing:'-0.02em'}}>
            adaptive system map
          </div>
        </div>
        <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:9,color:'rgba(255,255,255,0.2)',paddingBottom:3}}>
          pan · scroll · pinch
        </div>
      </div>
    </div>
  );
}
