'use client';
// ═══════════════════════════════════════════════════════════
// SystemMapScreen · Live Adaptive System Monitor v2
// Layout horizontal izquierda→derecha (n8n-style).
// Swimlanes: Misión / Hábitos / Looksmax / Wellness / Coach
// ═══════════════════════════════════════════════════════════

import '@xyflow/react/dist/style.css';
import { useMemo, useState, useRef, useEffect, memo, createContext, useContext } from 'react';
import gsap from 'gsap';
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  Handle, Position, MarkerType, type NodeProps, type Edge, type Node,
} from '@xyflow/react';
import {
  IconPlayerPlay, IconCheckbox, IconGitBranch,
  IconPackage, IconHeartbeat, IconBrain,
  IconDatabase, IconLayoutDashboard, IconBolt,
  IconMoon, IconSparkles, IconMap2,
  IconFolder, IconFolderOpen,
  IconEye, IconEyeOff, IconChevronDown, IconLayoutSidebar,
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

// ─── Sidebar tree ───────────────────────────────────────────────
const SIDEBAR_TREE = [
  {id:'s_mission',  label:'Misión',        color:C.mission,  items:[
    {nodeId:'welcome',         label:'Welcome'},
    {nodeId:'mission',         label:'Misión'},
    {nodeId:'summary',         label:'Summary'},
    {nodeId:'xp_level',        label:'XP · Stats'},
  ]},
  {id:'s_habits',   label:'Hábitos',        color:C.habits,   items:[
    {nodeId:'h_protocol',      label:'Protocolos'},
    {nodeId:'h_night',         label:'Noche'},
    {nodeId:'h_nucleus',       label:'Nucleus · día'},
    {nodeId:'h_wellness',      label:'Wellness hábitos'},
  ]},
  {id:'s_looksmax', label:'Looksmax',       color:C.looksmax, items:[
    {nodeId:'h_free',          label:'Libre'},
    {nodeId:'gate_inv',        label:'Gate tools'},
    {nodeId:'h_gated',         label:'Gated'},
  ]},
  {id:'s_wellness', label:'Wellness',       color:C.wellness, items:[
    {nodeId:'wellness_hub',    label:'Hub'},
    {nodeId:'w_bruxism',       label:'Bruxismo'},
    {nodeId:'w_meditation',    label:'Meditación'},
    {nodeId:'w_lymphatic',     label:'Drenaje facial'},
  ]},
  {id:'s_storage',  label:'Almacenamiento', color:C.store,    items:[
    {nodeId:'store_sessions',  label:'Sesiones DB'},
    {nodeId:'store_profile',   label:'Perfil DB'},
    {nodeId:'store_habits',    label:'Hábitos DB'},
    {nodeId:'store_inventory', label:'Inventario DB'},
  ]},
  {id:'s_services', label:'Servicios',      color:C.coach,    items:[
    {nodeId:'coach',           label:'Coach System'},
    {nodeId:'nucleus_screen',  label:'Nucleus'},
  ]},
];

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

// ─── CardData (unified node data shape) ──────────────────
interface Stat { label:string; val:string; accent?:string }
type NodeStatus = 'ok'|'warn'|'idle';
interface CardData {
  id:string; label:string; kicker:string; color:string; ikey:IKey;
  stats?:Stat[]; sparkline?:number[]; desc?:string;
  status?:NodeStatus; tier?:1|2|3; cat?:string;
  onSelect:(d:CardData)=>void;
}
interface ConnLink { id:string; label:string; color:string; kicker:string }
interface ConnectionInfo { sources:ConnLink[]; targets:ConnLink[] }
interface HighlightState { selectedId:string|null; neighborIds:Set<string>; sourceIds:Set<string>; targetIds:Set<string> }
const HighlightCtx = createContext<HighlightState>({selectedId:null,neighborIds:new Set(),sourceIds:new Set(),targetIds:new Set()});

// Status color palette
const ST = { ok:'#3ee1a0', warn:'#f4b852', idle:'rgba(255,255,255,0.22)' } as const;

// ─── Handle styles — small bright dots at connection points ──
const hT={style:{width:6,height:6,background:'rgba(8,10,18,0.75)',border:'1.5px solid rgba(180,190,210,0.4)',borderRadius:'50%'}};
const hS={style:{width:6,height:6,background:'rgba(8,10,18,0.75)',border:'1.5px solid rgba(180,190,210,0.4)',borderRadius:'50%'}};

// ─── Node cards — 3-tier visual hierarchy ────────────────
const NodeCard = memo(function NodeCard({ data: d }:NodeProps) {
  const { id:myId, label, kicker, color, ikey, onSelect, status, stats, tier=1 } = d as unknown as CardData;
  const Icon = IMAP[ikey as IKey];
  const { selectedId, neighborIds, sourceIds, targetIds } = useContext(HighlightCtx);

  const isOk = status==='ok', isWarn = status==='warn', isIdle = status==='idle';
  const keyStat = stats?.[0];
  const isActive   = selectedId !== null;
  const isSelected = isActive && myId === selectedId;
  const isNeighbor = isActive && !isSelected && neighborIds.has(myId);
  const isDimmed   = isActive && !isSelected && !isNeighbor;
  const isSource   = isNeighbor && sourceIds.has(myId);
  const isTarget   = isNeighbor && targetIds.has(myId);
  const tr = 'opacity 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease';
  const opBase = isDimmed ? 0.13 : isIdle ? 0.62 : 1;

  const Handles = <><Handle id="l" type="target" position={Position.Left} {...hT}/><Handle id="r" type="source" position={Position.Right} {...hS}/><Handle id="t" type="target" position={Position.Top} {...hT}/><Handle id="b" type="source" position={Position.Bottom} {...hS}/></>;
  const SDot = (sz:number,t:number,r:number) => <span style={{position:'absolute',top:t,right:r,width:sz,height:sz,borderRadius:'50%',background:isOk?ST.ok:isWarn?ST.warn:'rgba(255,255,255,0.18)',boxShadow:(isOk||isWarn)?`0 0 ${sz+2}px ${isOk?ST.ok:ST.warn}`:'none'}}/>;
  const Badge = (isSource||isTarget) ? <div style={{position:'absolute',bottom:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:'rgba(8,10,18,0.95)',border:`1px solid ${color}50`,borderRadius:5,padding:'2px 9px',whiteSpace:'nowrap',fontFamily:'var(--font-mono,monospace)',fontSize:8,fontWeight:700,color,letterSpacing:'0.1em',textTransform:'uppercase',boxShadow:`0 2px 14px rgba(0,0,0,0.85), 0 0 8px ${color}22`,pointerEvents:'none',zIndex:10}}>{isSource?'← origen':'→ siguiente'}</div> : null;

  // ── Tier 3: Chip (66×66 square — leaf nodes) ──────────
  if (tier===3) {
    const sh = isSelected?`0 6px 24px rgba(0,0,0,0.85), 0 0 0 1.5px ${color}70, 0 0 20px ${color}28`:isNeighbor?`0 4px 14px rgba(0,0,0,0.65), 0 0 12px ${color}20`:isDimmed?'none':isOk?`0 2px 10px rgba(0,0,0,0.5), 0 0 8px ${color}14`:`0 2px 10px rgba(0,0,0,0.4)`;
    return (
      <div style={{position:'relative',display:'inline-block'}} onClick={e=>e.stopPropagation()}>
        {Badge}
        <div style={{position:'relative',width:66,height:66,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,background:isSelected?'rgba(14,16,28,0.98)':`${color}10`,borderRadius:13,border:`1px solid ${isSelected?color+'70':isNeighbor?color+'50':color+'28'}`,boxShadow:sh,opacity:opBase,transform:isSelected?'scale(1.1) translateY(-3px)':isNeighbor?'scale(1.04)':'scale(1)',transition:tr,cursor:'pointer',userSelect:'none'}} onClick={e=>{e.stopPropagation();onSelect(d as unknown as CardData);}}>
          {Handles}{SDot(5,6,6)}
          <Icon size={20} color={color} strokeWidth={1.7} style={{opacity:isIdle?0.45:0.85}}/>
          <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:`rgba(255,255,255,${isIdle?0.2:0.45})`,maxWidth:58,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'center'}}>{label}</div>
        </div>
      </div>
    );
  }

  // ── Tier 2: Compact left-tab (148px — stores, inventory) ─
  if (tier===2) {
    const sh = isSelected?`0 8px 28px rgba(0,0,0,0.85), 0 0 0 1px ${color}55, 0 0 18px ${color}20`:isNeighbor?`0 5px 16px rgba(0,0,0,0.6), 0 0 12px ${color}18`:isDimmed?'none':`0 3px 12px rgba(0,0,0,0.45)`;
    return (
      <div style={{position:'relative',display:'inline-block'}} onClick={e=>e.stopPropagation()}>
        {Badge}
        <div style={{position:'relative',width:148,display:'flex',flexDirection:'row',alignItems:'center',gap:9,padding:'8px 12px 8px 10px',background:'rgba(10,12,22,0.88)',borderRadius:'0 9px 9px 0',borderLeft:`3px solid ${isSelected?color+'aa':isNeighbor?color+'70':color+(isIdle?'30':'55')}`,borderTop:'1px solid rgba(255,255,255,0.06)',borderRight:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.04)',boxShadow:sh,opacity:opBase,transform:isSelected?'scale(1.05) translateX(3px)':isNeighbor?'scale(1.02) translateX(1px)':'scale(1)',transition:tr,cursor:'pointer',userSelect:'none'}} onClick={e=>{e.stopPropagation();onSelect(d as unknown as CardData);}}>
          {Handles}{SDot(5,6,8)}
          <div style={{width:28,height:28,borderRadius:7,flexShrink:0,background:`${color}18`,border:`1px solid ${color}28`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Icon size={14} color={color} strokeWidth={1.7} style={{opacity:isIdle?0.45:0.85}}/>
          </div>
          <div style={{flex:1,minWidth:0,paddingRight:8}}>
            <div style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:11,fontWeight:600,lineHeight:1.2,color:`rgba(255,255,255,${isIdle?0.35:0.75})`,letterSpacing:'-0.005em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
            {keyStat&&<div style={{fontFamily:'var(--font-mono,monospace)',fontSize:8.5,fontWeight:600,marginTop:3,color:keyStat.accent??color,opacity:0.85}}>{keyStat.val}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ── Tier 1: Full card (210px — default) ─────────────────
  const accentBorder = isSelected?`${color}80`:isOk?`${color}55`:isWarn?`${color}38`:`${color}1e`;
  const iconBg = isIdle?`${color}18`:`${color}28`, iconBdr = isOk?`${color}58`:`${color}30`;
  const sh = isSelected?`0 10px 36px rgba(0,0,0,0.85), 0 0 0 1.5px ${color}70, 0 0 28px ${color}28`:isNeighbor?`0 6px 20px rgba(0,0,0,0.65), 0 0 16px ${color}22`:isDimmed?'none':isOk?`0 4px 14px rgba(0,0,0,0.55), 0 0 12px ${color}14`:`0 4px 14px rgba(0,0,0,0.45)`;
  return (
    <div style={{position:'relative',display:'inline-block'}} onClick={e=>e.stopPropagation()}>
      {Badge}
    <div style={{
      position:'relative', width:210,
      display:'flex', flexDirection:'row', alignItems:'center', gap:12,
      padding:'11px 14px 11px 12px',
      background: isSelected?'rgba(14,16,28,0.97)':'rgba(10,12,22,0.93)',
      borderRadius:13, border:`1px solid ${accentBorder}`,
      borderTop:`1px solid rgba(255,255,255,${isIdle?0.05:isSelected?0.18:0.10})`,
      boxShadow:sh, opacity:opBase,
      transform:isSelected?'scale(1.07) translateY(-4px)':isNeighbor?'scale(1.025) translateY(-1px)':'scale(1)',
      transition:tr, cursor:'pointer', userSelect:'none',
    }} onClick={e=>{e.stopPropagation();onSelect(d as unknown as CardData);}}>
      {Handles}{SDot(6,8,9)}
      <div style={{width:40,height:40,borderRadius:10,flexShrink:0,background:iconBg,border:`1px solid ${iconBdr}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Icon size={19} color={color} strokeWidth={1.7} style={{opacity:isIdle?0.45:0.9}}/>
      </div>
      <div style={{flex:1,minWidth:0,paddingRight:10}}>
        <div style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:12.5,fontWeight:600,lineHeight:1.25,color:`rgba(255,255,255,${isIdle?0.42:0.88})`,letterSpacing:'-0.008em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
        {kicker&&<div style={{fontFamily:'var(--font-mono,monospace)',fontSize:9,letterSpacing:'0.03em',marginTop:3,color:`rgba(255,255,255,${isIdle?0.14:0.30})`,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{kicker}</div>}
        {keyStat&&<div style={{fontFamily:'var(--font-mono,monospace)',fontSize:9.5,fontWeight:600,marginTop:4,color:keyStat.accent??`rgba(255,255,255,${isIdle?0.3:0.58})`}}>{keyStat.val}</div>}
      </div>
    </div>
    </div>
  );
});


// ─── Tree section — GSAP-animated collapsible ────────────
type SidebarCat = typeof SIDEBAR_TREE[0];
function TreeSection({cat,isOpen,onToggle,nodes,selected,onSelect,isHidden,onHideToggle}:{
  cat:SidebarCat; isOpen:boolean; onToggle:()=>void;
  nodes:Node[]; selected:CardData|null; onSelect:(d:CardData)=>void;
  isHidden:boolean; onHideToggle:()=>void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const first   = useRef(true);
  useEffect(()=>{
    if(first.current){ first.current=false; return; }
    const el=bodyRef.current; if(!el) return;
    if(isOpen) gsap.fromTo(el,{height:0,opacity:0},{height:'auto',opacity:1,duration:0.26,ease:'power2.out'});
    else        gsap.to(el,  {height:0,opacity:0,duration:0.20,ease:'power2.in'});
  },[isOpen]);

  const okCount = cat.items.filter(i=>{
    const n=nodes.find(nd=>nd.id===i.nodeId);
    return (n?.data as unknown as CardData|undefined)?.status==='ok';
  }).length;

  return (
    <div style={{opacity:isHidden?0.45:1,transition:'opacity 0.2s'}}>
      {/* Category row */}
      <div style={{display:'flex',alignItems:'center',gap:0,padding:'5px 10px 5px 0',cursor:'pointer',userSelect:'none'}}>
        {/* Color accent stripe */}
        <div style={{width:3,alignSelf:'stretch',borderRadius:'0 2px 2px 0',background:cat.color,opacity:0.55,marginRight:8,flexShrink:0}}/>
        {/* Folder + label (click=toggle open) */}
        <div style={{flex:1,display:'flex',alignItems:'center',gap:7,minWidth:0,padding:'2px 0'}} onClick={onToggle}>
          {isOpen
            ? <IconFolderOpen size={13} color={cat.color} strokeWidth={1.8} style={{flexShrink:0}}/>
            : <IconFolder     size={13} color={cat.color} strokeWidth={1.8} style={{flexShrink:0}}/>
          }
          <span style={{flex:1,fontFamily:'var(--font-headline,sans-serif)',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.62)',letterSpacing:'-0.005em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cat.label}</span>
        </div>
        {/* ok badge */}
        {okCount>0&&(
          <span style={{minWidth:17,height:15,borderRadius:4,background:`${cat.color}18`,border:`1px solid ${cat.color}2e`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,fontFamily:'var(--font-mono,monospace)',color:cat.color,opacity:0.8,padding:'0 3px',flexShrink:0,marginRight:5}}>{okCount}</span>
        )}
        {/* Eye toggle */}
        <div onClick={e=>{e.stopPropagation();onHideToggle();}} title={isHidden?'Mostrar en mapa':'Ocultar en mapa'} style={{width:20,height:20,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:3,cursor:'pointer',background:'rgba(255,255,255,0.03)',color:`rgba(255,255,255,${isHidden?0.55:0.22})`}}>
          {isHidden ? <IconEyeOff size={11} strokeWidth={1.8}/> : <IconEye size={11} strokeWidth={1.8}/>}
        </div>
        {/* Chevron */}
        <div onClick={onToggle} style={{width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'rgba(255,255,255,0.2)',transform:isOpen?'rotate(0deg)':'rotate(-90deg)',transition:'transform 0.2s ease'}}>
          <IconChevronDown size={11} strokeWidth={2}/>
        </div>
      </div>

      {/* Items — GSAP controlled */}
      <div ref={bodyRef} style={{overflow:'hidden'}}>
        {cat.items.map(item=>{
          const node=nodes.find(n=>n.id===item.nodeId);
          const data=node?.data as unknown as CardData|undefined;
          const isSel=!!(selected&&selected.label===data?.label);
          const isOk=data?.status==='ok', isWarn=data?.status==='warn';
          return (
            <div key={item.nodeId} onClick={()=>data&&onSelect(data)} style={{
              display:'flex',alignItems:'center',padding:'3px 10px 3px 11px',
              cursor:'pointer',userSelect:'none',
              background:isSel?`${cat.color}10`:'transparent',
              borderLeft:`2px solid ${isSel?`${cat.color}60`:'transparent'}`,
            }}>
              {/* L-branch tree line */}
              <div style={{width:14,height:14,flexShrink:0,borderLeft:'1px solid rgba(255,255,255,0.07)',borderBottom:'1px solid rgba(255,255,255,0.07)',borderBottomLeftRadius:3,marginRight:7,marginTop:-4}}/>
              <span style={{width:5,height:5,borderRadius:'50%',flexShrink:0,background:isOk?ST.ok:isWarn?ST.warn:'rgba(255,255,255,0.12)',marginRight:7,boxShadow:(isOk||isWarn)?`0 0 5px ${isOk?ST.ok:ST.warn}88`:'none'}}/>
              <span style={{flex:1,fontFamily:'var(--font-ui,sans-serif)',fontSize:10.5,color:isSel?'rgba(255,255,255,0.82)':'rgba(255,255,255,0.36)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',paddingRight:8}}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Left Sidebar — improved header + GSAP tree ──────────
function LeftSidebar({nodes,selected,onSelect,hiddenCats,onHideToggle}:{
  nodes:Node[]; selected:CardData|null; onSelect:(d:CardData)=>void;
  hiddenCats:Set<string>; onHideToggle:(id:string)=>void;
}) {
  const [open,setOpen]       = useState(()=>new Set(SIDEBAR_TREE.map(c=>c.id)));
  const [sideOpen,setSideOpen]= useState(false);
  const sideRef               = useRef<HTMLDivElement>(null);
  const toggle=(id:string)=>setOpen(prev=>{const s=new Set(prev);s.has(id)?s.delete(id):s.add(id);return s;});

  const totalOk = SIDEBAR_TREE.flatMap(c=>c.items).filter(i=>{
    const n=nodes.find(nd=>nd.id===i.nodeId);
    return (n?.data as unknown as CardData|undefined)?.status==='ok';
  }).length;
  const total = SIDEBAR_TREE.flatMap(c=>c.items).length;

  const toggleSide=()=>{
    const el=sideRef.current; if(!el) return;
    if(sideOpen){
      gsap.to(el,{width:0,minWidth:0,opacity:0,duration:0.28,ease:'power2.inOut',onComplete:()=>setSideOpen(false)});
    } else {
      setSideOpen(true);
      gsap.fromTo(el,{width:0,minWidth:0,opacity:0},{width:240,minWidth:240,opacity:1,duration:0.28,ease:'power2.out'});
    }
  };

  return (
    <>
      {/* Collapsed tab — shown when sidebar hidden */}
      {!sideOpen&&(
        <div onClick={toggleSide} style={{width:28,height:'100%',background:'rgba(9,10,18,0.98)',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <IconLayoutSidebar size={14} color="rgba(255,255,255,0.28)" strokeWidth={1.8}/>
        </div>
      )}
      <div ref={sideRef} style={{width:sideOpen?240:0,minWidth:sideOpen?240:0,maxWidth:272,height:'100%',background:'rgba(9,10,18,0.98)',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
        {/* ── Header ── */}
        <div style={{padding:'13px 12px 11px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'linear-gradient(180deg,rgba(255,255,255,0.022) 0%,transparent 100%)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            {/* Logo badge */}
            <div style={{width:32,height:32,borderRadius:9,flexShrink:0,background:'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))',border:'1px solid rgba(255,255,255,0.10)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.62)',fontFamily:'var(--font-headline,sans-serif)',letterSpacing:'-0.01em'}}>MA</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,0.68)',letterSpacing:'-0.01em',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Morning Awakening</div>
              <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7,color:'rgba(255,255,255,0.18)',letterSpacing:'0.16em',textTransform:'uppercase',marginTop:2}}>system map</div>
            </div>
            {/* Sidebar toggle */}
            <div onClick={toggleSide} title="Colapsar menú" style={{width:24,height:24,borderRadius:6,flexShrink:0,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.22)'}}>
              <IconLayoutSidebar size={12} strokeWidth={1.8}/>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,0.05)',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.round(totalOk/total*100)}%`,background:`linear-gradient(90deg,${ST.ok}80,${ST.ok}50)`,borderRadius:2,transition:'width 0.5s ease'}}/>
            </div>
            <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:'rgba(255,255,255,0.22)',flexShrink:0}}>{totalOk}/{total}</span>
          </div>
        </div>

        {/* ── Tree ── */}
        <div style={{flex:1,overflowY:'auto',padding:'6px 0 6px 0'}}>
          {SIDEBAR_TREE.map(cat=>(
            <TreeSection key={cat.id} cat={cat}
              isOpen={open.has(cat.id)} onToggle={()=>toggle(cat.id)}
              nodes={nodes} selected={selected} onSelect={onSelect}
              isHidden={hiddenCats.has(cat.id)} onHideToggle={()=>onHideToggle(cat.id)}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{padding:'9px 12px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:ST.ok,boxShadow:`0 0 6px ${ST.ok}55`}}/>
          <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:'rgba(255,255,255,0.22)',letterSpacing:'0.1em',textTransform:'uppercase'}}>sistema activo</span>
        </div>
      </div>
    </>
  );
}

// ─── Right Panel — node detail sidebar ───────────────────
function RightPanel({data,onClose}:{data:CardData|null;onClose:()=>void}) {
  if(!data) return (
    <div style={{width:'20%',minWidth:220,maxWidth:300,height:'100%',background:'rgba(9,10,18,0.98)',borderLeft:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,flexShrink:0}}>
      <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <IconMap2 size={16} color="rgba(255,255,255,0.16)" strokeWidth={1.5}/>
      </div>
      <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:9,color:'rgba(255,255,255,0.18)',letterSpacing:'0.12em',textTransform:'uppercase',textAlign:'center',lineHeight:1.6}}>selecciona<br/>un nodo</span>
    </div>
  );
  const Icon=IMAP[data.ikey as IKey];
  return (
    <div style={{width:'20%',minWidth:220,maxWidth:300,height:'100%',background:'rgba(9,10,18,0.98)',borderLeft:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
      {/* Header */}
      <div style={{padding:'15px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:`${data.color}07`,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:`${data.color}1e`,border:`1px solid ${data.color}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Icon size={17} color={data.color} strokeWidth={1.7}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.88)',lineHeight:1.25,wordBreak:'break-word'}}>{data.label}</div>
            <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:data.color,opacity:0.6,letterSpacing:'0.16em',textTransform:'uppercase',marginTop:3}}>{data.kicker}</div>
          </div>
          <button type="button" onClick={onClose} style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:13,lineHeight:1,flexShrink:0}}>×</button>
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',background:'rgba(255,255,255,0.04)',borderRadius:20,border:'1px solid rgba(255,255,255,0.07)'}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:data.status==='ok'?ST.ok:data.status==='warn'?ST.warn:'rgba(255,255,255,0.2)'}}/>
          <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:'rgba(255,255,255,0.3)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{data.status??'idle'}</span>
        </div>
      </div>
      {/* Body */}
      <div style={{flex:1,overflowY:'auto'}}>
        {(data.stats?.length??0)>0&&(
          <div style={{padding:'12px 15px 4px'}}>
            <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.18)',marginBottom:10}}>métricas</div>
            {data.stats!.map(({label,val,accent},i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7,paddingBottom:7,borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{fontFamily:'var(--font-ui,sans-serif)',fontSize:10.5,color:'rgba(255,255,255,0.3)'}}>{label}</span>
                <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:10.5,fontWeight:600,color:accent??data.color}}>{val}</span>
              </div>
            ))}
          </div>
        )}
        {data.sparkline&&(
          <div style={{padding:'4px 15px 12px'}}>
            <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:'rgba(255,255,255,0.16)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:7}}>últimos 7 días</div>
            <Sp series={data.sparkline} color={data.color}/>
          </div>
        )}
        {data.desc&&(
          <div style={{padding:'0 15px 15px',fontFamily:'var(--font-ui,sans-serif)',fontSize:10.5,color:'rgba(255,255,255,0.3)',lineHeight:1.65}}>{data.desc}</div>
        )}
      </div>
    </div>
  );
}

// ─── Floating detail overlay — GSAP slide in/out ────────
type SnapData = {data:CardData; conn:ConnectionInfo|null}
function FloatingDetail({data,conn,onClose}:{data:CardData|null;conn:ConnectionInfo|null;onClose:()=>void}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<SnapData|null>(null);

  useEffect(()=>{
    if(data){ setSnap({data,conn}); }
    else if(snap){
      const el=wrapRef.current;
      if(el) gsap.to(el,{y:10,opacity:0,duration:0.18,ease:'power2.in',overwrite:true,onComplete:()=>setSnap(null)});
      else   setSnap(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[data]);

  useEffect(()=>{
    if(snap&&wrapRef.current)
      gsap.fromTo(wrapRef.current,{y:16,opacity:0},{y:0,opacity:1,duration:0.24,ease:'power2.out',overwrite:true});
  },[snap]);

  if(!snap) return null;
  return <div ref={wrapRef}><DetailPanel data={snap.data} conn={snap.conn} onClose={onClose}/></div>;
}

function LaneLabel({ data:d }:NodeProps) {
  const {label,color} = d as unknown as {label:string;color:string};
  return <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:8,letterSpacing:'0.26em',textTransform:'uppercase',color,opacity:0.45,whiteSpace:'nowrap'}}>{label}</div>;
}

const nodeTypes = { card: NodeCard, lane: LaneLabel };

// ─── Edge helpers ─────────────────────────────────────────
const ARR = (c:string)=>({ type:MarkerType.ArrowClosed, color:c, width:10, height:10 });
const solid  = (c:string):Edge['style'] =>({stroke:c,strokeWidth:1.4,opacity:0.85});
const dashed = (c:string):Edge['style'] =>({stroke:c,strokeWidth:1.1,strokeDasharray:'5 3',opacity:0.6});
const faint  = (c:string):Edge['style'] =>({stroke:c,strokeWidth:0.9,strokeDasharray:'3 5',opacity:0.35});

// ─── Sparkline (only in DetailPanel) ──────────────────────
function Sp({ series,color }:{series:number[];color:string}) {
  const W=100,H=22,max=Math.max(...series,0.01),n=series.length,bw=Math.floor(W/n)-2;
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>{series.map((v,i)=>{ const h=Math.max(2,Math.round(v/max*H)); return <rect key={i} x={i*(bw+2)} y={H-h} width={bw} height={h} fill={color} opacity={0.75} rx={2}/>; })}</svg>;
}

// ─── Detail Panel (glassmorphic popup, bottom-right) ──────
function DetailPanel({ data:d, conn, onClose }:{ data:CardData; conn:ConnectionInfo|null; onClose:()=>void }) {
  const Icon = IMAP[d.ikey as IKey];
  const hasConn = conn && (conn.sources.length>0 || conn.targets.length>0);
  return (
    <div
      style={{position:'absolute',bottom:72,right:16,zIndex:30,width:295,borderRadius:22,background:'rgba(10,11,22,0.97)',border:`1px solid ${d.color}28`,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',boxShadow:`0 20px 56px rgba(0,0,0,0.72), inset 0 0 0 1px rgba(255,255,255,0.04)`,overflow:'hidden'}}
      onClick={e=>e.stopPropagation()}
    >
      {/* Header */}
      <div style={{padding:'14px 15px 12px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:11,background:`${d.color}0b`}}>
        <div style={{width:40,height:40,borderRadius:'50%',flexShrink:0,background:`${d.color}1c`,border:`1.5px solid ${d.color}40`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon size={16} color={d.color}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:13.5,fontWeight:700,color:'rgba(255,255,255,0.9)',lineHeight:1.2}}>{d.label}</div>
          {d.cat&&<div style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:5,background:`${d.color}14`,border:`1px solid ${d.color}30`,borderRadius:6,padding:'3px 8px'}}><span style={{width:6,height:6,borderRadius:'50%',background:d.color,flexShrink:0,boxShadow:`0 0 6px ${d.color}80`}}/><span style={{fontFamily:'var(--font-mono,monospace)',fontSize:9,color:d.color,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase'}}>{d.cat}</span></div>}
          <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:d.color,opacity:0.65,letterSpacing:'0.2em',textTransform:'uppercase',marginTop:4}}>{d.kicker}</div>
        </div>
        <button type="button" onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.45)',fontSize:15,flexShrink:0,lineHeight:1}}>
          ×
        </button>
      </div>
      {/* Stats */}
      {(d.stats?.length??0)>0&&(
        <div style={{padding:'9px 15px 5px'}}>
          {d.stats!.map(({label,val,accent},i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5.5}}>
              <span style={{fontFamily:'var(--font-ui,sans-serif)',fontSize:10.5,color:'rgba(255,255,255,0.3)'}}>{label}</span>
              <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:10.5,color:accent??d.color,fontWeight:500}}>{val}</span>
            </div>
          ))}
        </div>
      )}
      {d.sparkline&&(
        <div style={{padding:'2px 15px 12px'}}>
          <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:'rgba(255,255,255,0.2)',letterSpacing:'0.22em',textTransform:'uppercase',marginBottom:5}}>últimos 7 días</div>
          <Sp series={d.sparkline} color={d.color}/>
        </div>
      )}
      {d.desc&&(
        <div style={{padding:'0 15px 10px',fontFamily:'var(--font-ui,sans-serif)',fontSize:10.5,color:'rgba(255,255,255,0.36)',lineHeight:1.6,borderTop:(d.stats?.length??0)>0||d.sparkline?'1px solid rgba(255,255,255,0.05)':'none',paddingTop:(d.stats?.length??0)>0||d.sparkline?10:0}}>
          {d.desc}
        </div>
      )}
      {/* ── Connection flow ── */}
      {hasConn&&(
        <div style={{padding:'10px 15px 14px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontFamily:'var(--font-mono,monospace)',fontSize:7.5,color:'rgba(255,255,255,0.22)',letterSpacing:'0.22em',textTransform:'uppercase',marginBottom:8}}>flujo</div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {conn!.sources.map(s=>(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:7}}>
                <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:9,color:'rgba(255,255,255,0.25)',flexShrink:0}}>←</span>
                <span style={{height:1,flex:1,background:`${s.color}30`}}/>
                <span style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:10,fontWeight:600,color:s.color,opacity:0.85,whiteSpace:'nowrap',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{s.label}</span>
              </div>
            ))}
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:d.color,flexShrink:0,boxShadow:`0 0 8px ${d.color}80`}}/>
              <span style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)'}}>{d.label}</span>
            </div>
            {conn!.targets.map(t=>(
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:7}}>
                <span style={{fontFamily:'var(--font-headline,sans-serif)',fontSize:10,fontWeight:600,color:t.color,opacity:0.85,whiteSpace:'nowrap',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{t.label}</span>
                <span style={{height:1,flex:1,background:`${t.color}30`}}/>
                <span style={{fontFamily:'var(--font-mono,monospace)',fontSize:9,color:'rgba(255,255,255,0.25)',flexShrink:0}}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Radial layout (Apple Watch style) — mission at center ──
// CX=900, CY=700. Rings r=300 | r=580 | r=790
const POS:{[k:string]:{x:number;y:number}}={
  // Ring 0 — center
  mission:        {x:795,y:669},
  // Ring 1 r=300 (hex, 60° steps from -90°)
  welcome:        {x:795,y:369},   // -90°
  h_protocol:     {x:1055,y:519},  // -30°
  h_night:        {x:1055,y:819},  //  30°
  h_nucleus:      {x:795,y:969},   //  90°
  h_wellness:     {x:535,y:819},   // 150°
  xp_level:       {x:535,y:519},   // 210°
  // Ring 2 r=580 (12 positions × 30°)
  store_habits:   {x:795,y:89},    // -90°
  coach:          {x:1085,y:167},  // -60°
  summary:        {x:1297,y:379},  // -30°
  gate_inv:       {x:1297,y:959},  //  30°
  h_free:         {x:1085,y:1171}, //  60°
  wellness_hub:   {x:795,y:1249},  //  90°
  h_gated:        {x:505,y:1171},  // 120°
  store_inventory:{x:293,y:959},   // 150°
  store_profile:  {x:215,y:669},   // 180°
  store_sessions: {x:293,y:379},   // 210°
  nucleus_screen: {x:505,y:167},   // 240°
  // Ring 3 r≈790 (leaf clusters)
  w_bruxism:      {x:932,y:1447},
  w_meditation:   {x:795,y:1459},
  w_lymphatic:    {x:658,y:1447},
  inv_top:        {x:190,y:1177},
  inv_bot:        {x:79,y:1003},
};

// ─── Main ────────────────────────────────────────────────
export default function SystemMapScreen() {
  const inventory = useInventory();
  const [selected,    setSelected]    = useState<CardData|null>(null);
  const [hiddenCats,  setHiddenCats]  = useState(()=>new Set<string>());
  const onHideToggle = (id:string)=>setHiddenCats(prev=>{
    const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s;
  });

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
      protocol:computeGroup(GRP.protocol), night:computeGroup(GRP.night),
      nucleus:computeGroup(GRP.nucleus),   looksFree:computeGroup(GRP.looksmax_free),
      wellness:computeGroup(GRP.wellness), looksGated:computeGroup(GRP.looksmax_gated),
    };
  },[inventory]);

  const nodes = useMemo(()=>{
    const{todaySess,weekAvg,profile,sess7,totalOwned,unlockedH,pillarData,sessionCount,protocol,night,nucleus,looksFree,wellness,looksGated}=live;
    const ok=C.habits, mk='rgba(255,255,255,0.25)';
    const st=(d:number,t:number):NodeStatus=>t>0&&d===t?'ok':d>0?'warn':'idle';
    const stB=(b:boolean):NodeStatus=>b?'ok':'idle';

    const nd=(id:string,ikey:IKey,color:string,label:string,kicker:string,extras:Partial<Omit<CardData,'id'|'label'|'kicker'|'color'|'ikey'|'onSelect'|'cat'>>={})=>({
      id, type:'card' as const, position:{x:0,y:0},
      data:{id,cat:SIDEBAR_TREE.find(c=>c.items.some(i=>i.nodeId===id))?.label??'',label,kicker,color,ikey,onSelect:setSelected,...extras} satisfies CardData,
    });

    return [
      // ─── Main spine (horizontal) ──────────────────────────
      // Mission flow
      {...nd('welcome','screen',C.mission,'Welcome','pantalla · inicio',{status:'ok'}), position:POS['welcome']},
      {...nd('mission','mission',C.mission,'Misión','genesis · protocolo',{status:todaySess?'ok':'idle',
        stats:[{label:'score hoy',val:todaySess?.score!=null?`${todaySess.score}`:'— sin sesión'},{label:'prom. 7d',val:weekAvg!=null?`${weekAvg}`:'—'},{label:'racha',val:`${profile.stats?.disciplina??0}d`,accent:(profile.stats?.disciplina??0)>0?ok:mk}],
        sparkline:sess7}), position:POS['mission']},
      {...nd('summary','screen',C.mission,'Summary','resultado · sesión',{status:todaySess?'ok':'idle'}), position:POS['summary']},
      {...nd('xp_level','mission',C.mission,'XP · Stats','progression · operator',{status:profile.xp>0?'ok':'idle',
        stats:[{label:'nivel',val:`${profile.level}`},{label:'xp',val:`${profile.xp}`},{label:'fases',val:`${profile.phasesCompleted}`}],
        sparkline:sess7}), position:POS['xp_level']},

      // Data stores — hanging BELOW main spine (like n8n tools)
      {...nd('store_sessions','store',C.store,'Sesiones','localStorage',{tier:2,status:'ok',
        stats:[{label:'clave',val:'ma-sessions'},{label:'total',val:`${sessionCount}`}]}), position:POS['store_sessions']},
      {...nd('store_profile','store',C.store,'Perfil','localStorage',{tier:2,status:'ok',
        stats:[{label:'clave',val:'ma-profile'},{label:'nivel',val:`${profile.level}`},{label:'xp',val:`${profile.xp}`}]}), position:POS['store_profile']},

      // ─── Habits chain — subtle wave ───────────────────────
      {...nd('store_habits','store',C.store,'Hábitos DB','localStorage',{tier:2,status:'ok',
        stats:[{label:'clave',val:'ma-habits'},{label:'tipos',val:`${GRP.protocol.length+GRP.night.length+GRP.nucleus.length+GRP.looksmax_free.length+GRP.looksmax_gated.length+GRP.wellness.length}`}]}), position:POS['store_habits']},
      {...nd('h_protocol','habits',C.habits,'Protocolos','hábitos · core',{status:st(protocol.doneToday,protocol.total),
        stats:[{label:'hoy',val:`${protocol.doneToday}/${protocol.total}`,accent:protocol.doneToday===protocol.total?ok:C.habits},{label:'racha p.',val:`${protocol.avgStreak}d`},{label:'adh. 7d',val:`${protocol.avgAdh7}%`}],sparkline:protocol.series7}), position:POS['h_protocol']},
      {...nd('h_night','night',C.night,'Noche','hábitos · noche',{status:st(night.doneToday,night.total),
        stats:[{label:'hoy',val:`${night.doneToday}/${night.total}`,accent:night.doneToday===night.total?ok:C.night},{label:'racha p.',val:`${night.avgStreak}d`},{label:'adh. 7d',val:`${night.avgAdh7}%`}],sparkline:night.series7}), position:POS['h_night']},
      {...nd('h_nucleus','nucleus',C.nucleus,'Nucleus · día','hábitos · jornada',{status:st(nucleus.doneToday,nucleus.total),
        stats:[{label:'hoy',val:`${nucleus.doneToday}/${nucleus.total}`,accent:nucleus.doneToday===nucleus.total?ok:C.nucleus},{label:'racha p.',val:`${nucleus.avgStreak}d`},{label:'adh. 7d',val:`${nucleus.avgAdh7}%`}],sparkline:nucleus.series7}), position:POS['h_nucleus']},
      {...nd('h_wellness','wellness',C.wellness,'Wellness hábitos','hábitos · sesiones',{status:st(wellness.doneToday,wellness.total),
        stats:[{label:'hoy',val:`${wellness.doneToday}/${wellness.total}`,accent:wellness.doneToday===wellness.total?ok:C.wellness},{label:'adh. 7d',val:`${wellness.avgAdh7}%`}],sparkline:wellness.series7}), position:POS['h_wellness']},

      // Lane 2: Looksmax
      {...nd('h_free','looksmax',C.looksmax,'Looksmax libre','hábitos · free',{status:st(looksFree.doneToday,looksFree.total),
        stats:[{label:'hoy',val:`${looksFree.doneToday}/${looksFree.total}`,accent:looksFree.doneToday===looksFree.total?ok:C.looksmax},{label:'adh. 7d',val:`${looksFree.avgAdh7}%`}],sparkline:looksFree.series7}), position:POS['h_free']},
      {...nd('gate_inv','gate',C.inventory,'Gate tools','condición · inventario',{status:totalOwned>0?'ok':'idle',
        stats:[{label:'tools activas',val:`${totalOwned}/${TOOLS.length}`,accent:totalOwned>0?ok:mk},{label:'hábitos hab.',val:`${unlockedH.size}`}]}), position:POS['gate_inv']},
      {...nd('h_gated','looksmax',C.looksmax,'Looksmax gated','hábitos · inventario',{status:totalOwned===0?'idle':st(looksGated.doneToday,looksGated.total),
        stats:[{label:'hoy',val:`${looksGated.doneToday}/${looksGated.total}`,accent:looksGated.doneToday===looksGated.total?ok:C.looksmax},{label:'adh. 7d',val:`${looksGated.avgAdh7}%`}],sparkline:looksGated.series7}), position:POS['h_gated']},
      {...nd('store_inventory','store',C.store,'Inventario','localStorage',{tier:2,status:'ok',
        stats:[{label:'clave',val:'ma-inventory'},{label:'adquiridas',val:`${totalOwned}/${TOOLS.length}`}]}), position:POS['store_inventory']},
      // Inventory groups — STACKED vertically in same column
      {...nd('inv_top','inventory',C.inventory,'Oral · Estructura · Piel','inventario · grupo A',{tier:2,status:pillarData.slice(0,3).reduce((s,p)=>s+p.owned,0)>0?'ok':'idle',stats:[{label:'adquiridas',val:`${pillarData.slice(0,3).reduce((s,p)=>s+p.owned,0)}/${pillarData.slice(0,3).reduce((s,p)=>s+p.total,0)}`,accent:pillarData.slice(0,3).reduce((s,p)=>s+p.owned,0)>0?ok:mk}],desc:'Higiene oral · Estructura facial · Rutina de piel'}), position:POS['inv_top']},
      {...nd('inv_bot','inventory',C.inventory,'Ojos · Cabello · Metabolismo','inventario · grupo B',{tier:2,status:pillarData.slice(3,6).reduce((s,p)=>s+p.owned,0)>0?'ok':'idle',stats:[{label:'adquiridas',val:`${pillarData.slice(3,6).reduce((s,p)=>s+p.owned,0)}/${pillarData.slice(3,6).reduce((s,p)=>s+p.total,0)}`,accent:pillarData.slice(3,6).reduce((s,p)=>s+p.owned,0)>0?ok:mk}],desc:'Salud ocular · Cuidado capilar · Gestión metabólica'}), position:POS['inv_bot']},

      // ─── Wellness fan — hub + 3 sessions at staggered heights ──
      {...nd('wellness_hub','wellness',C.wellness,'Wellness Hub','herramientas · hub',{status:'ok'}), position:POS['wellness_hub']},
      {...nd('w_bruxism','wellness',C.wellness,'Bruxismo','wellness · ejercicio',{tier:3,status:stB(isHabitDone('bruxism_exercise')),stats:[{label:'hoy',val:isHabitDone('bruxism_exercise')?'✓ completado':'· pendiente',accent:isHabitDone('bruxism_exercise')?ok:mk},{label:'racha',val:`${currentStreak('bruxism_exercise')}d`},{label:'adh. 7d',val:`${Math.round(adherence('bruxism_exercise',7)*100)}%`}]}), position:POS['w_bruxism']},
      {...nd('w_meditation','wellness',C.wellness,'Meditación','wellness · mindfulness',{tier:3,status:stB(isHabitDone('deep_meditation')),stats:[{label:'hoy',val:isHabitDone('deep_meditation')?'✓ completado':'· pendiente',accent:isHabitDone('deep_meditation')?ok:mk},{label:'racha',val:`${currentStreak('deep_meditation')}d`},{label:'adh. 7d',val:`${Math.round(adherence('deep_meditation',7)*100)}%`}]}), position:POS['w_meditation']},
      {...nd('w_lymphatic','wellness',C.wellness,'Drenaje facial','wellness · facial',{tier:3,status:stB(isHabitDone('lymphatic_facial')),stats:[{label:'hoy',val:isHabitDone('lymphatic_facial')?'✓ completado':'· pendiente',accent:isHabitDone('lymphatic_facial')?ok:mk},{label:'racha',val:`${currentStreak('lymphatic_facial')}d`},{label:'adh. 7d',val:`${Math.round(adherence('lymphatic_facial',7)*100)}%`}]}), position:POS['w_lymphatic']},

      // ─── Coach + Nucleus (supporting services) ────────────
      {...nd('coach','coach',C.coach,'Coach System','inteligencia · adaptativa',{status:'ok',desc:'Reminders horarios · Tips bank 50+ · Conditions · Flare controls · Pill schedule · Quick log'}), position:POS['coach']},
      {...nd('nucleus_screen','nucleus',C.nucleus,'Nucleus','day mode · jornada',{status:'ok'}), position:POS['nucleus_screen']},
    ];
  },[live]);

  const edges = useMemo(():Edge[]=>{
    const {todaySess,protocol,night,nucleus,wellness,looksFree,looksGated}=live;
    // Which paths are "live" (pulse animation)
    const anim = {
      mission: !!todaySess,
      habitsProtocol: protocol.doneToday>0,
      habitsNight: night.doneToday>0,
      habitsNucleus: nucleus.doneToday>0,
      habitsWellness: wellness.doneToday>0,
      looksFree: looksFree.doneToday>0,
      looksGated: looksGated.doneToday>0,
      wBrux: isHabitDone('bruxism_exercise'),
      wMed: isHabitDone('deep_meditation'),
      wLymph: isHabitDone('lymphatic_facial'),
    };
    return [
      {id:'e-w-m',  source:'welcome',       target:'mission',        type:'default', animated:anim.mission, style:solid(C.mission),   markerEnd:ARR(C.mission)},
      {id:'e-m-s',  source:'mission',       target:'summary',        type:'default', animated:anim.mission, style:solid(C.mission),   markerEnd:ARR(C.mission)},
      {id:'e-s-xp', source:'summary',       target:'xp_level',       type:'default', animated:anim.mission, style:solid(C.mission),   markerEnd:ARR(C.mission)},
      // Data stores drop DOWN from their source nodes (like n8n tools)
      {id:'e-s-ss', source:'summary',  target:'store_sessions', sourceHandle:'b', targetHandle:'t', type:'default', style:dashed(C.store), markerEnd:ARR(C.store)},
      {id:'e-xp-sp',source:'xp_level', target:'store_profile',  sourceHandle:'b', targetHandle:'t', type:'default', style:dashed(C.store), markerEnd:ARR(C.store)},
      // Coach — auxiliary service hanging below mission
      {id:'e-m-co', source:'xp_level', target:'coach',           sourceHandle:'r', targetHandle:'l', type:'default', style:dashed(C.coach), markerEnd:ARR(C.coach)},
      // Nucleus screen — connected to end of habits chain
      {id:'e-hw-ns',source:'h_wellness',target:'nucleus_screen',type:'default', style:faint(C.nucleus), markerEnd:ARR(C.nucleus)},
      // ─── Cascade trunk: mission spawns the day's subsystems ──
      {id:'e-m-sh', source:'mission',     target:'store_habits',  sourceHandle:'b', targetHandle:'t', type:'default', animated:anim.habitsProtocol||anim.habitsNight||anim.habitsNucleus||anim.habitsWellness, style:dashed(C.habits),   markerEnd:ARR(C.habits)},
      {id:'e-sh-hf',source:'store_habits',target:'h_free',        sourceHandle:'b', targetHandle:'t', type:'default', animated:anim.looksFree, style:dashed(C.looksmax), markerEnd:ARR(C.looksmax)},
      {id:'e-hf-wh',source:'h_free',      target:'wellness_hub',  sourceHandle:'b', targetHandle:'t', type:'default', animated:anim.wBrux||anim.wMed||anim.wLymph, style:dashed(C.wellness), markerEnd:ARR(C.wellness)},
      {id:'e-sh-hp',source:'store_habits',  target:'h_protocol',     type:'default', animated:anim.habitsProtocol, style:solid(C.habits),   markerEnd:ARR(C.habits)},
      {id:'e-hp-hn',source:'h_protocol',    target:'h_night',        type:'default', animated:anim.habitsNight,    style:solid(C.night),    markerEnd:ARR(C.night)},
      {id:'e-hn-nu',source:'h_night',       target:'h_nucleus',      type:'default', animated:anim.habitsNucleus,  style:solid(C.nucleus),  markerEnd:ARR(C.nucleus)},
      {id:'e-nu-hw',source:'h_nucleus',     target:'h_wellness',     type:'default', animated:anim.habitsWellness, style:solid(C.wellness), markerEnd:ARR(C.wellness)},
      {id:'e-hf-gi',source:'h_free',        target:'gate_inv',       type:'default', animated:anim.looksFree,      style:solid(C.inventory),markerEnd:ARR(C.inventory)},
      {id:'e-gi-hg',source:'gate_inv',      target:'h_gated',        type:'default', animated:anim.looksGated,     style:solid(C.looksmax), markerEnd:ARR(C.looksmax), label:'desbloquea', labelStyle:{fill:`${C.looksmax}dd`,fontSize:10.5,fontFamily:'var(--font-mono,monospace)',fontWeight:600,letterSpacing:'0.04em'}, labelBgStyle:{fill:'rgba(10,11,22,0.92)',stroke:`${C.looksmax}55`,strokeWidth:1}, labelBgPadding:[6,3], labelBgBorderRadius:4},
      {id:'e-hg-si',source:'h_gated',       target:'store_inventory',type:'default', style:dashed(C.store), markerEnd:ARR(C.store)},
      {id:'e-si-top',source:'store_inventory',target:'inv_top',type:'default',style:faint(C.inventory),markerEnd:ARR(C.inventory)},
      {id:'e-si-bot',source:'store_inventory',target:'inv_bot',type:'default',style:faint(C.inventory),markerEnd:ARR(C.inventory)},
      {id:'e-wh-wb',source:'wellness_hub',  target:'w_bruxism',      type:'default', animated:anim.wBrux,  style:solid(C.wellness), markerEnd:ARR(C.wellness)},
      {id:'e-wb-wm',source:'w_bruxism',     target:'w_meditation',   type:'default', animated:anim.wMed,   style:solid(C.wellness), markerEnd:ARR(C.wellness)},
      {id:'e-wm-wl',source:'w_meditation',  target:'w_lymphatic',    type:'default', animated:anim.wLymph, style:solid(C.wellness), markerEnd:ARR(C.wellness)},
    ];
  },[live]);

  const {neighborIds,sourceIds,targetIds} = useMemo(()=>{
    if(!selected) return {neighborIds:new Set<string>(),sourceIds:new Set<string>(),targetIds:new Set<string>()};
    const neighborIds=new Set<string>(), sourceIds=new Set<string>(), targetIds=new Set<string>();
    edges.forEach(e=>{
      if(e.source===selected.id){ neighborIds.add(e.target); targetIds.add(e.target); }
      if(e.target===selected.id){ neighborIds.add(e.source); sourceIds.add(e.source); }
    });
    return {neighborIds,sourceIds,targetIds};
  },[selected?.id, edges]);

  const connectionInfo = useMemo(():ConnectionInfo|null=>{
    if(!selected) return null;
    const link=(id:string):ConnLink=>{
      const nd=nodes.find(n=>n.id===id); const cd=nd?.data as unknown as CardData|undefined;
      return {id,label:cd?.label??id,color:cd?.color??'#fff',kicker:cd?.kicker??''};
    };
    return {
      sources: edges.filter(e=>e.target===selected.id).map(e=>link(e.source)),
      targets: edges.filter(e=>e.source===selected.id).map(e=>link(e.target)),
    };
  },[selected?.id, edges, nodes]);

  const visibleNodes = useMemo(()=>
    hiddenCats.size===0 ? nodes :
    nodes.map(n=>({...n,hidden:SIDEBAR_TREE.some(c=>hiddenCats.has(c.id)&&c.items.some(i=>i.nodeId===n.id))}))
  ,[nodes,hiddenCats]);

  const displayEdges = useMemo(()=>{
    if(!selected) return edges;
    const active=new Set([selected.id,...neighborIds]);
    return edges.map(e=>{
      if(active.has(e.source)&&active.has(e.target)) return e;
      const me=e.markerEnd;
      return {...e,animated:false,
        style:{...e.style,opacity:0.04,stroke:'rgba(60,60,80,0.15)'},
        markerEnd:me&&typeof me==='object'?{...me,color:'rgba(60,60,80,0.12)'}:me};
    });
  },[selected?.id,neighborIds,edges]);

  return (
    <div style={{width:'100%',height:'100dvh',display:'flex',background:'#07080f',overflow:'hidden'}}>
      <style>{`
        .react-flow__edge-textbg { fill: rgba(8,9,18,0.95); }
        .react-flow__edge-text { font-family: var(--font-mono,monospace); }
        .react-flow__minimap { background: rgba(8,9,18,0.92) !important; border:1px solid rgba(255,255,255,0.07); border-radius:10px; box-shadow:0 4px 20px rgba(0,0,0,0.6); }
        .react-flow__minimap-mask { fill: rgba(8,9,18,0.60); }
        .react-flow__node.selected { outline: none !important; }
        .react-flow__node:focus-visible { outline: none !important; }
        .react-flow__node:focus { outline: none !important; }
      `}</style>

      {/* ── Left sidebar (collapsed by default, toggled open) ── */}
      <LeftSidebar nodes={nodes} selected={selected} onSelect={setSelected}
        hiddenCats={hiddenCats} onHideToggle={onHideToggle}/>

      {/* ── Canvas — full remaining width ── */}
      <div style={{flex:1,position:'relative',background:'#07080f',minWidth:0}} onClick={()=>setSelected(null)}>
        <HighlightCtx.Provider value={{selectedId:selected?.id??null, neighborIds, sourceIds, targetIds}}>
        <ReactFlow nodes={visibleNodes} edges={displayEdges} nodeTypes={nodeTypes}
          defaultViewport={{x:-115,y:-165,zoom:0.85}}
          minZoom={0.12} maxZoom={2.5}
          nodesDraggable nodesConnectable={false} elementsSelectable
          panOnScroll zoomOnScroll proOptions={{hideAttribution:true}}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.04)" />
          <Controls showInteractive={false} style={{background:'rgba(10,11,20,0.92)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.5)',bottom:62}}/>
          <MiniMap
            position="bottom-right"
            pannable zoomable
            nodeColor={(n:Node)=>{ const c=(n.data as unknown as CardData|undefined)?.color; return c ?? 'rgba(255,255,255,0.2)'; }}
            nodeStrokeColor="transparent"
            nodeBorderRadius={4}
            maskColor="rgba(8,9,18,0.60)"
            style={{width:148,height:92}}
          />
        </ReactFlow>
        </HighlightCtx.Provider>
        {/* Floating detail — only visible when a node is selected */}
        <FloatingDetail data={selected} conn={connectionInfo} onClose={()=>setSelected(null)}/>
      </div>
    </div>
  );
}
