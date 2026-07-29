import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, remove } from "firebase/database";

// ── Firebase ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAm4Gy0T839mVZssBG1es4OafH2twa8usc",
  authDomain: "gentlemoments.firebaseapp.com",
  databaseURL: "https://gentlemoments-default-rtdb.firebaseio.com",
  projectId: "gentlemoments",
  storageBucket: "gentlemoments.firebasestorage.app",
  messagingSenderId: "441871508789",
  appId: "1:441871508789:web:4ab9c3bfff8f87da80d87c",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ── 업무 데이터 ───────────────────────────────────────────
const TEMPLATE_META = {
  1: { label: "📱 SNS 업무",            color: "#3b82f6", bg: "#eff6ff" },
  2: { label: "🛍️ 쇼핑몰 관리",         color: "#ef4444", bg: "#fef2f2" },
  3: { label: "🎬 릴스 제작 및 업로드",  color: "#f59e0b", bg: "#fffbeb" },
  4: { label: "📋 사무업무",             color: "#10b981", bg: "#f0fdf4" },
  5: { label: "📷 사진 업무",            color: "#8b5cf6", bg: "#f5f3ff" },
  6: { label: "📌 기타 업무",            color: "#64748b", bg: "#f8fafc" },
};
const OPTION_MAP = {
  1: [
    { id: "blog",           label: "📝 블로그",              tid: 1 },
    { id: "yuyu",           label: "🎥 유유모먼트 계정",      tid: 1 },
    { id: "wishiz_snap",    label: "📸 위시즈스냅 계정",      tid: 1 },
    { id: "wishiz_family",  label: "👨‍👩‍👧 위시즈패밀리 계정",  tid: 1 },
    { id: "gentle_threads", label: "🧵 젠틀모먼츠 스레드",    tid: 1 },
    { id: "wishiz_threads", label: "🧵 위시즈 스레드",        tid: 1 },
    { id: "yuyu_threads",   label: "🧵 유유모먼트 스레드",    tid: 1 },
  ],
  2: [
    { id: "naver_order",    label: "🛒 네이버 스마트스토어 주문 확인", tid: 2 },
    { id: "coupang_reg",    label: "📦 쿠팡 온채널 물품 등록",         tid: 2 },
    { id: "smartstore_reg", label: "🏪 스스 온채널 물품 등록",         tid: 2 },
    { id: "cs",             label: "💬 CS (고객 문의 응대)",            tid: 2 },
  ],
  3: [
    { id: "reels_plan",   label: "💡 릴스 기획",   tid: 3 },
    { id: "reels_shoot",  label: "🎥 릴스 촬영",   tid: 3 },
    { id: "reels_edit",   label: "✂️ 릴스 편집",   tid: 3 },
    { id: "reels_upload", label: "📤 릴스 업로드", tid: 3 },
  ],
  4: [
    { id: "office_assist", label: "🗂️ 사무보조", tid: 4 },
    { id: "accounting",    label: "🧾 회계 업무", tid: 4 },
    { id: "etc4",          label: "📌 기타",       tid: 4 },
  ],
  5: [
    { id: "photo_select", label: "🖼️ 원본 셀렉",                  tid: 5 },
    { id: "photo_edit1",  label: "🎨 1차 보정",                    tid: 5 },
    { id: "photo_edit2",  label: "✨ 2차 보정",                    tid: 5 },
    { id: "photo_send",   label: "📤 고객 전송 및 인화상품 안내",  tid: 5 },
    { id: "photo_print",  label: "🖨️ 인화상품 제작 및 외주 의뢰", tid: 5 },
  ],
  6: [
    { id: "meeting",   label: "🤝 회의", tid: 6 },
    { id: "cleaning",  label: "🧹 청소", tid: 6 },
    { id: "dining",    label: "🍽️ 회식", tid: 6 },
    { id: "other_etc", label: "📌 기타", tid: 6 },
  ],
};
const ALL_OPTIONS = Object.values(OPTION_MAP).flat();
const OPTION_BY_ID = Object.fromEntries(ALL_OPTIONS.map(o => [o.id, o]));

// ── 유틸 함수 ─────────────────────────────────────────────
function getTodayString() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일","월","화","수","목","금","토"];
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
function formatTime(date) {
  return date.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
}
function formatTimeShort(date) {
  return date.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});
}
function generateDirectiveText(date, priority, memo, optionMemos) {
  if (!priority?.length) return "";
  const items = priority.map((id,idx) => ({...OPTION_BY_ID[id], rank:idx+1}));
  const taskLines = items.map(i => {
    const memoNote = optionMemos?.[i.id] ? `\n   └ 📝 ${optionMemos[i.id]}` : "";
    const uploadTag = i.tid === 1 ? " 업로드" : "";
    return `${i.rank}번째 · ${i.label}${uploadTag}${memoNote}`;
  }).join("\n");
  const memoSection = memo?.trim() ? `\n📝 메모\n${memo.trim()}` : "";
  return `📅 ${formatDate(date)} 업무 지침서\n\n안녕하세요! 오늘도 잘 부탁드려요 😊\n\n━━━━━━━━━━━━━━━━━━\n📋 오늘의 업무 목록\n━━━━━━━━━━━━━━━━━━\n${taskLines}\n${memoSection}\n\n수고하세요! 오늘도 화이팅입니다 💪`;
}

// ── 공용 UI ──────────────────────────────────────────────
const S = {
  card: { background:"white", borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.08)", overflow:"hidden" },
  input: { width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit", color:"#0f172a" },
  label: { fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 },
  btn: (color="#1d4ed8") => ({ padding:"10px 18px", borderRadius:8, border:"none", background:color, color:"white", fontWeight:700, fontSize:13, cursor:"pointer" }),
  tag: (color,bg) => ({ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color, background:bg }),
};

function Badge({status}) {
  const map = { "정상":["#16a34a","#f0fdf4"], "지각":["#dc2626","#fef2f2"], "휴가":["#d97706","#fffbeb"], "미출근":["#64748b","#f8fafc"], "출근중":["#2563eb","#eff6ff"], "퇴근":["#7c3aed","#f5f3ff"] };
  const [c,b] = map[status]||["#64748b","#f8fafc"];
  return <span style={S.tag(c,b)}>{status}</span>;
}

function Toast({msg,type,onClose}) {
  useEffect(() => { const t=setTimeout(onClose,3000); return ()=>clearTimeout(t); },[]);
  return (
    <div style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)", background: type==="error"?"#dc2626":"#0f172a", color:"white",padding:"12px 24px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",whiteSpace:"nowrap" }}>
      {msg}
    </div>
  );
}

function Modal({children,onClose}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        {children}
        <button onClick={onClose} style={{...S.btn("#f1f5f9"),color:"#64748b",width:"100%",marginTop:12}}>닫기</button>
      </div>
    </div>
  );
}

function OptionBtn({item,isOn,color,bg,onClick}) {
  return (
    <button onClick={onClick} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,border:`1.5px solid ${isOn?color:"#e2e8f0"}`,background:isOn?bg:"white",color:isOn?color:"#64748b",fontWeight:isOn?700:400,cursor:"pointer",fontSize:13,textAlign:"left",transition:"all 0.15s",width:"100%" }}>
      <span style={{width:17,height:17,borderRadius:4,border:`2px solid ${isOn?color:"#cbd5e1"}`,background:isOn?color:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"white",fontWeight:700}}>{isOn?"✓":""}</span>
      {item.label}
    </button>
  );
}

function DragPanel({priority,setPriority}) {
  const [dragIdx,setDragIdx] = useState(null);
  const [overIdx,setOverIdx] = useState(null);
  const move = (idx,dir) => {
    const n=[...priority],s=idx+dir;
    if(s<0||s>=n.length) return;
    [n[idx],n[s]]=[n[s],n[idx]]; setPriority(n);
  };
  return (
    <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>🔢 업무 순서 설정 <span style={{color:"#94a3b8",fontSize:11,fontWeight:400}}>(드래그 또는 ▲▼)</span></div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}
        onTouchMove={e=>{
          if(dragIdx===null) return;
          const el=document.elementFromPoint(e.touches[0].clientX,e.touches[0].clientY)?.closest("[data-di]");
          if(el) setOverIdx(parseInt(el.dataset.di));
        }}
        onTouchEnd={()=>{
          if(dragIdx!==null&&overIdx!==null&&dragIdx!==overIdx){
            const n=[...priority],[m]=n.splice(dragIdx,1);n.splice(overIdx,0,m);setPriority(n);
          }
          setDragIdx(null);setOverIdx(null);
        }}>
        {priority.map((id,idx)=>{
          const opt=OPTION_BY_ID[id], meta=TEMPLATE_META[opt.tid];
          const dragging=dragIdx===idx, isOver=overIdx===idx&&dragIdx!==idx;
          return (
            <div key={id} data-di={idx} draggable
              onDragStart={()=>setDragIdx(idx)}
              onDragOver={e=>{e.preventDefault();setOverIdx(idx);}}
              onDrop={()=>{if(dragIdx!==null&&dragIdx!==idx){const n=[...priority],[m]=n.splice(dragIdx,1);n.splice(idx,0,m);setPriority(n);}setDragIdx(null);setOverIdx(null);}}
              onDragEnd={()=>{setDragIdx(null);setOverIdx(null);}}
              onTouchStart={()=>setDragIdx(idx)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${isOver?meta.color:dragging?"#3b82f6":"#e2e8f0"}`,background:dragging?"#eff6ff":isOver?`${meta.color}10`:"#f8fafc",opacity:dragging?0.5:1,cursor:"grab",transition:"all 0.15s",userSelect:"none"}}>
              <span style={{color:"#94a3b8",fontSize:13,flexShrink:0}}>⠿</span>
              <span style={{minWidth:22,height:22,borderRadius:"50%",background:idx===0?meta.color:"#cbd5e1",color:"white",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{idx+1}</span>
              <span style={{fontSize:10,fontWeight:700,color:"white",background:meta.color,borderRadius:4,padding:"1px 7px",flexShrink:0}}>{meta.label}</span>
              <span style={{flex:1,fontSize:12,color:"#374151"}}>{opt.label}</span>
              <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                <button onClick={e=>{e.stopPropagation();move(idx,-1);}} disabled={idx===0} style={{padding:"2px 7px",border:"1px solid #e2e8f0",borderRadius:4,background:idx===0?"#f8fafc":"white",cursor:idx===0?"not-allowed":"pointer",fontSize:10,color:"#64748b"}}>▲</button>
                <button onClick={e=>{e.stopPropagation();move(idx,1);}} disabled={idx===priority.length-1} style={{padding:"2px 7px",border:"1px solid #e2e8f0",borderRadius:4,background:idx===priority.length-1?"#f8fafc":"white",cursor:idx===priority.length-1?"not-allowed":"pointer",fontSize:10,color:"#64748b"}}>▼</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 인증 모달 ─────────────────────────────────────────────
function AuthModal({type,action,onClose,onSuccess}) {
  const [step,setStep]=useState("idle");
  useEffect(()=>{
    if(step==="scanning"||step==="locating"||step==="checking"){
      const t=setTimeout(()=>setStep("done"),2000); return()=>clearTimeout(t);
    }
  },[step]);
  const labels = {qr:"QR 코드 스캔",gps:"GPS 위치 인증",network:"Wi-Fi 네트워크 인증"};
  const startLabels = {qr:"스캔 시작",gps:"위치 확인",network:"연결 확인"};
  const loadingStep = {qr:"scanning",gps:"locating",network:"checking"};
  const loadingLabel = {qr:"스캔 중...",gps:"위치 확인 중...",network:"확인 중..."};
  const doneMsg = {qr:"QR 인증 완료",gps:"위치 인증 완료 (스튜디오 37m)",network:"Wi-Fi 인증 완료 (GentleMoments_Office)"};
  return (
    <Modal onClose={onClose}>
      <div style={{textAlign:"center"}}>
        <div style={{fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:20}}>{labels[type]}</div>
        <div style={{width:140,height:140,margin:"0 auto 20px",borderRadius:type==="gps"?"50%":12,background:step==="done"?"#f0fdf4":step!=="idle"?"#eff6ff":"#f8fafc",border:`3px solid ${step==="done"?"#22c55e":step!=="idle"?"#3b82f6":"#e2e8f0"}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,transition:"all 0.3s"}}>
          {step==="done" ? (
            <><div style={{fontSize:32}}>✅</div><div style={{fontSize:11,color:"#16a34a",fontWeight:700}}>완료</div></>
          ) : step!=="idle" ? (
            <><div style={{width:36,height:36,border:"3px solid #3b82f6",borderTopColor:"transparent",borderRadius:"50%"}} /><div style={{fontSize:11,color:"#3b82f6",fontWeight:600}}>{loadingLabel[type]}</div></>
          ) : (
            <div style={{fontSize:48}}>{type==="qr"?"📱":type==="gps"?"📍":"📶"}</div>
          )}
        </div>
        {step==="done" ? (
          <><div style={{fontSize:12,color:"#16a34a",fontWeight:600,marginBottom:12}}>{doneMsg[type]}</div>
          <button onClick={()=>{onSuccess();onClose();}} style={{...S.btn("#16a34a"),width:"100%"}}>확인 ({action==="in"?"출근":"퇴근"} 완료)</button></>
        ) : (
          <button onClick={()=>setStep(loadingStep[type])} disabled={step!=="idle"} style={{...S.btn(step!=="idle"?"#94a3b8":"#3b82f6"),width:"100%"}}>
            {step!=="idle" ? loadingLabel[type] : startLabels[type]}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════
// 메인 앱
// ══════════════════════════════════════════════════════════
export default function App() {
  const [section,setSection] = useState("dashboard"); // 대메뉴
  const [now,setNow] = useState(new Date());
  const [toast,setToast] = useState(null);
  const [authModal,setAuthModal] = useState(null);
  const [sideOpen,setSideOpen] = useState(true);

  // ── 업무 지침 state ──
  const [wDate,setWDate] = useState(getTodayString());
  const [wTemplates,setWTemplates] = useState([]);
  const [wOptTab,setWOptTab] = useState(null);
  const [wSelected,setWSelected] = useState(new Set());
  const [wOptMemos,setWOptMemos] = useState({});
  const [wPriority,setWPriority] = useState([]);
  const [wMemo,setWMemo] = useState("");
  const [wResult,setWResult] = useState("");
  const [wChecklist,setWChecklist] = useState({});
  const [wCopied,setWCopied] = useState(false);
  const [wSaving,setWSaving] = useState(false);
  const [wSaveOk,setWSaveOk] = useState(false);

  // ── 대표 업무 state ──
  const [bDate,setBDate] = useState(getTodayString());
  const [bTemplates,setBTemplates] = useState([]);
  const [bOptTab,setBOptTab] = useState(null);
  const [bSelected,setBSelected] = useState(new Set());
  const [bOptMemos,setBOptMemos] = useState({});
  const [bPriority,setBPriority] = useState([]);
  const [bMemo,setBMemo] = useState("");
  const [bResult,setBResult] = useState("");
  const [bChecklist,setBChecklist] = useState({});
  const [bCopied,setBCopied] = useState(false);
  const [bSaving,setBSaving] = useState(false);
  const [bSaveOk,setBSaveOk] = useState(false);
  const [bNote,setBNote] = useState("");

  // ── Firebase 데이터 ──
  const [history,setHistory] = useState([]);
  const [bossHistory,setBossHistory] = useState([]);
  const [liveDirective,setLiveDirective] = useState(null);
  const [attHistory,setAttHistory] = useState([]); // 근태 히스토리

  // ── 근태 state ──
  const [authMethod,setAuthMethod] = useState("manual");
  const [myStatus,setMyStatus] = useState("미출근");
  const [myCheckIn,setMyCheckIn] = useState(null);
  const [myCheckOut,setMyCheckOut] = useState(null);
  const [attRecords,setAttRecords] = useState([
    {id:1,name:"김지수",role:"SNS 마케터",checkIn:"09:02",checkOut:"18:05",status:"정상",weekHours:38.5},
    {id:2,name:"이민준",role:"사진 편집",checkIn:"09:45",checkOut:null,status:"지각",weekHours:22.0},
    {id:3,name:"박서연",role:"쇼핑몰 관리",checkIn:null,checkOut:null,status:"휴가",weekHours:16.0},
  ]);
  const weekData = [{day:"월",h:8.5},{day:"화",h:8},{day:"수",h:9},{day:"목",h:7.5},{day:"금",h:0}];
  const totalWeekH = weekData.reduce((s,d)=>s+d.h,0);

  // ── 휴가 state ──
  const [leaves,setLeaves] = useState([
    {id:1,name:"이민준",type:"반차",date:"2026-07-30",reason:"병원 진료",status:"대기"},
    {id:2,name:"박서연",type:"연차",date:"2026-07-29",reason:"개인 사정",status:"승인"},
  ]);
  const [leaveForm,setLeaveForm] = useState({type:"연차",date:"",reason:""});

  // ── 실시간 날짜/시계 ──
  useEffect(()=>{
    const tick=()=>setNow(new Date());
    tick();
    const now2=new Date();
    const ms=(60-now2.getSeconds())*1000-now2.getMilliseconds();
    const t=setTimeout(()=>{tick();const i=setInterval(tick,60000);return()=>clearInterval(i);},ms);
    return()=>clearTimeout(t);
  },[]);

  // ── Firebase 구독 ──
  useEffect(()=>{
    const u1=onValue(ref(db,"history"),snap=>{
      const d=snap.val();
      setHistory(d ? Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,50) : []);
    });
    const u2=onValue(ref(db,"live"),snap=>{ if(snap.val()) setLiveDirective(snap.val()); });
    const u3=onValue(ref(db,"bossHistory"),snap=>{
      const d=snap.val();
      setBossHistory(d ? Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,50) : []);
    });
    const u4=onValue(ref(db,"bossNote"),snap=>{ if(snap.val()!==null) setBNote(snap.val()); });
    const u5=onValue(ref(db,"attHistory"),snap=>{
      const d=snap.val();
      setAttHistory(d ? Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,100) : []);
    });
    return()=>{u1();u2();u3();u4();u5();};
  },[]);

  const showToast=(msg,type="ok")=>{ setToast({msg,type}); };

  // ── 출근/퇴근 ──
  const doCheckIn=()=>{
    const t=formatTimeShort(new Date());
    setMyStatus("출근중"); setMyCheckIn(t);
    push(ref(db,"attHistory"),{name:"백송 대표",date:getTodayString(),checkIn:t,checkOut:null,status:"출근중",id:Date.now()});
    showToast(`✅ 출근 완료! ${t}`);
  };
  const doCheckOut=()=>{
    const t=formatTimeShort(new Date());
    setMyStatus("퇴근"); setMyCheckOut(t);
    push(ref(db,"attHistory"),{name:"백송 대표",date:getTodayString(),checkIn:myCheckIn,checkOut:t,status:"정상",id:Date.now()});
    showToast(`🏠 퇴근 완료! ${t}`);
  };

  // ── 업무지침 생성 ──
  const handleWGenerate=async()=>{
    const text=generateDirectiveText(wDate,wPriority,wMemo,wOptMemos);
    const lines=text.split("\n").filter(l=>/^\d+번째/.test(l));
    const checks={}; lines.forEach((_,i)=>{checks[i]=false;});
    setWResult(text); setWChecklist(checks); setWSaving(true);
    try{
      const item={date:wDate,priority:wPriority,memo:wMemo,optionMemos:wOptMemos,result:text,id:Date.now(),checks,tomorrowNote:"",orderChanged:false,workerOrder:null};
      const pushed=await push(ref(db,"history"),item);
      await set(ref(db,"live"),{...item,firebaseKey:pushed.key});
      setWSaveOk(true); setTimeout(()=>setWSaveOk(false),2500);
    }catch(e){console.error(e);}
    setWSaving(false);
  };

  // ── 대표 업무 생성 ──
  const handleBGenerate=async()=>{
    const text=generateDirectiveText(bDate,bPriority,bMemo,bOptMemos);
    const lines=text.split("\n").filter(l=>/^\d+번째/.test(l));
    const checks={}; lines.forEach((_,i)=>{checks[i]=false;});
    setBResult(text); setBChecklist(checks); setBSaving(true);
    try{
      const item={date:bDate,priority:bPriority,memo:bMemo,optionMemos:bOptMemos,result:text,id:Date.now(),checks,type:"boss"};
      await push(ref(db,"bossHistory"),item);
      setBSaveOk(true); setTimeout(()=>setBSaveOk(false),2500);
    }catch(e){console.error(e);}
    setBSaving(false);
  };

  // ── 템플릿 토글 헬퍼 ──
  const makeToggleTemplate=(templates,setTemplates,selected,setSelected,priority,setPriority,optMemos,setOptMemos,setOptTab)=>(tid)=>{
    setTemplates(prev=>{
      if(prev.includes(tid)){
        const rids=OPTION_MAP[tid].map(o=>o.id);
        setSelected(p=>{const n=new Set(p);rids.forEach(id=>n.delete(id));return n;});
        setPriority(p=>p.filter(id=>!rids.includes(id)));
        setOptMemos(p=>{const n={...p};rids.forEach(id=>delete n[id]);return n;});
        const rem=prev.filter(t=>t!==tid);
        setOptTab(rem.length>0?rem[rem.length-1]:null);
        return rem;
      }
      setOptTab(tid); return [...prev,tid];
    });
  };
  const makeToggleOption=(selected,setSelected,priority,setPriority,optMemos,setOptMemos)=>(optId)=>{
    setSelected(prev=>{
      const next=new Set(prev);
      if(next.has(optId)){next.delete(optId);setPriority(p=>p.filter(id=>id!==optId));setOptMemos(p=>{const n={...p};delete n[optId];return n;});}
      else{next.add(optId);setPriority(p=>[...p,optId]);}
      return next;
    });
  };

  const wToggleTemplate=makeToggleTemplate(wTemplates,setWTemplates,wSelected,setWSelected,wPriority,setWPriority,wOptMemos,setWOptMemos,setWOptTab);
  const wToggleOption=makeToggleOption(wSelected,setWSelected,wPriority,setWPriority,wOptMemos,setWOptMemos);
  const bToggleTemplate=makeToggleTemplate(bTemplates,setBTemplates,bSelected,setBSelected,bPriority,setBPriority,bOptMemos,setBOptMemos,setBOptTab);
  const bToggleOption=makeToggleOption(bSelected,setBSelected,bPriority,setBPriority,bOptMemos,setBOptMemos);

  // ── 업무 선택 패널 (재사용) ──
  function WorkSelector({templates,optTab,setOptTab,selected,toggleTemplate,toggleOption,optMemos,setOptMemos,priority,setPriority,accentColor="#3b82f6"}) {
    return (
      <>
        {/* 템플릿 그리드 */}
        <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>업무 템플릿 선택 <span style={{color:"#94a3b8",fontWeight:400}}>(복수 선택)</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {Object.entries(TEMPLATE_META).map(([tidStr,meta])=>{
              const tid=Number(tidStr), isOn=templates.includes(tid);
              return (
                <button key={tid} onClick={()=>toggleTemplate(tid)} style={{padding:"10px 12px",borderRadius:8,border:`1.5px solid ${isOn?meta.color:"#e2e8f0"}`,background:isOn?meta.bg:"white",color:isOn?meta.color:"#64748b",fontWeight:isOn?700:400,cursor:"pointer",fontSize:12,textAlign:"left",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                  <span style={{width:15,height:15,borderRadius:3,border:`2px solid ${isOn?meta.color:"#cbd5e1"}`,background:isOn?meta.color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"white",fontWeight:700,flexShrink:0}}>{isOn?"✓":""}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 탭형 옵션 패널 */}
        {templates.length>0 && (
          <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {templates.map(tid=>{
                const meta=TEMPLATE_META[tid];
                const cnt=OPTION_MAP[tid].filter(o=>selected.has(o.id)).length;
                const isActive=optTab===tid;
                return (
                  <button key={tid} onClick={()=>setOptTab(tid)} style={{padding:"6px 12px",borderRadius:20,border:`2px solid ${isActive?meta.color:"#e2e8f0"}`,background:isActive?meta.color:"white",color:isActive?"white":meta.color,fontWeight:isActive?700:500,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}}>
                    {meta.label}
                    {cnt>0&&<span style={{background:isActive?"rgba(255,255,255,0.3)":meta.color,color:"white",borderRadius:10,fontSize:10,padding:"0 5px",fontWeight:700}}>{cnt}</span>}
                  </button>
                );
              })}
            </div>
            {optTab&&OPTION_MAP[optTab]&&(()=>{
              const meta=TEMPLATE_META[optTab];
              const options=OPTION_MAP[optTab];
              const cnt=options.filter(o=>selected.has(o.id)).length;
              return (
                <div style={{borderTop:`2px solid ${meta.color}`,paddingTop:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:meta.color,marginBottom:10}}>{meta.label} — 세부 업무 선택</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {options.map(opt=>(
                      <div key={opt.id}>
                        <OptionBtn item={opt} isOn={selected.has(opt.id)} color={meta.color} bg={meta.bg} onClick={()=>toggleOption(opt.id)}/>
                        {selected.has(opt.id)&&(
                          <input type="text" value={optMemos[opt.id]||""} onChange={e=>setOptMemos(p=>({...p,[opt.id]:e.target.value}))}
                            placeholder={`📝 ${opt.label} 메모`}
                            style={{...S.input,marginTop:4,fontSize:11,padding:"6px 10px",background:"#f8fafc"}}/>
                        )}
                      </div>
                    ))}
                  </div>
                  {cnt>0&&<div style={{marginTop:8,padding:"5px 10px",borderRadius:6,background:meta.bg,fontSize:11,color:meta.color,fontWeight:600}}>✅ {cnt}개 선택됨</div>}
                </div>
              );
            })()}
          </div>
        )}

        {priority.length>=2 && <DragPanel priority={priority} setPriority={setPriority}/>}
      </>
    );
  }

  // ── 체크리스트 카드 (재사용) ──
  function ChecklistCard({result,checklist,setChecklist,onFirebase,themeColor="#3b82f6"}) {
    const items=result.split("\n").filter(l=>/^\d+번째/.test(l));
    if(!items.length) return null;
    const done=Object.values(checklist).filter(Boolean).length;
    return (
      <div style={{marginTop:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:8}}>✅ 체크리스트 ({done}/{items.length})</div>
        {items.map((item,i)=>(
          <label key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:checklist[i]?"#f0fdf4":"#f8fafc",marginBottom:5,cursor:"pointer",border:`1px solid ${checklist[i]?"#86efac":"#e2e8f0"}`,transition:"all 0.15s"}}>
            <input type="checkbox" checked={!!checklist[i]} onChange={async()=>{
              const n={...checklist,[i]:!checklist[i]};
              setChecklist(n);
              if(onFirebase) await onFirebase(n);
            }} style={{accentColor:themeColor,width:15,height:15}}/>
            <span style={{fontSize:12,color:checklist[i]?"#16a34a":"#374151",textDecoration:checklist[i]?"line-through":"none"}}>{item}</span>
          </label>
        ))}
        <div style={{marginTop:8,height:6,borderRadius:3,background:"#e2e8f0"}}>
          <div style={{height:"100%",borderRadius:3,background:`linear-gradient(90deg,${themeColor},#60a5fa)`,width:`${items.length>0?done/items.length*100:0}%`,transition:"width 0.4s"}}/>
        </div>
      </div>
    );
  }

  // ── 히스토리 카드 (재사용) ──
  function HistCard({item,onDelete,onLoad,onCheck,themeColor="#3b82f6"}) {
    const [open,setOpen]=useState(false);
    const [copied,setCopied]=useState(false);
    const [del,setDel]=useState(false);
    const [localChecks,setLocalChecks]=useState(item.checks||{});
    const items=(item.result||"").split("\n").filter(l=>/^\d+번째/.test(l));
    const done=Object.values(localChecks).filter(Boolean).length;
    return (
      <div style={{background:"white",borderRadius:10,marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden",borderLeft:`3px solid ${themeColor}`}}>
        <div onClick={()=>setOpen(o=>!o)} style={{padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{formatDate(item.date)}</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {(item.priority||[]).map(id=>OPTION_BY_ID[id]?.label).filter(Boolean).join(", ").slice(0,50)}
            </div>
            {items.length>0&&<div style={{fontSize:11,marginTop:3,color:done===items.length?"#16a34a":"#f59e0b",fontWeight:600}}>{done===items.length?"✅ 완료":`⏳ ${done}/${items.length}`}</div>}
          </div>
          <span style={{color:"#94a3b8",fontSize:13,marginLeft:8}}>{open?"▲":"▼"}</span>
        </div>
        {open&&(
          <div style={{padding:"0 16px 14px"}}>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              <button onClick={()=>{navigator.clipboard.writeText(item.result);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{...S.btn(copied?"#16a34a":"#1d4ed8"),padding:"5px 10px",fontSize:11}}>{copied?"✅ 복사됨":"📋 복사"}</button>
              {onLoad&&<button onClick={()=>onLoad(item)} style={{...S.btn("#f59e0b"),padding:"5px 10px",fontSize:11}}>✏️ 불러오기</button>}
              {!del
                ? <button onClick={()=>setDel(true)} style={{...S.btn("#ef4444"),padding:"5px 10px",fontSize:11}}>🗑️ 삭제</button>
                : <><span style={{fontSize:11,color:"#94a3b8",alignSelf:"center"}}>삭제?</span>
                    <button onClick={()=>onDelete(item.firebaseKey)} style={{...S.btn("#ef4444"),padding:"4px 8px",fontSize:11}}>확인</button>
                    <button onClick={()=>setDel(false)} style={{...S.btn("#94a3b8"),padding:"4px 8px",fontSize:11}}>취소</button>
                  </>
              }
            </div>
            <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:12,fontSize:11,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{item.result}</pre>
            {items.length>0&&(
              <div style={{marginTop:10}}>
                {items.map((ci,i)=>(
                  <label key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,background:localChecks[i]?"#f0fdf4":"#f8fafc",marginBottom:4,cursor:"pointer",border:`1px solid ${localChecks[i]?"#86efac":"#e2e8f0"}`}}>
                    <input type="checkbox" checked={!!localChecks[i]} onChange={async()=>{
                      const n={...localChecks,[i]:!localChecks[i]};
                      setLocalChecks(n);
                      if(onCheck&&item.firebaseKey) await onCheck(item.firebaseKey,n);
                    }} style={{accentColor:themeColor,width:14,height:14}}/>
                    <span style={{fontSize:11,color:localChecks[i]?"#16a34a":"#374151",textDecoration:localChecks[i]?"line-through":"none"}}>{ci}</span>
                  </label>
                ))}
                <div style={{marginTop:6,height:4,borderRadius:2,background:"#e2e8f0"}}>
                  <div style={{height:"100%",borderRadius:2,background:themeColor,width:`${items.length>0?done/items.length*100:0}%`,transition:"width 0.4s"}}/>
                </div>
              </div>
            )}
            {item.tomorrowNote&&(
              <div style={{marginTop:8,padding:"8px 10px",borderRadius:6,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:11,color:"#92400e"}}>
                📝 내일 메모: {item.tomorrowNote}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── 근태 탭 ──
  function AttTab() {
    const [subTab,setSubTab]=useState("clock"); // clock | manage | leave
    return (
      <div>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {[{k:"clock",l:"⏰ 출퇴근"},{k:"manage",l:"👥 근태 관리"},{k:"leave",l:"📋 휴가 신청"}].map(t=>(
            <button key={t.k} onClick={()=>setSubTab(t.k)} style={{padding:"8px 16px",borderRadius:8,border:`1.5px solid ${subTab===t.k?"#1d4ed8":"#e2e8f0"}`,background:subTab===t.k?"#1d4ed8":"white",color:subTab===t.k?"white":"#64748b",fontWeight:subTab===t.k?700:400,cursor:"pointer",fontSize:12}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* 출퇴근 */}
        {subTab==="clock"&&(
          <div style={{maxWidth:560}}>
            {/* 상태 카드 */}
            <div style={{background:myStatus==="퇴근"?"linear-gradient(135deg,#7c3aed,#a855f7)":myStatus==="출근중"?"linear-gradient(135deg,#1d4ed8,#3b82f6)":"linear-gradient(135deg,#475569,#64748b)",borderRadius:16,padding:"28px 24px",color:"white",textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:11,opacity:0.7,marginBottom:6}}>{formatDate(getTodayString())}</div>
              <div style={{fontSize:44,fontWeight:800,letterSpacing:"-1px",fontVariantNumeric:"tabular-nums"}}>{formatTime(now)}</div>
              <div style={{marginTop:12,display:"inline-block",padding:"6px 16px",background:"rgba(255,255,255,0.2)",borderRadius:20,fontSize:12,fontWeight:600}}>
                {myStatus==="퇴근"?`✅ 퇴근 완료 ${myCheckOut||""}`:myStatus==="출근중"?`🟢 출근 중 (${myCheckIn} 출근)`:"⏸ 미출근"}
              </div>
            </div>

            {/* 인증 방식 */}
            <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>인증 방식</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[{k:"manual",l:"✏️ 수동"},{k:"qr",l:"📱 QR"},{k:"gps",l:"📍 GPS"},{k:"network",l:"📶 Wi-Fi"}].map(m=>(
                  <button key={m.k} onClick={()=>setAuthMethod(m.k)} style={{padding:"10px 6px",borderRadius:8,border:`1.5px solid ${authMethod===m.k?"#1d4ed8":"#e2e8f0"}`,background:authMethod===m.k?"#eff6ff":"white",color:authMethod===m.k?"#1d4ed8":"#64748b",fontWeight:authMethod===m.k?700:400,cursor:"pointer",fontSize:11,textAlign:"center"}}>
                    {m.l}
                  </button>
                ))}
              </div>
            </div>

            {/* 출퇴근 버튼 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <button onClick={()=>{
                if(myStatus!=="미출근"){showToast("이미 출근 상태예요.","err");return;}
                if(authMethod==="manual") doCheckIn();
                else setAuthModal({type:authMethod,action:"in"});
              }} disabled={myStatus!=="미출근"} style={{...S.btn(myStatus!=="미출근"?"#cbd5e1":"#1d4ed8"),padding:"18px",fontSize:15,display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:myStatus!=="미출근"?"not-allowed":"pointer"}}>
                <span style={{fontSize:24}}>🟢</span> 출근하기
              </button>
              <button onClick={()=>{
                if(myStatus!=="출근중"){showToast("먼저 출근해주세요.","err");return;}
                if(authMethod==="manual") doCheckOut();
                else setAuthModal({type:authMethod,action:"out"});
              }} disabled={myStatus!=="출근중"} style={{...S.btn(myStatus!=="출근중"?"#cbd5e1":"#dc2626"),padding:"18px",fontSize:15,display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:myStatus!=="출근중"?"not-allowed":"pointer"}}>
                <span style={{fontSize:24}}>🔴</span> 퇴근하기
              </button>
            </div>

            {/* 주간 현황 */}
            <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>이번 주 근무 현황</div>
                <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8"}}>{totalWeekH}h / 40h</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"flex-end",height:80}}>
                {weekData.map((d,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{fontSize:9,color:"#64748b"}}>{d.h}h</div>
                    <div style={{width:"100%",background:"#f1f5f9",borderRadius:4,height:60,display:"flex",flexDirection:"column",justifyContent:"flex-end",overflow:"hidden"}}>
                      <div style={{background:d.h>=8?"#1d4ed8":"#f59e0b",height:`${(d.h/10)*100}%`,borderRadius:4,minHeight:d.h>0?3:0,transition:"height 0.4s"}}/>
                    </div>
                    <div style={{fontSize:10,color:"#64748b"}}>{d.day}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,height:6,borderRadius:3,background:"#e2e8f0"}}>
                <div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#1d4ed8,#3b82f6)",width:`${Math.min(totalWeekH/40*100,100)}%`,transition:"width 0.5s"}}/>
              </div>
            </div>

            {/* 근태 히스토리 */}
            <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginTop:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>출퇴근 기록</div>
                {attHistory.length>0&&<button onClick={async()=>{if(window.confirm("기록을 전체 삭제할까요?")) await set(ref(db,"attHistory"),null);}} style={{...S.btn("#ef4444"),padding:"4px 10px",fontSize:11}}>전체 삭제</button>}
              </div>
              {attHistory.length===0
                ? <div style={{textAlign:"center",color:"#94a3b8",padding:"20px 0",fontSize:12}}>아직 기록이 없어요</div>
                : attHistory.slice(0,20).map((r,i)=>(
                    <div key={r.firebaseKey||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                      <div>
                        <span style={{fontWeight:600,color:"#0f172a"}}>{r.name}</span>
                        <span style={{color:"#94a3b8",marginLeft:8}}>{r.date}</span>
                      </div>
                      <div style={{color:"#374151"}}>{r.checkIn||"—"} → {r.checkOut||"근무중"}</div>
                      <Badge status={r.status||"출근중"}/>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* 근태 관리 */}
        {subTab==="manage"&&(
          <div style={{...S.card}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>직원별 출퇴근 기록</div>
              <div style={{fontSize:11,color:"#64748b"}}>{formatDate(getTodayString())}</div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["직원","직무","출근","퇴근","주간근무","상태","관리"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attRecords.map(emp=>(
                  <tr key={emp.id} style={{borderTop:"1px solid #f1f5f9"}}>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13}}>{emp.name[0]}</div>
                        <span style={{fontWeight:600,fontSize:13,color:"#0f172a"}}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{padding:"12px 14px",fontSize:12,color:"#64748b"}}>{emp.role}</td>
                    <td style={{padding:"12px 14px",fontSize:12,fontWeight:600,color:emp.status==="지각"?"#dc2626":"#374151"}}>{emp.checkIn||"—"}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:"#374151"}}>{emp.checkOut||(emp.status==="휴가"?"휴가":"근무중")}</td>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#0f172a",marginBottom:3}}>{emp.weekHours}h</div>
                      <div style={{height:4,background:"#e2e8f0",borderRadius:2,width:70}}>
                        <div style={{height:"100%",background:"#1d4ed8",borderRadius:2,width:`${Math.min(emp.weekHours/40*100,100)}%`}}/>
                      </div>
                    </td>
                    <td style={{padding:"12px 14px"}}><Badge status={emp.status}/></td>
                    <td style={{padding:"12px 14px"}}>
                      <button onClick={()=>{setAttRecords(prev=>prev.map(e=>e.id===emp.id?{...e,checkIn:formatTimeShort(new Date()),status:"정상"}:e));showToast(`${emp.name} 출근 처리 완료`);}}
                        style={{...S.btn("#64748b"),padding:"5px 10px",fontSize:11}}>수정</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 휴가 신청 */}
        {subTab==="leave"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{...S.card,padding:20}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:16}}>휴가 신청</div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <label style={S.label}>휴가 유형</label>
                  <div style={{display:"flex",gap:6}}>
                    {["연차","반차","병가"].map(t=>(
                      <button key={t} onClick={()=>setLeaveForm(p=>({...p,type:t}))} style={{flex:1,padding:"9px",borderRadius:8,border:`1.5px solid ${leaveForm.type===t?"#1d4ed8":"#e2e8f0"}`,background:leaveForm.type===t?"#eff6ff":"white",color:leaveForm.type===t?"#1d4ed8":"#64748b",fontWeight:leaveForm.type===t?700:400,fontSize:12,cursor:"pointer"}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={S.label}>날짜</label>
                  <input type="date" value={leaveForm.date} onChange={e=>setLeaveForm(p=>({...p,date:e.target.value}))} style={S.input}/>
                </div>
                <div>
                  <label style={S.label}>사유</label>
                  <textarea value={leaveForm.reason} onChange={e=>setLeaveForm(p=>({...p,reason:e.target.value}))} placeholder="휴가 사유" rows={3} style={{...S.input,resize:"vertical"}}/>
                </div>
                <button onClick={()=>{
                  if(!leaveForm.date||!leaveForm.reason){showToast("날짜와 사유를 입력해주세요.","err");return;}
                  setLeaves(prev=>[...prev,{id:Date.now(),name:"나",...leaveForm,status:"대기"}]);
                  setLeaveForm({type:"연차",date:"",reason:""});
                  showToast("✅ 휴가 신청 완료!");
                }} style={{...S.btn(),width:"100%",padding:"11px"}}>신청하기</button>
              </div>
            </div>
            <div style={{...S.card,padding:20}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:16}}>신청 목록 (관리자)</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {leaves.map(l=>(
                  <div key={l.id} style={{padding:12,borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:12,color:"#0f172a"}}>{l.name} · {l.type}</div>
                        <div style={{fontSize:11,color:"#64748b"}}>{l.date}</div>
                        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{l.reason}</div>
                      </div>
                      <span style={S.tag(l.status==="승인"?"#16a34a":l.status==="반려"?"#dc2626":"#d97706", l.status==="승인"?"#f0fdf4":l.status==="반려"?"#fef2f2":"#fffbeb")}>{l.status}</span>
                    </div>
                    {l.status==="대기"&&(
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{setLeaves(p=>p.map(x=>x.id===l.id?{...x,status:"승인"}:x));showToast("✅ 승인됐어요!");}} style={{...S.btn("#16a34a"),flex:1,padding:"6px",fontSize:11}}>✅ 승인</button>
                        <button onClick={()=>{setLeaves(p=>p.map(x=>x.id===l.id?{...x,status:"반려"}:x));showToast("❌ 반려됐어요.","err");}} style={{...S.btn("#ef4444"),flex:1,padding:"6px",fontSize:11}}>❌ 반려</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 네비게이션 정의 ──
  const NAV = [
    { section:"dashboard", label:"대시보드",    icon:"🏠" },
    { section:"worker",    label:"업무 지침",    icon:"📝" },
    { section:"live",      label:"실시간 공유",  icon:"📡" },
    { section:"workerdo",  label:"업무 이행",    icon:"✅" },
    { section:"boss",      label:"대표 업무",    icon:"👔" },
    { section:"att",       label:"근태 관리",    icon:"🐝" },
    { section:"history",   label:"히스토리",     icon:"🗂️" },
  ];

  // ── 대시보드 ──
  function Dashboard() {
    const workerDone=liveDirective?.checks ? Object.values(liveDirective.checks).filter(Boolean).length : 0;
    const workerTotal=liveDirective?.result ? liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l)).length : 0;
    return (
      <div>
        {/* 환영 */}
        <div style={{background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",borderRadius:16,padding:"28px 28px",color:"white",marginBottom:20}}>
          <div style={{fontSize:13,opacity:0.7}}>{formatDate(getTodayString())}</div>
          <div style={{fontSize:22,fontWeight:800,marginTop:4,marginBottom:4}}>안녕하세요, 백송 대표님 👋</div>
          <div style={{fontSize:13,opacity:0.8}}>오늘도 젠틀모먼츠 화이팅입니다!</div>
        </div>

        {/* 요약 카드 4개 */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
          {[
            {label:"직원 출근",value:`${attRecords.filter(r=>r.checkIn&&r.status!=="휴가").length}명`,icon:"🟢",color:"#16a34a",bg:"#f0fdf4"},
            {label:"지각",value:`${attRecords.filter(r=>r.status==="지각").length}명`,icon:"🔴",color:"#dc2626",bg:"#fef2f2"},
            {label:"휴가",value:`${attRecords.filter(r=>r.status==="휴가").length}명`,icon:"🟡",color:"#d97706",bg:"#fffbeb"},
            {label:"업무 진행률",value:`${workerTotal>0?Math.round(workerDone/workerTotal*100):0}%`,icon:"📋",color:"#1d4ed8",bg:"#eff6ff"},
          ].map((c,i)=>(
            <div key={i} style={{background:"white",borderRadius:12,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
              <div style={{fontSize:24,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:24,fontWeight:800,color:c.color,lineHeight:1}}>{c.value}</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{c.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {/* 직원 현황 */}
          <div style={{background:"white",borderRadius:12,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12}}>오늘의 직원 현황</div>
            {attRecords.map(emp=>(
              <div key={emp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f1f5f9"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13,flexShrink:0}}>{emp.name[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{emp.name}</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{emp.role}</div>
                </div>
                <div style={{fontSize:11,color:"#64748b",marginRight:6}}>{emp.checkIn||"—"}</div>
                <Badge status={emp.status}/>
              </div>
            ))}
          </div>

          {/* 바로가기 */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {label:"업무 지침 생성",desc:"오늘 직원 업무 배분하기",icon:"📝",sec:"worker"},
              {label:"실시간 공유 확인",desc:"직원 진행 상황 모니터링",icon:"📡",sec:"live"},
              {label:"근태 기록",desc:"출퇴근 체크",icon:"🐝",sec:"att"},
              {label:"대표 업무",desc:"나의 오늘 업무 관리",icon:"👔",sec:"boss"},
            ].map((b,i)=>(
              <button key={i} onClick={()=>setSection(b.sec)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"white",borderRadius:10,border:"none",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.08)",textAlign:"left",transition:"all 0.15s"}}>
                <span style={{fontSize:20}}>{b.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>{b.label}</div>
                  <div style={{fontSize:10,color:"#64748b"}}>{b.desc}</div>
                </div>
                <span style={{color:"#94a3b8",fontSize:13}}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 레이아웃 ──
  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'Noto Sans KR',-apple-system,sans-serif",background:"#f1f5f9",overflow:"hidden"}}>

      {/* 사이드바 */}
      <div style={{width:sideOpen?220:60,background:"#0f172a",display:"flex",flexDirection:"column",flexShrink:0,transition:"width 0.2s",overflow:"hidden"}}>
        {/* 로고 */}
        <div style={{padding:"20px 16px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          {sideOpen&&<div><div style={{fontSize:16,fontWeight:800,color:"white"}}>📸 젠틀모먼츠</div><div style={{fontSize:10,color:"#475569",marginTop:2}}>업무·근태 관리 시스템</div></div>}
          <button onClick={()=>setSideOpen(o=>!o)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16,flexShrink:0,padding:4}}>☰</button>
        </div>

        {/* 메뉴 */}
        <div style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>
          {NAV.map(n=>(
            <button key={n.section} onClick={()=>setSection(n.section)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 10px",borderRadius:8,border:"none",marginBottom:2,cursor:"pointer",textAlign:"left",background:section===n.section?"#1d4ed8":"transparent",color:section===n.section?"white":"#94a3b8",fontWeight:section===n.section?700:400,fontSize:12,transition:"all 0.15s",whiteSpace:"nowrap",overflow:"hidden"}}>
              <span style={{fontSize:16,flexShrink:0}}>{n.icon}</span>
              {sideOpen&&<span>{n.label}</span>}
            </button>
          ))}
        </div>

        {/* 프로필 */}
        {sideOpen&&(
          <div style={{padding:"14px 16px",borderTop:"1px solid #1e293b",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13,flexShrink:0}}>대</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:"white",whiteSpace:"nowrap"}}>백송 대표</div>
              <div style={{fontSize:10,color:"#475569"}}>관리자</div>
            </div>
          </div>
        )}
      </div>

      {/* 메인 영역 */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* 상단바 */}
        <div style={{height:56,background:"white",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{NAV.find(n=>n.section===section)?.label}</div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{fontSize:12,color:"#64748b"}}>{formatDate(getTodayString())}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1d4ed8",fontVariantNumeric:"tabular-nums"}}>{formatTime(now)}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:myStatus==="출근중"?"#eff6ff":myStatus==="퇴근"?"#f5f3ff":"#f8fafc",border:`1px solid ${myStatus==="출근중"?"#93c5fd":myStatus==="퇴근"?"#c4b5fd":"#e2e8f0"}`}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:myStatus==="출근중"?"#2563eb":myStatus==="퇴근"?"#7c3aed":"#94a3b8"}}/>
              <span style={{fontSize:11,fontWeight:600,color:myStatus==="출근중"?"#2563eb":myStatus==="퇴근"?"#7c3aed":"#64748b"}}>{myStatus}</span>
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{flex:1,overflow:"auto",padding:24}}>

          {section==="dashboard" && <Dashboard/>}

          {/* 업무 지침 */}
          {section==="worker" && (
            <div style={{maxWidth:680}}>
              {/* 날짜 */}
              <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <label style={S.label}>📅 날짜</label>
                  <button onClick={()=>setWDate(getTodayString())} style={{...S.btn(wDate===getTodayString()?"#1d4ed8":"#f1f5f9"),color:wDate===getTodayString()?"white":"#64748b",padding:"4px 10px",fontSize:11}}>오늘</button>
                </div>
                <input type="date" value={wDate} onChange={e=>setWDate(e.target.value)} style={S.input}/>
                <div style={{marginTop:5,fontSize:11,color:"#94a3b8"}}>📌 {formatDate(wDate)}</div>
              </div>

              <WorkSelector templates={wTemplates} optTab={wOptTab} setOptTab={setWOptTab} selected={wSelected} toggleTemplate={wToggleTemplate} toggleOption={wToggleOption} optMemos={wOptMemos} setOptMemos={setWOptMemos} priority={wPriority} setPriority={setWPriority}/>

              <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
                <label style={S.label}>📝 추가 메모</label>
                <textarea value={wMemo} onChange={e=>setWMemo(e.target.value)} placeholder="특이사항 입력" rows={3} style={{...S.input,resize:"vertical"}}/>
              </div>

              <button onClick={handleWGenerate} disabled={wPriority.length===0||wSaving} style={{...S.btn(wPriority.length===0?"#cbd5e1":"#1d4ed8"),width:"100%",padding:14,fontSize:15,marginBottom:10,cursor:wPriority.length===0?"not-allowed":"pointer"}}>
                {wSaving?"⏳ 저장 중...":wPriority.length===0?"⬆️ 업무를 먼저 선택해 주세요":"✨ 업무 지침서 생성 및 저장"}
              </button>

              {wSaveOk&&<div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#16a34a",fontWeight:600,textAlign:"center"}}>✅ 저장 완료! 직원 화면에 실시간 반영됐어요 📡</div>}

              {wResult&&(
                <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>📋 생성된 업무 지침서</span>
                    <button onClick={()=>{navigator.clipboard.writeText(wResult);setWCopied(true);setTimeout(()=>setWCopied(false),2000);}} style={{...S.btn(wCopied?"#16a34a":"#1d4ed8"),padding:"5px 12px",fontSize:11}}>{wCopied?"✅ 복사됨":"📋 복사"}</button>
                  </div>
                  <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:14,fontSize:12,lineHeight:1.8,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{wResult}</pre>
                  <ChecklistCard result={wResult} checklist={wChecklist} setChecklist={setWChecklist} themeColor="#1d4ed8" onFirebase={async(n)=>{ if(liveDirective?.firebaseKey) await set(ref(db,`history/${liveDirective.firebaseKey}/checks`),n); await set(ref(db,"live/checks"),n); }}/>
                </div>
              )}
            </div>
          )}

          {/* 실시간 공유 */}
          {section==="live" && (
            <div style={{maxWidth:680}}>
              <div style={{background:"#eff6ff",border:"1px solid #93c5fd",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:12,color:"#1d4ed8",fontWeight:600}}>
                📡 대표님이 지침서를 생성하면 이 화면에 즉시 반영돼요 · 직원 체크 현황 및 내일 메모 실시간 확인
              </div>
              {liveDirective ? (
                <div style={{background:"white",borderRadius:12,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{formatDate(liveDirective.date)}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {liveDirective.orderChanged&&<span style={{fontSize:11,background:"#fffbeb",color:"#d97706",border:"1px solid #fcd34d",borderRadius:6,padding:"3px 8px",fontWeight:700}}>🔄 직원이 순서 변경함</span>}
                      <span style={{fontSize:11,color:"#16a34a",fontWeight:600}}>● 최신</span>
                    </div>
                  </div>
                  <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:14,fontSize:12,lineHeight:1.8,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{liveDirective.result}</pre>
                  {liveDirective.checks&&(()=>{
                    const total=Object.keys(liveDirective.checks).length;
                    const done=Object.values(liveDirective.checks).filter(Boolean).length;
                    return total>0?(
                      <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"#f0fdf4",border:"1px solid #86efac"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#16a34a",marginBottom:6}}>✅ 직원 진행률: {done}/{total} ({Math.round(done/total*100)}%)</div>
                        <div style={{height:6,borderRadius:3,background:"#dcfce7"}}>
                          <div style={{height:"100%",borderRadius:3,background:"#16a34a",width:`${done/total*100}%`,transition:"width 0.4s"}}/>
                        </div>
                      </div>
                    ):null;
                  })()}
                  {liveDirective.tomorrowNote&&(
                    <div style={{marginTop:10,padding:"10px 14px",borderRadius:8,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:12,color:"#92400e"}}>
                      <div style={{fontWeight:700,marginBottom:4}}>📝 직원의 내일 할 일 메모</div>
                      <pre style={{whiteSpace:"pre-wrap",margin:0,lineHeight:1.6}}>{liveDirective.tomorrowNote}</pre>
                    </div>
                  )}
                </div>
              ):(
                <div style={{background:"white",borderRadius:12,padding:"48px 24px",textAlign:"center",color:"#94a3b8",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                  📭 아직 공유된 업무 지침이 없어요.
                </div>
              )}
            </div>
          )}

          {/* 업무 이행 */}
          {section==="workerdo" && <WorkerTab liveDirective={liveDirective} db={db}/>}

          {/* 대표 업무 */}
          {section==="boss" && (
            <div style={{maxWidth:680}}>
              <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <label style={S.label}>📅 날짜</label>
                  <button onClick={()=>setBDate(getTodayString())} style={{...S.btn(bDate===getTodayString()?"#7c3aed":"#f1f5f9"),color:bDate===getTodayString()?"white":"#64748b",padding:"4px 10px",fontSize:11}}>오늘</button>
                </div>
                <input type="date" value={bDate} onChange={e=>setBDate(e.target.value)} style={S.input}/>
                <div style={{marginTop:5,fontSize:11,color:"#94a3b8"}}>📌 {formatDate(bDate)}</div>
              </div>

              <WorkSelector templates={bTemplates} optTab={bOptTab} setOptTab={setBOptTab} selected={bSelected} toggleTemplate={bToggleTemplate} toggleOption={bToggleOption} optMemos={bOptMemos} setOptMemos={setBOptMemos} priority={bPriority} setPriority={setBPriority} accentColor="#7c3aed"/>

              <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
                <label style={S.label}>📝 추가 메모</label>
                <textarea value={bMemo} onChange={e=>setBMemo(e.target.value)} placeholder="특이사항 입력" rows={3} style={{...S.input,resize:"vertical"}}/>
              </div>

              <button onClick={handleBGenerate} disabled={bPriority.length===0||bSaving} style={{...S.btn(bPriority.length===0?"#cbd5e1":"#7c3aed"),width:"100%",padding:14,fontSize:15,marginBottom:10,cursor:bPriority.length===0?"not-allowed":"pointer"}}>
                {bSaving?"⏳ 저장 중...":bPriority.length===0?"⬆️ 업무를 먼저 선택해 주세요":"✨ 대표 업무 지침서 생성 및 저장"}
              </button>

              {bSaveOk&&<div style={{background:"#f5f3ff",border:"1px solid #c4b5fd",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#7c3aed",fontWeight:600,textAlign:"center"}}>✅ 저장 완료! 히스토리에 기록됐어요</div>}

              {bResult&&(
                <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>👔 대표 업무 지침서</span>
                    <button onClick={()=>{navigator.clipboard.writeText(bResult);setBCopied(true);setTimeout(()=>setBCopied(false),2000);}} style={{...S.btn(bCopied?"#16a34a":"#7c3aed"),padding:"5px 12px",fontSize:11}}>{bCopied?"✅ 복사됨":"📋 복사"}</button>
                  </div>
                  <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:14,fontSize:12,lineHeight:1.8,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{bResult}</pre>
                  <ChecklistCard result={bResult} checklist={bChecklist} setChecklist={setBChecklist} themeColor="#7c3aed" onFirebase={async(n)=>{ if(bossHistory[0]?.firebaseKey) await set(ref(db,`bossHistory/${bossHistory[0].firebaseKey}/checks`),n); }}/>
                </div>
              )}

              {/* 업무 노트 */}
              <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                <label style={{...S.label,color:"#7c3aed"}}>📝 업무 노트 (자동 저장)</label>
                <textarea value={bNote} onChange={async e=>{setBNote(e.target.value);await set(ref(db,"bossNote"),e.target.value);}} placeholder={"이번 주 목요일 단체 촬영 예약 확인\n쿠팡 정산 날짜 체크\n릴스 15초 이하로 제작 요청"} rows={6} style={{...S.input,resize:"vertical",lineHeight:1.8}}/>
              </div>
            </div>
          )}

          {/* 근태 관리 */}
          {section==="att" && <AttTab/>}

          {/* 히스토리 */}
          {section==="history" && (
            <div>
              {/* 직원 업무 히스토리 */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>📝 직원 업무 지침 히스토리</div>
                {history.length>0&&<button onClick={async()=>{if(window.confirm("직원 히스토리 전체 삭제?")) await set(ref(db,"history"),null);}} style={{...S.btn("#ef4444"),padding:"5px 12px",fontSize:11}}>🗑️ 전체 삭제</button>}
              </div>
              {history.length===0
                ? <div style={{background:"white",borderRadius:10,padding:"32px",textAlign:"center",color:"#94a3b8",fontSize:13,marginBottom:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>직원 업무 지침 히스토리가 없어요.</div>
                : <div style={{marginBottom:24}}>{history.map(h=>(
                    <HistCard key={h.firebaseKey||h.id} item={h} themeColor="#1d4ed8"
                      onDelete={async key=>{ await remove(ref(db,`history/${key}`)); }}
                      onLoad={item=>{setWDate(item.date);setWMemo(item.memo||"");setWPriority(item.priority||[]);setWOptMemos(item.optionMemos||{});const tids=[...new Set((item.priority||[]).map(id=>OPTION_BY_ID[id]?.tid).filter(Boolean))];setWTemplates(tids);setWOptTab(tids[0]||null);setWSelected(new Set(item.priority||[]));setWResult(item.result||"");setSection("worker");}}
                      onCheck={async(key,n)=>{ await set(ref(db,`history/${key}/checks`),n); }}
                    />
                  ))}</div>
              }

              {/* 대표 업무 히스토리 */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:"#7c3aed"}}>👔 대표 업무 히스토리</div>
                {bossHistory.length>0&&<button onClick={async()=>{if(window.confirm("대표 업무 히스토리 전체 삭제?")) await set(ref(db,"bossHistory"),null);}} style={{...S.btn("#ef4444"),padding:"5px 12px",fontSize:11}}>🗑️ 전체 삭제</button>}
              </div>
              {bossHistory.length===0
                ? <div style={{background:"white",borderRadius:10,padding:"32px",textAlign:"center",color:"#94a3b8",fontSize:13,marginBottom:24,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>대표 업무 히스토리가 없어요.</div>
                : <div style={{marginBottom:24}}>{bossHistory.map(h=>(
                    <HistCard key={h.firebaseKey||h.id} item={h} themeColor="#7c3aed"
                      onDelete={async key=>{ await remove(ref(db,`bossHistory/${key}`)); }}
                      onLoad={item=>{setBDate(item.date);setBMemo(item.memo||"");setBPriority(item.priority||[]);setBOptMemos(item.optionMemos||{});const tids=[...new Set((item.priority||[]).map(id=>OPTION_BY_ID[id]?.tid).filter(Boolean))];setBTemplates(tids);setBOptTab(tids[0]||null);setBSelected(new Set(item.priority||[]));setBResult(item.result||"");setBChecklist(item.checks||{});setSection("boss");}}
                      onCheck={async(key,n)=>{ await set(ref(db,`bossHistory/${key}/checks`),n); }}
                    />
                  ))}</div>
              }

              {/* 근태 히스토리 */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>🐝 근태 기록 히스토리</div>
                {attHistory.length>0&&<button onClick={async()=>{if(window.confirm("근태 기록 전체 삭제?")) await set(ref(db,"attHistory"),null);}} style={{...S.btn("#ef4444"),padding:"5px 12px",fontSize:11}}>🗑️ 전체 삭제</button>}
              </div>
              {attHistory.length===0
                ? <div style={{background:"white",borderRadius:10,padding:"32px",textAlign:"center",color:"#94a3b8",fontSize:13,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>근태 기록이 없어요.</div>
                : <div style={{...S.card}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead>
                        <tr style={{background:"#f8fafc"}}>
                          {["이름","날짜","출근","퇴근","상태"].map(h=>(
                            <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attHistory.map((r,i)=>(
                          <tr key={r.firebaseKey||i} style={{borderTop:"1px solid #f1f5f9"}}>
                            <td style={{padding:"10px 14px",fontSize:12,fontWeight:600,color:"#0f172a"}}>{r.name}</td>
                            <td style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>{r.date}</td>
                            <td style={{padding:"10px 14px",fontSize:12,color:"#374151"}}>{r.checkIn||"—"}</td>
                            <td style={{padding:"10px 14px",fontSize:12,color:"#374151"}}>{r.checkOut||"—"}</td>
                            <td style={{padding:"10px 14px"}}><Badge status={r.status||"출근중"}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          )}
        </div>
      </div>

      {/* 인증 모달 */}
      {authModal&&<AuthModal type={authModal.type} action={authModal.action} onClose={()=>setAuthModal(null)} onSuccess={()=>{ authModal.action==="in"?doCheckIn():doCheckOut(); }}/>}

      {/* 토스트 */}
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-track{background:#f1f5f9;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;} button:active{transform:scale(0.98);}`}</style>
    </div>
  );
}

// ── 업무 이행 탭 ─────────────────────────────────────────
function WorkerTab({liveDirective,db}) {
  const [localOrder,setLocalOrder]=useState(null);
  const [orderChanged,setOrderChanged]=useState(false);

  useEffect(()=>{
    if(liveDirective?.result){
      const raw=liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l));
      if(liveDirective.workerOrder) setLocalOrder(liveDirective.workerOrder);
      else setLocalOrder(p=>p||raw);
    }
  },[liveDirective]);

  if(!liveDirective||!localOrder) return (
    <div style={{background:"white",borderRadius:12,padding:"48px 24px",textAlign:"center",color:"#94a3b8",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
      📭 아직 공유된 업무 지침이 없어요.<br/><span style={{fontSize:12,marginTop:6,display:"block"}}>대표님이 지침서를 생성하면 여기에 나타나요!</span>
    </div>
  );

  const checks=liveDirective.checks||{};
  const tomorrowNote=liveDirective.tomorrowNote||"";
  const done=Object.values(checks).filter(Boolean).length;

  const moveItem=async(idx,dir)=>{
    const n=[...localOrder],s=idx+dir;
    if(s<0||s>=n.length) return;
    [n[idx],n[s]]=[n[s],n[idx]];
    setLocalOrder(n); setOrderChanged(true);
    await set(ref(db,"live/orderChanged"),true);
    await set(ref(db,"live/workerOrder"),n);
  };

  const resetOrder=async()=>{
    const raw=liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l));
    setLocalOrder(raw); setOrderChanged(false);
    await set(ref(db,"live/orderChanged"),false);
    await set(ref(db,"live/workerOrder"),null);
  };

  const toggleCheck=async(i)=>{
    const n={...checks,[i]:!checks[i]};
    await set(ref(db,"live/checks"),n);
    if(liveDirective.firebaseKey) await set(ref(db,`history/${liveDirective.firebaseKey}/checks`),n);
  };

  function formatDate2(dateStr){
    if(!dateStr) return "";
    const d=new Date(dateStr+"T00:00:00");
    const days=["일","월","화","수","목","금","토"];
    return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  }

  return (
    <div style={{maxWidth:600}}>
      <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#16a34a",fontWeight:600}}>
        ✅ 체크와 순서 변경이 대표님께 실시간 공유돼요 · 완료 내용은 히스토리에 저장돼요
      </div>

      <div style={{background:"white",borderRadius:12,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{formatDate2(liveDirective.date)}</div>
            <div style={{fontSize:12,color:"#16a34a",fontWeight:600,marginTop:2}}>완료 {done}/{localOrder.length}</div>
          </div>
          {orderChanged&&<button onClick={resetOrder} style={{padding:"5px 10px",border:"1px solid #e2e8f0",borderRadius:6,background:"white",fontSize:11,color:"#64748b",cursor:"pointer"}}>순서 원래대로</button>}
        </div>

        {orderChanged&&<div style={{padding:"8px 12px",borderRadius:8,background:"#fffbeb",border:"1px solid #fcd34d",marginBottom:12,fontSize:12,color:"#d97706",fontWeight:600}}>🔄 순서를 변경했어요 — 대표님께 알림이 전송됐어요</div>}

        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {localOrder.map((item,i)=>{
            const isChecked=!!checks[i];
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,background:isChecked?"#f0fdf4":"#f8fafc",border:`1px solid ${isChecked?"#86efac":"#e2e8f0"}`,transition:"all 0.2s"}}>
                <input type="checkbox" checked={isChecked} onChange={()=>toggleCheck(i)} style={{accentColor:"#16a34a",width:17,height:17,flexShrink:0,cursor:"pointer"}}/>
                <span style={{minWidth:22,height:22,borderRadius:"50%",background:isChecked?"#16a34a":"#cbd5e1",color:"white",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                <span style={{flex:1,fontSize:12,color:isChecked?"#16a34a":"#374151",textDecoration:isChecked?"line-through":"none"}}>{item}</span>
                <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                  <button onClick={()=>moveItem(i,-1)} disabled={i===0} style={{padding:"2px 6px",border:"1px solid #e2e8f0",borderRadius:3,background:i===0?"#f8fafc":"white",cursor:i===0?"not-allowed":"pointer",fontSize:9,color:"#64748b"}}>▲</button>
                  <button onClick={()=>moveItem(i,1)} disabled={i===localOrder.length-1} style={{padding:"2px 6px",border:"1px solid #e2e8f0",borderRadius:3,background:i===localOrder.length-1?"#f8fafc":"white",cursor:i===localOrder.length-1?"not-allowed":"pointer",fontSize:9,color:"#64748b"}}>▼</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 진행바 */}
        <div style={{marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4}}>
            <span>오늘의 진행률</span>
            <span style={{color:"#16a34a",fontWeight:700}}>{localOrder.length>0?Math.round(done/localOrder.length*100):0}%</span>
          </div>
          <div style={{height:7,borderRadius:4,background:"#e2e8f0"}}>
            <div style={{height:"100%",borderRadius:4,background:"linear-gradient(90deg,#16a34a,#22c55e)",width:`${localOrder.length>0?done/localOrder.length*100:0}%`,transition:"width 0.4s"}}/>
          </div>
        </div>
      </div>

      {/* 내일 메모 */}
      <div style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
        <label style={{fontSize:12,fontWeight:700,color:"#d97706",display:"block",marginBottom:8}}>
          📝 내일 할 일 메모 <span style={{fontSize:10,color:"#94a3b8",fontWeight:400}}>(오늘 못한 일이나 내일 챙길 것)</span>
        </label>
        <textarea value={tomorrowNote}
          onChange={async e=>{
            await set(ref(db,"live/tomorrowNote"),e.target.value);
            if(liveDirective.firebaseKey) await set(ref(db,`history/${liveDirective.firebaseKey}/tomorrowNote`),e.target.value);
          }}
          placeholder={"예:\n• 릴스 편집 마무리 필요\n• 쿠팡 물품 등록 3개 남음"}
          rows={5} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.7}}/>
        {tomorrowNote&&<div style={{marginTop:5,fontSize:11,color:"#16a34a",fontWeight:600}}>✅ 저장됨 — 대표님도 실시간 확인 가능해요</div>}
      </div>
    </div>
  );
}
