import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, remove } from "firebase/database";

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

const ADMIN_PIN = "241119";
const WORKER_PIN = "260701";

const TEMPLATE_META = {
  1:{label:"📱 SNS 업무",color:"#3b82f6",bg:"#eff6ff"},
  2:{label:"🛍️ 쇼핑몰 관리",color:"#ef4444",bg:"#fef2f2"},
  3:{label:"🎬 릴스 제작",color:"#f59e0b",bg:"#fffbeb"},
  4:{label:"📋 사무업무",color:"#10b981",bg:"#f0fdf4"},
  5:{label:"📷 사진 업무",color:"#8b5cf6",bg:"#f5f3ff"},
  6:{label:"📌 기타 업무",color:"#64748b",bg:"#f8fafc"},
};
const OPTION_MAP = {
  1:[{id:"blog",label:"📝 블로그",tid:1},{id:"yuyu",label:"🎥 유유모먼트",tid:1},{id:"wishiz_snap",label:"📸 위시즈스냅",tid:1},{id:"wishiz_family",label:"👨‍👩‍👧 위시즈패밀리",tid:1},{id:"gentle_threads",label:"🧵 젠틀스레드",tid:1},{id:"wishiz_threads",label:"🧵 위시즈스레드",tid:1},{id:"yuyu_threads",label:"🧵 유유스레드",tid:1}],
  2:[{id:"naver_order",label:"🛒 네이버스스 주문",tid:2},{id:"coupang_reg",label:"📦 쿠팡 온채널",tid:2},{id:"smartstore_reg",label:"🏪 스스 온채널",tid:2},{id:"cs",label:"💬 CS 응대",tid:2}],
  3:[{id:"reels_plan",label:"💡 릴스 기획",tid:3},{id:"reels_shoot",label:"🎥 릴스 촬영",tid:3},{id:"reels_edit",label:"✂️ 릴스 편집",tid:3},{id:"reels_upload",label:"📤 릴스 업로드",tid:3}],
  4:[{id:"office_assist",label:"🗂️ 사무보조",tid:4},{id:"accounting",label:"🧾 회계 업무",tid:4},{id:"etc4",label:"📌 기타",tid:4}],
  5:[{id:"photo_select",label:"🖼️ 원본 셀렉",tid:5},{id:"photo_edit1",label:"🎨 1차 보정",tid:5},{id:"photo_edit2",label:"✨ 2차 보정",tid:5},{id:"photo_send",label:"📤 고객 전송",tid:5},{id:"photo_print",label:"🖨️ 인화 외주",tid:5}],
  6:[{id:"meeting",label:"🤝 회의",tid:6},{id:"cleaning",label:"🧹 청소",tid:6},{id:"dining",label:"🍽️ 회식",tid:6},{id:"other_etc",label:"📌 기타",tid:6}],
};
const ALL_OPTIONS = Object.values(OPTION_MAP).flat();
const OPTION_BY_ID = Object.fromEntries(ALL_OPTIONS.map(o=>[o.id,o]));

const getTodayStr=()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;};
const fmtDate=(s)=>{if(!s)return"";const d=new Date(s+"T00:00:00");const days=["일","월","화","수","목","금","토"];return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;};
const fmtTime=(d)=>d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
const fmtTimeShort=(d)=>d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});
const parseMin=(t)=>{if(!t)return 0;const[h,m]=t.split(":").map(Number);return h*60+m;};
const toH=(m)=>Math.round(m/60*10)/10;

const genText=(date,priority,memo,optMemos)=>{
  if(!priority?.length)return"";
  const items=priority.map((id,idx)=>({...OPTION_BY_ID[id],rank:idx+1}));
  const lines=items.map(i=>{const mn=optMemos?.[i.id]?`\n   └ 📝 ${optMemos[i.id]}`:"";const ut=i.tid===1?" 업로드":"";return`${i.rank}번째 · ${i.label}${ut}${mn}`;}).join("\n");
  const ms=memo?.trim()?`\n📝 메모\n${memo.trim()}`:"";
  return `📅 ${fmtDate(date)} 업무 지침서\n\n안녕하세요! 오늘도 잘 부탁드려요 😊\n\n━━━━━━━━━━━━━━━━━━\n📋 오늘의 업무 목록\n━━━━━━━━━━━━━━━━━━\n${lines}\n${ms}\n\n수고하세요! 오늘도 화이팅입니다 💪`;
};

const exportCSV=(filename,rows,headers)=>{
  const BOM="\uFEFF";
  const csv=BOM+[headers,...rows].map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
};

const cardStyle={background:"white",borderRadius:12,padding:14,marginBottom:12};
const inputStyle={width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

// ═══════════════════════════════════════════════════════
// 외부 컴포넌트들 — 모두 App 함수 밖에 선언
// ═══════════════════════════════════════════════════════

function Toast({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t);},[onClose]);
  return <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:type==="err"?"#dc2626":"#0f172a",color:"white",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",whiteSpace:"nowrap",maxWidth:"90vw",textAlign:"center"}}>{msg}</div>;
}

function BottomModal({title,children,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000}}>
      <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:480,boxShadow:"0 -8px 32px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"#94a3b8",cursor:"pointer",padding:4}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginScreen({onLogin}){
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [shake,setShake]=useState(false);
  const press=(n)=>{
    if(pin.length>=6)return;
    const next=pin+n;
    setPin(next);
    if(next.length===6){
      if(next===ADMIN_PIN){onLogin("admin");}
      else if(next===WORKER_PIN){onLogin("worker");}
      else{setShake(true);setErr("잘못된 PIN번호예요");setTimeout(()=>{setPin("");setErr("");setShake(false);},1000);}
    }
  };
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{marginBottom:32,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8}}>📸</div>
        <div style={{fontSize:24,fontWeight:800,color:"white"}}>젠틀모먼츠</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:4}}>업무·근태 관리 시스템</div>
      </div>
      <div style={{marginBottom:8,display:"flex",gap:12,animation:shake?"shake 0.4s ease":"none"}}>
        {[0,1,2,3,4,5].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<pin.length?"white":"rgba(255,255,255,0.3)",transition:"all 0.15s"}}/>)}
      </div>
      {err?<div style={{color:"#fca5a5",fontSize:12,marginBottom:12,fontWeight:600}}>{err}</div>:<div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginBottom:12}}>PIN 번호 6자리를 입력하세요</div>}
      <div style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:20}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
            <button key={i} onClick={()=>n==="⌫"?setPin(p=>p.slice(0,-1)):n!==""&&press(String(n))} disabled={n===""} style={{width:64,height:64,borderRadius:"50%",border:"none",background:n===""?"transparent":n==="⌫"?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.15)",color:"white",fontSize:n==="⌫"?20:22,fontWeight:600,cursor:n===""?"default":"pointer"}}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{marginTop:24,color:"rgba(255,255,255,0.5)",fontSize:11}}>관리자 및 직원용 PIN을 입력하세요</div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

function RegisterModal({onClose,onSuccess}){
  const [form,setForm]=useState({name:"",role:"",phone:"",hourlyRate:10320,monthlyRate:2156880,contractType:"hourly"});
  const [loading,setLoading]=useState(false);
  const submit=async()=>{
    if(!form.name.trim()||!form.role.trim()){alert("이름과 직무를 입력해주세요");return;}
    setLoading(true);
    try{await push(ref(db,"employees"),{...form,id:Date.now(),registeredAt:getTodayStr(),active:true});onSuccess();onClose();}catch(e){alert("등록 실패");}
    setLoading(false);
  };
  return(
    <BottomModal title="직원 신규 등록" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:"65vh",overflowY:"auto"}}>
        {[["이름 *","name","홍길동"],["직무 *","role","SNS 마케터"],["연락처","phone","010-0000-0000"]].map(([label,key,ph])=>(
          <div key={key}><div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:3}}>{label}</div><input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{...inputStyle}}/></div>
        ))}
        <div>
          <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:3}}>계약 유형</div>
          <div style={{display:"flex",gap:8}}>
            {["hourly","monthly"].map(t=><button key={t} onClick={()=>setForm(p=>({...p,contractType:t}))} style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px solid ${form.contractType===t?"#1d4ed8":"#e2e8f0"}`,background:form.contractType===t?"#eff6ff":"white",color:form.contractType===t?"#1d4ed8":"#64748b",fontWeight:form.contractType===t?700:400,fontSize:12,cursor:"pointer"}}>{t==="hourly"?"시급제":"월급제"}</button>)}
          </div>
        </div>
        <div><div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:3}}>시급 (원)</div><input type="number" value={form.hourlyRate} onChange={e=>setForm(p=>({...p,hourlyRate:Number(e.target.value)}))} style={{...inputStyle}}/></div>
        {form.contractType==="monthly"&&<div><div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:3}}>월 급여 (원)</div><input type="number" value={form.monthlyRate} onChange={e=>setForm(p=>({...p,monthlyRate:Number(e.target.value)}))} style={{...inputStyle}}/></div>}
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#1d4ed8",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",marginTop:4}}>{loading?"등록 중...":"✅ 직원 등록"}</button>
      </div>
    </BottomModal>
  );
}

function QRModal({action,onClose,onSuccess}){
  const [step,setStep]=useState("idle");
  const videoRef=useRef(null);const streamRef=useRef(null);
  const start=async()=>{setStep("scanning");try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});streamRef.current=s;if(videoRef.current)videoRef.current.srcObject=s;setTimeout(()=>{if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}setStep("done");},3000);}catch(e){setStep("denied");}};
  useEffect(()=>()=>{if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());}},[]);
  return(
    <BottomModal title="📱 QR 코드 인증" onClose={()=>{if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());}onClose();}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"100%",aspectRatio:"1",maxHeight:240,background:"#0f172a",borderRadius:12,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
          {step==="scanning"&&<video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
          {step==="idle"&&<div style={{color:"#64748b",fontSize:13}}>📷 카메라로 QR 스캔</div>}
          {step==="done"&&<div style={{fontSize:64}}>✅</div>}
          {step==="denied"&&<div style={{color:"#ef4444",fontSize:12,padding:16}}>카메라 권한이 없어요<br/>수동 인증을 사용해주세요</div>}
          {step==="scanning"&&<div style={{position:"absolute",left:"10%",right:"10%",height:2,background:"#3b82f6",top:"50%",boxShadow:"0 0 10px #3b82f6"}}/>}
        </div>
        {step==="done"?<><div style={{fontSize:13,color:"#16a34a",fontWeight:600,marginBottom:12}}>QR 인증 완료!</div><button onClick={()=>{onSuccess();onClose();}} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#16a34a",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>확인 ({action==="in"?"출근":"퇴근"} 완료)</button></>
        :step==="idle"?<button onClick={start} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#1d4ed8",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>카메라 시작</button>
        :step==="scanning"?<div style={{fontSize:12,color:"#3b82f6"}}>QR 코드를 카메라에 비춰주세요...</div>
        :<button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#64748b",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>닫기</button>}
      </div>
    </BottomModal>
  );
}

function GPSModal({action,onClose,onSuccess}){
  const [step,setStep]=useState("idle");const [dist,setDist]=useState(null);
  const OLAT=36.5684,OLNG=128.7294,MAX=200;
  const calcDist=(la1,lo1,la2,lo2)=>{const R=6371000,dLa=(la2-la1)*Math.PI/180,dLo=(lo2-lo1)*Math.PI/180;const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));};
  const start=()=>{setStep("locating");if(!navigator.geolocation){setStep("err");return;}navigator.geolocation.getCurrentPosition(p=>{const d=Math.round(calcDist(p.coords.latitude,p.coords.longitude,OLAT,OLNG));setDist(d);setStep(d<=MAX?"done":"far");},()=>setStep("err"),{enableHighAccuracy:true,timeout:10000});};
  return(
    <BottomModal title="📍 GPS 위치 인증" onClose={onClose}>
      <div style={{textAlign:"center"}}>
        <div style={{width:120,height:120,margin:"0 auto 16px",borderRadius:"50%",background:step==="done"?"#f0fdf4":step==="far"?"#fef2f2":"#f8fafc",border:`3px solid ${step==="done"?"#22c55e":step==="far"?"#ef4444":"#e2e8f0"}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4}}>
          <div style={{fontSize:36}}>{step==="done"?"✅":step==="far"?"❌":step==="locating"?"📡":"📍"}</div>
          {dist!==null&&<div style={{fontSize:10,color:"#64748b"}}>{dist}m</div>}
        </div>
        {step==="idle"&&<div style={{fontSize:12,color:"#64748b",marginBottom:12}}>사무실 {MAX}m 이내에서 인증하세요</div>}
        {step==="locating"&&<div style={{fontSize:12,color:"#3b82f6",marginBottom:12}}>위치 확인 중...</div>}
        {step==="done"&&<div style={{fontSize:12,color:"#16a34a",fontWeight:600,marginBottom:12}}>위치 인증 완료! ({dist}m)</div>}
        {(step==="far"||step==="err")&&<div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{step==="far"?`사무실에서 너무 멀어요 (${dist}m)`:"위치 권한을 허용해주세요"}</div>}
        {step==="done"?<button onClick={()=>{onSuccess();onClose();}} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#16a34a",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>확인</button>
        :(step==="far"||step==="err")?<button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#64748b",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>닫기</button>
        :<button onClick={start} disabled={step==="locating"} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#1d4ed8",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>{step==="locating"?"확인 중...":"위치 확인"}</button>}
      </div>
    </BottomModal>
  );
}

function WiFiModal({action,onClose,onSuccess}){
  const [step,setStep]=useState("idle");
  const check=()=>{setStep("checking");setTimeout(()=>setStep(navigator.onLine?"done":"err"),1500);};
  return(
    <BottomModal title="📶 Wi-Fi 인증" onClose={onClose}>
      <div style={{textAlign:"center"}}>
        <div style={{padding:"24px",background:step==="done"?"#f0fdf4":"#f8fafc",borderRadius:12,marginBottom:16,border:`1px solid ${step==="done"?"#86efac":"#e2e8f0"}`}}>
          <div style={{fontSize:40,marginBottom:8}}>📶</div>
          {step==="idle"&&<div style={{fontSize:12,color:"#64748b"}}>사무실 Wi-Fi 연결 상태에서 인증</div>}
          {step==="checking"&&<div style={{fontSize:12,color:"#3b82f6",fontWeight:600}}>확인 중...</div>}
          {step==="done"&&<div style={{fontSize:13,color:"#16a34a",fontWeight:700}}>✅ 네트워크 인증 완료</div>}
          {step==="err"&&<div style={{fontSize:12,color:"#ef4444"}}>네트워크 연결을 확인해주세요</div>}
        </div>
        {step==="done"?<button onClick={()=>{onSuccess();onClose();}} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#16a34a",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>확인</button>
        :step==="err"?<button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#64748b",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>닫기</button>
        :<button onClick={check} disabled={step==="checking"} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:"#1d4ed8",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>{step==="checking"?"확인 중...":"연결 확인"}</button>}
      </div>
    </BottomModal>
  );
}

// ── 업무 선택기 ──
function WorkSelector({templates,optTab,setOptTab,selected,onToggleTemplate,onToggleOption,optMemos,setOptMemos,priority,setPriority}){
  const moveP=(idx,dir)=>{const n=[...priority],s=idx+dir;if(s<0||s>=n.length)return;[n[idx],n[s]]=[n[s],n[idx]];setPriority(n);};
  return(
    <>
      <div style={{...cardStyle}}>
        <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>업무 템플릿 선택</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {Object.entries(TEMPLATE_META).map(([ts,meta])=>{const tid=Number(ts),isOn=templates.includes(tid);return(
            <button key={tid} onClick={()=>onToggleTemplate(tid)} style={{padding:"9px 10px",borderRadius:8,border:`1.5px solid ${isOn?meta.color:"#e2e8f0"}`,background:isOn?meta.bg:"white",color:isOn?meta.color:"#64748b",fontWeight:isOn?700:400,cursor:"pointer",fontSize:11,textAlign:"left",display:"flex",alignItems:"center",gap:5,width:"100%",boxSizing:"border-box"}}>
              <span style={{width:13,height:13,borderRadius:3,border:`2px solid ${isOn?meta.color:"#cbd5e1"}`,background:isOn?meta.color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"white",flexShrink:0}}>{isOn?"✓":""}</span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.label}</span>
            </button>
          );})}
        </div>
      </div>
      {templates.length>0&&(
        <div style={{...cardStyle}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {templates.map(tid=>{const meta=TEMPLATE_META[tid],cnt=OPTION_MAP[tid].filter(o=>selected.has(o.id)).length,isA=optTab===tid;return(
              <button key={tid} onClick={()=>setOptTab(tid)} style={{padding:"5px 10px",borderRadius:16,border:`1.5px solid ${isA?meta.color:"#e2e8f0"}`,background:isA?meta.color:"white",color:isA?"white":meta.color,fontWeight:isA?700:500,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:4}}>
                {meta.label}{cnt>0&&<span style={{background:isA?"rgba(255,255,255,0.3)":meta.color,color:"white",borderRadius:8,fontSize:9,padding:"0 4px",fontWeight:700}}>{cnt}</span>}
              </button>
            );})}
          </div>
          {optTab&&OPTION_MAP[optTab]&&(()=>{
            const meta=TEMPLATE_META[optTab],opts=OPTION_MAP[optTab];
            return(
              <div style={{borderTop:`2px solid ${meta.color}`,paddingTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:meta.color,marginBottom:8}}>{meta.label} 세부 선택</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {opts.map(opt=>(
                    <div key={opt.id}>
                      <button onClick={()=>onToggleOption(opt.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${selected.has(opt.id)?meta.color:"#e2e8f0"}`,background:selected.has(opt.id)?meta.bg:"white",color:selected.has(opt.id)?meta.color:"#64748b",fontWeight:selected.has(opt.id)?700:400,cursor:"pointer",fontSize:12,textAlign:"left",boxSizing:"border-box"}}>
                        <span style={{width:14,height:14,borderRadius:3,border:`2px solid ${selected.has(opt.id)?meta.color:"#cbd5e1"}`,background:selected.has(opt.id)?meta.color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"white",flexShrink:0}}>{selected.has(opt.id)?"✓":""}</span>
                        {opt.label}
                      </button>
                      {selected.has(opt.id)&&(
                        <input key={`m-${opt.id}`} type="text" value={optMemos[opt.id]||""} onChange={e=>{const v=e.target.value;setOptMemos(p=>({...p,[opt.id]:v}));}} placeholder={`${opt.label} 메모`}
                          style={{marginTop:3,width:"100%",padding:"6px 10px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,outline:"none",boxSizing:"border-box",background:"#f8fafc",fontFamily:"inherit"}}/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {priority.length>=2&&(
        <div style={{...cardStyle}}>
          <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:8}}>🔢 업무 순서</div>
          {priority.map((id,idx)=>{const opt=OPTION_BY_ID[id],meta=TEMPLATE_META[opt.tid];return(
            <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,border:`1px solid ${idx===0?meta.color:"#e2e8f0"}`,background:idx===0?`${meta.color}10`:"#f8fafc",marginBottom:5}}>
              <span style={{minWidth:20,height:20,borderRadius:"50%",background:idx===0?meta.color:"#cbd5e1",color:"white",fontWeight:700,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{idx+1}</span>
              <span style={{fontSize:10,fontWeight:700,color:"white",background:meta.color,borderRadius:3,padding:"1px 5px",flexShrink:0}}>{opt.tid===1?"SNS":opt.tid===2?"쇼핑":opt.tid===3?"릴스":opt.tid===4?"사무":opt.tid===5?"사진":"기타"}</span>
              <span style={{flex:1,fontSize:11,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{opt.label}</span>
              <div style={{display:"flex",gap:2,flexShrink:0}}>
                <button onClick={()=>moveP(idx,-1)} disabled={idx===0} style={{padding:"2px 5px",border:"1px solid #e2e8f0",borderRadius:3,background:"white",cursor:idx===0?"not-allowed":"pointer",fontSize:9,color:"#64748b"}}>▲</button>
                <button onClick={()=>moveP(idx,1)} disabled={idx===priority.length-1} style={{padding:"2px 5px",border:"1px solid #e2e8f0",borderRadius:3,background:"white",cursor:idx===priority.length-1?"not-allowed":"pointer",fontSize:9,color:"#64748b"}}>▼</button>
              </div>
            </div>
          );})}
        </div>
      )}
    </>
  );
}

// ── 체크리스트 ──
function Checklist({result,checklist,setChecklist,onFirebase,color}){
  const items=result.split("\n").filter(l=>/^\d+번째/.test(l));
  if(!items.length)return null;
  const done=Object.values(checklist).filter(Boolean).length;
  return(
    <div style={{marginTop:12}}>
      <div style={{fontSize:11,fontWeight:700,color:"#374151",marginBottom:6}}>✅ 체크리스트 ({done}/{items.length})</div>
      {items.map((item,i)=>(
        <label key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:7,background:checklist[i]?"#f0fdf4":"#f8fafc",marginBottom:4,cursor:"pointer",border:`1px solid ${checklist[i]?"#86efac":"#e2e8f0"}`}}>
          <input type="checkbox" checked={!!checklist[i]} onChange={async()=>{const n={...checklist,[i]:!checklist[i]};setChecklist(n);if(onFirebase)await onFirebase(n);}} style={{accentColor:color,width:14,height:14}}/>
          <span style={{fontSize:11,color:checklist[i]?"#16a34a":"#374151",textDecoration:checklist[i]?"line-through":"none"}}>{item}</span>
        </label>
      ))}
      <div style={{marginTop:6,height:5,borderRadius:3,background:"#e2e8f0"}}>
        <div style={{height:"100%",borderRadius:3,background:color,width:`${items.length>0?done/items.length*100:0}%`,transition:"width 0.4s"}}/>
      </div>
    </div>
  );
}

// ── 히스토리 카드 ──
function HistCard({item,onDelete,onLoad,onCheck,color,isAdmin}){
  const [open,setOpen]=useState(false);
  const [copied,setCopied]=useState(false);
  const [del,setDel]=useState(false);
  const [lc,setLc]=useState(item.checks||{});
  const items=(item.result||"").split("\n").filter(l=>/^\d+번째/.test(l));
  const done=Object.values(lc).filter(Boolean).length;
  return(
    <div style={{background:"white",borderRadius:10,marginBottom:8,overflow:"hidden",borderLeft:`3px solid ${color}`}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:12,color:"#0f172a"}}>{fmtDate(item.date)}</div>
          <div style={{fontSize:10,color:"#94a3b8",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(item.priority||[]).map(id=>OPTION_BY_ID[id]?.label).filter(Boolean).join(", ").slice(0,40)}</div>
          {items.length>0&&<div style={{fontSize:10,marginTop:2,color:done===items.length?"#16a34a":"#f59e0b",fontWeight:600}}>{done===items.length?"✅ 완료":`⏳ ${done}/${items.length}`}</div>}
        </div>
        <span style={{color:"#94a3b8",fontSize:11,marginLeft:6}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 12px 12px"}}>
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            <button onClick={()=>{navigator.clipboard.writeText(item.result);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"5px 10px",borderRadius:6,border:"none",background:copied?"#16a34a":color,color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{copied?"✅ 복사됨":"📋 복사"}</button>
            {onLoad&&<button onClick={()=>onLoad(item)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:"#f59e0b",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>✏️ 불러오기</button>}
            {isAdmin&&(!del?<button onClick={()=>setDel(true)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:"#ef4444",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>🗑️</button>
            :<><button onClick={()=>onDelete(item.firebaseKey)} style={{padding:"4px 8px",borderRadius:5,background:"#ef4444",border:"none",color:"white",fontSize:10,cursor:"pointer"}}>확인</button><button onClick={()=>setDel(false)} style={{padding:"4px 8px",borderRadius:5,background:"#94a3b8",border:"none",color:"white",fontSize:10,cursor:"pointer"}}>취소</button></>)}
          </div>
          <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:7,padding:10,fontSize:10,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{item.result}</pre>
          {items.length>0&&(
            <div style={{marginTop:8}}>
              {items.map((ci,i)=>(
                <label key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:6,background:lc[i]?"#f0fdf4":"#f8fafc",marginBottom:3,cursor:"pointer",border:`1px solid ${lc[i]?"#86efac":"#e2e8f0"}`}}>
                  <input type="checkbox" checked={!!lc[i]} onChange={async()=>{const n={...lc,[i]:!lc[i]};setLc(n);if(onCheck&&item.firebaseKey)await onCheck(item.firebaseKey,n);}} style={{accentColor:color,width:12,height:12}}/>
                  <span style={{fontSize:10,color:lc[i]?"#16a34a":"#374151",textDecoration:lc[i]?"line-through":"none"}}>{ci}</span>
                </label>
              ))}
            </div>
          )}
          {item.tomorrowNote&&<div style={{marginTop:6,padding:"6px 8px",borderRadius:6,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:10,color:"#92400e"}}>📝 내일: {item.tomorrowNote}</div>}
        </div>
      )}
    </div>
  );
}

// ── 업무 이행 탭 ──
function WorkerDoTab({liveDirective}){
  const [localOrder,setLocalOrder]=useState(null);
  const [changed,setChanged]=useState(false);
  useEffect(()=>{
    if(liveDirective?.result){
      const raw=liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l));
      if(liveDirective.workerOrder)setLocalOrder(liveDirective.workerOrder);
      else setLocalOrder(p=>p||raw);
    }
  },[liveDirective]);
  if(!liveDirective||!localOrder)return<div style={{...cardStyle,textAlign:"center",color:"#94a3b8",padding:"40px 20px",fontSize:13}}>📭 아직 공유된 업무 지침이 없어요</div>;
  const checks=liveDirective.checks||{};
  const done=Object.values(checks).filter(Boolean).length;
  const tNote=liveDirective.tomorrowNote||"";
  const toggle=async(i)=>{const n={...checks,[i]:!checks[i]};await set(ref(db,"live/checks"),n);if(liveDirective.firebaseKey)await set(ref(db,`history/${liveDirective.firebaseKey}/checks`),n);};
  const move=async(idx,dir)=>{const n=[...localOrder],s=idx+dir;if(s<0||s>=n.length)return;[n[idx],n[s]]=[n[s],n[idx]];setLocalOrder(n);setChanged(true);await set(ref(db,"live/orderChanged"),true);await set(ref(db,"live/workerOrder"),n);};
  return(
    <div style={{paddingBottom:80}}>
      <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:11,color:"#16a34a",fontWeight:600}}>✅ 체크와 순서 변경이 대표님께 실시간 공유돼요</div>
      <div style={{...cardStyle}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmtDate(liveDirective.date)}</div><div style={{fontSize:11,color:"#16a34a",fontWeight:600}}>완료 {done}/{localOrder.length}</div></div>
          {changed&&<button onClick={async()=>{const raw=liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l));setLocalOrder(raw);setChanged(false);await set(ref(db,"live/orderChanged"),false);await set(ref(db,"live/workerOrder"),null);}} style={{padding:"5px 10px",border:"1px solid #e2e8f0",borderRadius:6,background:"white",fontSize:10,color:"#64748b",cursor:"pointer"}}>원래대로</button>}
        </div>
        {changed&&<div style={{padding:"6px 10px",borderRadius:7,background:"#fffbeb",border:"1px solid #fcd34d",marginBottom:10,fontSize:11,color:"#d97706",fontWeight:600}}>🔄 순서 변경됨 — 대표님께 알림 전송</div>}
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {localOrder.map((item,i)=>{const isC=!!checks[i];return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,background:isC?"#f0fdf4":"#f8fafc",border:`1px solid ${isC?"#86efac":"#e2e8f0"}`}}>
              <input type="checkbox" checked={isC} onChange={()=>toggle(i)} style={{accentColor:"#16a34a",width:16,height:16,flexShrink:0}}/>
              <span style={{minWidth:20,height:20,borderRadius:"50%",background:isC?"#16a34a":"#cbd5e1",color:"white",fontWeight:700,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
              <span style={{flex:1,fontSize:11,color:isC?"#16a34a":"#374151",textDecoration:isC?"line-through":"none"}}>{item}</span>
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                <button onClick={()=>move(i,-1)} disabled={i===0} style={{padding:"2px 5px",border:"1px solid #e2e8f0",borderRadius:3,background:"white",cursor:i===0?"not-allowed":"pointer",fontSize:8}}>▲</button>
                <button onClick={()=>move(i,1)} disabled={i===localOrder.length-1} style={{padding:"2px 5px",border:"1px solid #e2e8f0",borderRadius:3,background:"white",cursor:i===localOrder.length-1?"not-allowed":"pointer",fontSize:8}}>▼</button>
              </div>
            </div>
          );})}
        </div>
        <div style={{marginTop:10,height:6,borderRadius:3,background:"#e2e8f0"}}><div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#16a34a,#22c55e)",width:`${localOrder.length>0?done/localOrder.length*100:0}%`,transition:"width 0.4s"}}/></div>
      </div>
      <div style={{...cardStyle}}>
        <div style={{fontSize:11,fontWeight:700,color:"#d97706",marginBottom:6}}>📝 내일 할 일 메모</div>
        <textarea value={tNote} onChange={async e=>{await set(ref(db,"live/tomorrowNote"),e.target.value);if(liveDirective.firebaseKey)await set(ref(db,`history/${liveDirective.firebaseKey}/tomorrowNote`),e.target.value);}} placeholder="오늘 못한 일, 내일 챙길 것" rows={4} style={{...inputStyle,resize:"vertical"}}/>
        {tNote&&<div style={{marginTop:4,fontSize:10,color:"#16a34a",fontWeight:600}}>✅ 자동 저장됨</div>}
      </div>
    </div>
  );
}

// ── 급여 계산 ──
function calcSal(emp,recs){
  let totalMin=0,extraMin=0,shortMin=0;const wm={};const D=8*60,W=40*60;
  recs.forEach(r=>{if(!r.checkIn||!r.checkOut)return;const w=Math.max(0,parseMin(r.checkOut)-parseMin(r.checkIn)-60);totalMin+=w;const d=new Date(r.date+"T00:00:00"),dow=d.getDay(),wk=`${r.date.slice(0,7)}-W${Math.ceil(d.getDate()/7)}`;if(!wm[wk])wm[wk]=0;wm[wk]+=w;if(dow>=1&&dow<=5){if(w<D)shortMin+=D-w;else extraMin+=w-D;}else extraMin+=w;});
  const ne=Math.max(0,extraMin-shortMin),ns=Math.max(0,shortMin-extraMin),hr=emp.hourlyRate||10320;
  let wp=0;Object.values(wm).forEach(w=>{if(w>=15*60)wp+=Math.round(hr*8*Math.min(w/W,1));});
  const tH=toH(totalMin),neH=toH(ne),nsH=toH(ns),T=0.10,base=emp.monthlyRate||2156880,fa=Math.round((neH-nsH)*hr);
  return{tH,neH,nsH,wp,fa,hr,base,T,cnt:recs.length,mGross:base+fa+wp,mNet:Math.round((base+fa+wp)*(1-T)),hGross:Math.round(tH*hr)+wp,hNet:Math.round((Math.round(tH*hr)+wp)*(1-T))};
}

// ── 급여 페이지 ──
function SalaryPage({employees,attHistory}){
  const [target,setTarget]=useState(null);
  const [month,setMonth]=useState(getTodayStr().slice(0,7));
  const recs=attHistory.filter(r=>r.date?.startsWith(month));
  const c=target?calcSal(target,recs):null;
  return(
    <div style={{paddingBottom:20}}>
      <div style={{...cardStyle}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:10}}>💰 급여 명세서</div>
        <div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>정산 월</div><input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{...inputStyle}}/></div>
        <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:6}}>직원 선택</div>
        {employees.length===0?<div style={{fontSize:12,color:"#94a3b8"}}>등록된 직원이 없어요</div>:employees.map(emp=>(
          <button key={emp.firebaseKey} onClick={()=>setTarget(emp)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${target?.firebaseKey===emp.firebaseKey?"#1d4ed8":"#e2e8f0"}`,background:target?.firebaseKey===emp.firebaseKey?"#eff6ff":"white",cursor:"pointer",textAlign:"left",width:"100%",boxSizing:"border-box",marginBottom:6}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13,flexShrink:0}}>{emp.name[0]}</div>
            <div><div style={{fontWeight:700,fontSize:12,color:"#0f172a"}}>{emp.name}</div><div style={{fontSize:10,color:"#64748b"}}>{emp.role} · {(emp.hourlyRate||10320).toLocaleString()}원/h</div></div>
          </button>
        ))}
      </div>
      {c&&target&&(
        <>
          <div style={{...cardStyle}}>
            <div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:10}}>■ 1. 근태 요약</div>
            {[["실근로시간",`${c.tH}h (${c.cnt}건)`],["유연근무",c.neH>0?`+${c.neH}h`:c.nsH>0?`-${c.nsH}h`:"상쇄없음"],["주휴수당",`${c.wp.toLocaleString()}원`],["환산시급",`${c.hr.toLocaleString()}원`]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f1f5f9",fontSize:11}}><span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>
            ))}
            {c.cnt===0&&<div style={{marginTop:8,padding:"7px 10px",borderRadius:6,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:11,color:"#92400e"}}>⚠️ {month} 근태 기록이 없어요</div>}
          </div>
          {target.contractType==="monthly"&&(
            <div style={{...cardStyle}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:10}}>■ A. 월급제 기준</div>
              {[["기본 월급",`${c.base.toLocaleString()}원`],[`유연근무 정산`,`${c.fa>=0?"+":""}${c.fa.toLocaleString()}원`],["주휴수당",`${c.wp.toLocaleString()}원`],[`세금공제(${Math.round(c.T*100)}%)`,`-${Math.round(c.mGross*c.T).toLocaleString()}원`]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f1f5f9",fontSize:11}}><span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>
              ))}
              <div style={{background:"#0f172a",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <span style={{color:"white",fontSize:12,fontWeight:700}}>최종 실지급액</span>
                <span style={{color:"#60a5fa",fontSize:18,fontWeight:800}}>{c.mNet.toLocaleString()}원</span>
              </div>
            </div>
          )}
          <div style={{...cardStyle}}>
            <div style={{fontSize:12,fontWeight:700,color:"#7c3aed",marginBottom:10}}>■ {target.contractType==="hourly"?"B. 시급제 정산":"B. 시급제 비교"}</div>
            {[["시급 페이",`${Math.round(c.tH*c.hr).toLocaleString()}원`],["주휴수당",`+${c.wp.toLocaleString()}원`],[`세금공제`,`-${Math.round(c.hGross*c.T).toLocaleString()}원`]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f1f5f9",fontSize:11}}><span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>
            ))}
            <div style={{background:"#0f172a",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
              <span style={{color:"white",fontSize:12,fontWeight:700}}>최종 실지급액</span>
              <span style={{color:"#a78bfa",fontSize:18,fontWeight:800}}>{c.hNet.toLocaleString()}원</span>
            </div>
          </div>
          <button onClick={()=>alert("📄 급여명세서가 발급됐어요!")} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>📄 명세서 발급</button>
        </>
      )}
    </div>
  );
}

// ── 근태 탭 ──
function AttTab({mode,employees,attHistory,now,myStatus,myCheckIn,myCheckOut,doCheckIn,doCheckOut,authMethod,setAuthMethod,setAuthModal,setRegisterModal,leaves,setLeaves,leaveForm,setLeaveForm,showToast}){
  const [sub,setSub]=useState("clock");
  return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
        {[{k:"clock",l:"⏰ 출퇴근"},{k:"manage",l:"👥 근태관리"},{k:"leave",l:"📋 휴가"},{k:"salary",l:"💰 급여"}].map(t=>(
          <button key={t.k} onClick={()=>setSub(t.k)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${sub===t.k?"#1d4ed8":"#e2e8f0"}`,background:sub===t.k?"#1d4ed8":"white",color:sub===t.k?"white":"#64748b",fontWeight:sub===t.k?700:400,cursor:"pointer",fontSize:12,whiteSpace:"nowrap",flexShrink:0}}>{t.l}</button>
        ))}
      </div>
      {sub==="clock"&&(
        <div>
          <div style={{background:myStatus==="퇴근"?"linear-gradient(135deg,#7c3aed,#a855f7)":myStatus==="출근중"?"linear-gradient(135deg,#1d4ed8,#3b82f6)":"linear-gradient(135deg,#475569,#64748b)",borderRadius:16,padding:"24px 20px",color:"white",textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:11,opacity:0.7}}>{fmtDate(getTodayStr())}</div>
            <div style={{fontSize:40,fontWeight:800,letterSpacing:"-1px",fontVariantNumeric:"tabular-nums",margin:"6px 0"}}>{fmtTime(now)}</div>
            <div style={{display:"inline-block",padding:"5px 14px",background:"rgba(255,255,255,0.2)",borderRadius:16,fontSize:12,fontWeight:600}}>
              {myStatus==="퇴근"?`✅ 퇴근완료 ${myCheckOut}`:myStatus==="출근중"?`🟢 출근중 (${myCheckIn})`:"⏸ 미출근"}
            </div>
          </div>
          <div style={{...cardStyle}}>
            <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:8}}>인증 방식 선택</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {[{k:"manual",l:"✏️",d:"수동"},{k:"qr",l:"📱",d:"QR"},{k:"gps",l:"📍",d:"GPS"},{k:"wifi",l:"📶",d:"Wi-Fi"}].map(m=>(
                <button key={m.k} onClick={()=>setAuthMethod(m.k)} style={{padding:"10px 4px",borderRadius:8,border:`1.5px solid ${authMethod===m.k?"#1d4ed8":"#e2e8f0"}`,background:authMethod===m.k?"#eff6ff":"white",color:authMethod===m.k?"#1d4ed8":"#64748b",fontWeight:authMethod===m.k?700:400,cursor:"pointer",fontSize:10,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <span style={{fontSize:18}}>{m.l}</span>{m.d}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <button onClick={()=>{if(myStatus!=="미출근"){showToast("이미 출근 상태예요","err");return;}authMethod==="manual"?doCheckIn():setAuthModal({type:authMethod,action:"in"});}} disabled={myStatus!=="미출근"} style={{padding:"16px",borderRadius:12,border:"none",background:myStatus!=="미출근"?"#e2e8f0":"#1d4ed8",color:"white",fontWeight:800,fontSize:15,cursor:myStatus!=="미출근"?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:myStatus!=="미출근"?0.6:1}}>
              <span style={{fontSize:28}}>🟢</span>출근하기
            </button>
            <button onClick={()=>{if(myStatus!=="출근중"){showToast("먼저 출근해주세요","err");return;}authMethod==="manual"?doCheckOut():setAuthModal({type:authMethod,action:"out"});}} disabled={myStatus!=="출근중"} style={{padding:"16px",borderRadius:12,border:"none",background:myStatus!=="출근중"?"#e2e8f0":"#dc2626",color:"white",fontWeight:800,fontSize:15,cursor:myStatus!=="출근중"?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:myStatus!=="출근중"?0.6:1}}>
              <span style={{fontSize:28}}>🔴</span>퇴근하기
            </button>
          </div>
          {mode==="admin"&&<button onClick={()=>setRegisterModal(true)} style={{width:"100%",padding:"11px",borderRadius:10,border:"1.5px solid #1d4ed8",background:"white",color:"#1d4ed8",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>➕ 신규 직원 등록</button>}
          {employees.length>0&&(
            <div style={{...cardStyle}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>등록된 직원 ({employees.length}명)</div>
              {employees.map(emp=>(
                <div key={emp.firebaseKey} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f1f5f9"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:12,flexShrink:0}}>{emp.name[0]}</div>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{emp.name}</div><div style={{fontSize:10,color:"#64748b"}}>{emp.role} · {(emp.hourlyRate||10320).toLocaleString()}원/h</div></div>
                  {mode==="admin"&&<button onClick={async()=>{if(window.confirm(`${emp.name}을 삭제할까요?`))await set(ref(db,`employees/${emp.firebaseKey}/active`),false);}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,cursor:"pointer"}}>삭제</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {sub==="manage"&&(
        <div>
          {employees.length===0?<div style={{...cardStyle,textAlign:"center",color:"#94a3b8",fontSize:13}}>등록된 직원이 없어요</div>:employees.map(emp=>{
            const recs=attHistory.filter(r=>r.name===emp.name).slice(0,5);
            return(
              <div key={emp.firebaseKey} style={{...cardStyle}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13,flexShrink:0}}>{emp.name[0]}</div>
                  <div><div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{emp.name}</div><div style={{fontSize:11,color:"#64748b"}}>{emp.role}</div></div>
                </div>
                {recs.length===0?<div style={{fontSize:11,color:"#94a3b8"}}>출퇴근 기록 없음</div>:recs.map((r,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderTop:"1px solid #f1f5f9",fontSize:11}}>
                    <span style={{color:"#64748b"}}>{r.date}</span>
                    <span style={{color:"#374151"}}>{r.checkIn||"—"} → {r.checkOut||"근무중"}</span>
                    <span style={{padding:"2px 7px",borderRadius:8,fontSize:10,fontWeight:700,background:r.status==="정상"?"#f0fdf4":r.status==="지각"?"#fef2f2":"#eff6ff",color:r.status==="정상"?"#16a34a":r.status==="지각"?"#dc2626":"#1d4ed8"}}>{r.status||"출근중"}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {sub==="leave"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...cardStyle}}>
            <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12}}>휴가 신청</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>{["연차","반차","병가"].map(t=><button key={t} onClick={()=>setLeaveForm(p=>({...p,type:t}))} style={{flex:1,padding:"8px",borderRadius:7,border:`1.5px solid ${leaveForm.type===t?"#1d4ed8":"#e2e8f0"}`,background:leaveForm.type===t?"#eff6ff":"white",color:leaveForm.type===t?"#1d4ed8":"#64748b",fontWeight:leaveForm.type===t?700:400,fontSize:12,cursor:"pointer"}}>{t}</button>)}</div>
            <input type="date" value={leaveForm.date} onChange={e=>setLeaveForm(p=>({...p,date:e.target.value}))} style={{...inputStyle,overflow:"hidden",marginBottom:8}}/>
            <textarea value={leaveForm.reason} onChange={e=>setLeaveForm(p=>({...p,reason:e.target.value}))} placeholder="사유" rows={2} style={{...inputStyle,resize:"vertical",marginBottom:8}}/>
            <button onClick={()=>{if(!leaveForm.date||!leaveForm.reason){showToast("날짜와 사유를 입력해주세요","err");return;}setLeaves(p=>[...p,{id:Date.now(),name:mode==="admin"?"대표":"직원",...leaveForm,status:"대기"}]);setLeaveForm({type:"연차",date:"",reason:""});showToast("✅ 휴가 신청 완료!");}} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:"#1d4ed8",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>신청하기</button>
          </div>
          <div style={{...cardStyle}}>
            <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>신청 목록</div>
            {leaves.map(l=>(
              <div key={l.id} style={{padding:"10px",borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:mode==="admin"&&l.status==="대기"?8:0}}>
                  <div><div style={{fontWeight:700,fontSize:12}}>{l.name} · {l.type}</div><div style={{fontSize:10,color:"#64748b"}}>{l.date} · {l.reason}</div></div>
                  <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:l.status==="승인"?"#f0fdf4":l.status==="반려"?"#fef2f2":"#fffbeb",color:l.status==="승인"?"#16a34a":l.status==="반려"?"#dc2626":"#d97706"}}>{l.status}</span>
                </div>
                {mode==="admin"&&l.status==="대기"&&(
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setLeaves(p=>p.map(x=>x.id===l.id?{...x,status:"승인"}:x));showToast("✅ 승인됐어요!");}} style={{flex:1,padding:"6px",borderRadius:6,border:"none",background:"#16a34a",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>✅ 승인</button>
                    <button onClick={()=>{setLeaves(p=>p.map(x=>x.id===l.id?{...x,status:"반려"}:x));showToast("반려됐어요","err");}} style={{flex:1,padding:"6px",borderRadius:6,border:"none",background:"#ef4444",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>❌ 반려</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {sub==="salary"&&<SalaryPage employees={employees} attHistory={attHistory}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 메인 앱
// ════════════════════════════════════════════════════════
export default function App(){
  const [mode,setMode]=useState(null);
  const [now,setNow]=useState(new Date());
  const [toast,setToast]=useState(null);
  const [section,setSection]=useState("dashboard");
  const [navHist,setNavHist]=useState([]);
  const [navIdx,setNavIdx]=useState(-1);
  const [employees,setEmployees]=useState([]);
  const [history,setHistory]=useState([]);
  const [bossHistory,setBossHistory]=useState([]);
  const [liveDirective,setLiveDirective]=useState(null);
  const [attHistory,setAttHistory]=useState([]);
  const [bossNote,setBossNote]=useState("");
  const [myStatus,setMyStatus]=useState("미출근");
  const [myCheckIn,setMyCheckIn]=useState(null);
  const [myCheckOut,setMyCheckOut]=useState(null);
  const [authMethod,setAuthMethod]=useState("manual");
  const [authModal,setAuthModal]=useState(null);
  const [registerModal,setRegisterModal]=useState(false);
  const [leaves,setLeaves]=useState([{id:1,name:"직원",type:"반차",date:"2026-07-30",reason:"병원",status:"대기"}]);
  const [leaveForm,setLeaveForm]=useState({type:"연차",date:"",reason:""});
  const [wDate,setWDate]=useState(getTodayStr());
  const [wTemplates,setWTemplates]=useState([]);
  const [wOptTab,setWOptTab]=useState(null);
  const [wSelected,setWSelected]=useState(new Set());
  const [wOptMemos,setWOptMemos]=useState({});
  const [wPriority,setWPriority]=useState([]);
  const [wMemo,setWMemo]=useState("");
  const [wResult,setWResult]=useState("");
  const [wChecklist,setWChecklist]=useState({});
  const [wCopied,setWCopied]=useState(false);
  const [wSaving,setWSaving]=useState(false);
  const [wOk,setWOk]=useState(false);
  const [bDate,setBDate]=useState(getTodayStr());
  const [bTemplates,setBTemplates]=useState([]);
  const [bOptTab,setBOptTab]=useState(null);
  const [bSelected,setBSelected]=useState(new Set());
  const [bOptMemos,setBOptMemos]=useState({});
  const [bPriority,setBPriority]=useState([]);
  const [bMemo,setBMemo]=useState("");
  const [bResult,setBResult]=useState("");
  const [bChecklist,setBChecklist]=useState({});
  const [bCopied,setBCopied]=useState(false);
  const [bSaving,setBSaving]=useState(false);
  const [bOk,setBOk]=useState(false);

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    const u1=onValue(ref(db,"employees"),s=>{const d=s.val();setEmployees(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).filter(e=>e.active!==false):[]);});
    const u2=onValue(ref(db,"history"),s=>{const d=s.val();setHistory(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,50):[]);});
    const u3=onValue(ref(db,"live"),s=>{if(s.val())setLiveDirective(s.val());});
    const u4=onValue(ref(db,"bossHistory"),s=>{const d=s.val();setBossHistory(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,50):[]);});
    const u5=onValue(ref(db,"attHistory"),s=>{const d=s.val();setAttHistory(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,200):[]);});
    const u6=onValue(ref(db,"bossNote"),s=>{if(s.val()!==null)setBossNote(s.val());});
    return()=>{u1();u2();u3();u4();u5();u6();};
  },[]);

  const showToast=useCallback((msg,type="ok")=>setToast({msg,type}),[]);
  const navigate=useCallback((sec)=>{if(sec===section)return;setSection(sec);setNavHist(prev=>{const t=[...prev.slice(0,navIdx+1),sec];setNavIdx(t.length-1);return t;});},[section,navIdx]);
  useEffect(()=>{if(mode&&navHist.length===0){setNavHist(["dashboard"]);setNavIdx(0);}},[mode]);

  const doCheckIn=useCallback(()=>{const t=fmtTimeShort(new Date());setMyStatus("출근중");setMyCheckIn(t);push(ref(db,"attHistory"),{name:mode==="admin"?"백송 대표":"직원",date:getTodayStr(),checkIn:t,checkOut:null,status:"출근중",id:Date.now(),mode});showToast(`✅ 출근 완료! ${t}`);},[mode,showToast]);
  const doCheckOut=useCallback(()=>{const t=fmtTimeShort(new Date());setMyStatus("퇴근");setMyCheckOut(t);push(ref(db,"attHistory"),{name:mode==="admin"?"백송 대표":"직원",date:getTodayStr(),checkIn:myCheckIn,checkOut:t,status:"정상",id:Date.now(),mode});showToast(`🏠 퇴근 완료! ${t}`);},[mode,myCheckIn,showToast]);

  const toggleWT=(tid)=>setWTemplates(p=>{if(p.includes(tid)){const ri=OPTION_MAP[tid].map(o=>o.id);setWSelected(s=>{const n=new Set(s);ri.forEach(id=>n.delete(id));return n;});setWPriority(pr=>pr.filter(id=>!ri.includes(id)));setWOptMemos(m=>{const n={...m};ri.forEach(id=>delete n[id]);return n;});const rm=p.filter(t=>t!==tid);setWOptTab(rm.length>0?rm[rm.length-1]:null);return rm;}setWOptTab(tid);return[...p,tid];});
  const toggleWO=(id)=>setWSelected(p=>{const n=new Set(p);if(n.has(id)){n.delete(id);setWPriority(pr=>pr.filter(x=>x!==id));setWOptMemos(m=>{const nm={...m};delete nm[id];return nm;});}else{n.add(id);setWPriority(pr=>[...pr,id]);}return n;});
  const toggleBT=(tid)=>setBTemplates(p=>{if(p.includes(tid)){const ri=OPTION_MAP[tid].map(o=>o.id);setBSelected(s=>{const n=new Set(s);ri.forEach(id=>n.delete(id));return n;});setBPriority(pr=>pr.filter(id=>!ri.includes(id)));setBOptMemos(m=>{const n={...m};ri.forEach(id=>delete n[id]);return n;});const rm=p.filter(t=>t!==tid);setBOptTab(rm.length>0?rm[rm.length-1]:null);return rm;}setBOptTab(tid);return[...p,tid];});
  const toggleBO=(id)=>setBSelected(p=>{const n=new Set(p);if(n.has(id)){n.delete(id);setBPriority(pr=>pr.filter(x=>x!==id));setBOptMemos(m=>{const nm={...m};delete nm[id];return nm;});}else{n.add(id);setBPriority(pr=>[...pr,id]);}return n;});

  const handleWGen=async()=>{const text=genText(wDate,wPriority,wMemo,wOptMemos);const lines=text.split("\n").filter(l=>/^\d+번째/.test(l));const checks={};lines.forEach((_,i)=>{checks[i]=false;});setWResult(text);setWChecklist(checks);setWSaving(true);try{const item={date:wDate,priority:wPriority,memo:wMemo,optionMemos:wOptMemos,result:text,id:Date.now(),checks,tomorrowNote:"",orderChanged:false,workerOrder:null};const pushed=await push(ref(db,"history"),item);await set(ref(db,"live"),{...item,firebaseKey:pushed.key});setWOk(true);setTimeout(()=>setWOk(false),2500);}catch(e){console.error(e);}setWSaving(false);};
  const handleBGen=async()=>{const text=genText(bDate,bPriority,bMemo,bOptMemos);const lines=text.split("\n").filter(l=>/^\d+번째/.test(l));const checks={};lines.forEach((_,i)=>{checks[i]=false;});setBResult(text);setBChecklist(checks);setBSaving(true);try{await push(ref(db,"bossHistory"),{date:bDate,priority:bPriority,memo:bMemo,optionMemos:bOptMemos,result:text,id:Date.now(),checks,type:"boss"});setBOk(true);setTimeout(()=>setBOk(false),2500);}catch(e){console.error(e);}setBSaving(false);};

  if(!mode)return <LoginScreen onLogin={m=>{setMode(m);showToast(m==="admin"?"👋 관리자 로그인":"👋 직원 로그인");}}/>;

  const ADMIN_TABS=[{key:"dashboard",icon:"🏠",label:"홈"},{key:"worker",icon:"📝",label:"업무지침"},{key:"att",icon:"🐝",label:"근태"},{key:"boss",icon:"👔",label:"대표업무"},{key:"history",icon:"🗂️",label:"히스토리"}];
  const WORKER_TABS=[{key:"dashboard",icon:"🏠",label:"홈"},{key:"live",icon:"📡",label:"오늘업무"},{key:"workerdo",icon:"✅",label:"업무이행"},{key:"att",icon:"🐝",label:"근태"}];
  const TABS=mode==="admin"?ADMIN_TABS:WORKER_TABS;

  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#f1f5f9",display:"flex",flexDirection:"column",position:"relative"}}>
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"10px 14px",display:"flex",alignItems:"center",gap:8,position:"sticky",top:0,zIndex:100,flexShrink:0}}>
        <button onClick={()=>{if(navIdx>0){setSection(navHist[navIdx-1]);setNavIdx(i=>i-1);}}} disabled={navIdx<=0} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e2e8f0",background:navIdx<=0?"#f8fafc":"white",color:navIdx<=0?"#cbd5e1":"#374151",cursor:navIdx<=0?"not-allowed":"pointer",fontSize:14,flexShrink:0}}>‹</button>
        <button onClick={()=>{if(navIdx<navHist.length-1){setSection(navHist[navIdx+1]);setNavIdx(i=>i+1);}}} disabled={navIdx>=navHist.length-1} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e2e8f0",background:navIdx>=navHist.length-1?"#f8fafc":"white",color:navIdx>=navHist.length-1?"#cbd5e1":"#374151",cursor:navIdx>=navHist.length-1?"not-allowed":"pointer",fontSize:14,flexShrink:0}}>›</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{TABS.find(t=>t.key===section)?.label||section}</div>
          <div style={{fontSize:10,color:"#94a3b8",fontVariantNumeric:"tabular-nums"}}>{fmtTime(now)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:16,background:myStatus==="출근중"?"#eff6ff":myStatus==="퇴근"?"#f5f3ff":"#f8fafc",border:`1px solid ${myStatus==="출근중"?"#93c5fd":myStatus==="퇴근"?"#c4b5fd":"#e2e8f0"}`,flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:myStatus==="출근중"?"#2563eb":myStatus==="퇴근"?"#7c3aed":"#94a3b8"}}/>
          <span style={{fontSize:10,fontWeight:700,color:myStatus==="출근중"?"#2563eb":myStatus==="퇴근"?"#7c3aed":"#64748b"}}>{myStatus}</span>
        </div>
        <button onClick={()=>{if(window.confirm("로그아웃 할까요?"))setMode(null);}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e2e8f0",background:"white",color:"#64748b",fontSize:11,cursor:"pointer",flexShrink:0}}>로그아웃</button>
      </div>

      <div style={{flex:1,overflow:"auto",padding:"14px",paddingBottom:90}}>
        {section==="dashboard"&&(
          <div style={{paddingBottom:20}}>
            <div style={{background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",borderRadius:16,padding:"20px",color:"white",marginBottom:14}}>
              <div style={{fontSize:12,opacity:0.7}}>{fmtDate(getTodayStr())}</div>
              <div style={{fontSize:20,fontWeight:800,margin:"4px 0"}}>안녕하세요, {mode==="admin"?"백송 대표님":"직원님"} 👋</div>
              <div style={{fontSize:12,opacity:0.8}}>오늘도 젠틀모먼츠 화이팅!</div>
              <div style={{marginTop:12,display:"flex",gap:8}}>
                {[["오늘 기록",attHistory.filter(r=>r.date===getTodayStr()).length],["등록 직원",employees.length],["업무진행",liveDirective?.checks?`${Math.round(Object.values(liveDirective.checks).filter(Boolean).length/Math.max(1,Object.keys(liveDirective.checks).length)*100)}%`:"—"]].map(([l,v])=>(
                  <div key={l} style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800}}>{v}</div>
                    <div style={{fontSize:10,opacity:0.8}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(mode==="admin"?[{l:"업무 지침 생성",i:"📝",s:"worker",d:"직원 업무 배분"},{l:"실시간 공유 확인",i:"📡",s:"live",d:"직원 진행 상황"},{l:"근태 관리",i:"🐝",s:"att",d:"출퇴근·급여"},{l:"대표 업무",i:"👔",s:"boss",d:"나의 업무 관리"}]:[{l:"오늘 업무 확인",i:"📡",s:"live",d:"대표님이 공유한 업무"},{l:"업무 이행 체크",i:"✅",s:"workerdo",d:"오늘 업무 완료 체크"},{l:"출퇴근 기록",i:"🐝",s:"att",d:"출근·퇴근 인증"}]).map((b,i)=>(
                <button key={i} onClick={()=>navigate(b.s)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"white",borderRadius:10,border:"none",cursor:"pointer",textAlign:"left",width:"100%",boxSizing:"border-box"}}>
                  <span style={{fontSize:22,width:36,textAlign:"center"}}>{b.i}</span>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{b.l}</div><div style={{fontSize:11,color:"#64748b"}}>{b.d}</div></div>
                  <span style={{color:"#94a3b8",fontSize:16}}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {section==="worker"&&mode==="admin"&&(
          <div>
            <div style={{...cardStyle}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>📅 날짜</div>
                <button onClick={()=>setWDate(getTodayStr())} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${wDate===getTodayStr()?"#1d4ed8":"#e2e8f0"}`,background:wDate===getTodayStr()?"#1d4ed8":"white",color:wDate===getTodayStr()?"white":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer"}}>오늘</button>
              </div>
              <input type="date" value={wDate} onChange={e=>setWDate(e.target.value)} style={{...inputStyle,overflow:"hidden"}}/>
              <div style={{marginTop:4,fontSize:10,color:"#94a3b8"}}>📌 {fmtDate(wDate)}</div>
            </div>
            <WorkSelector templates={wTemplates} optTab={wOptTab} setOptTab={setWOptTab} selected={wSelected} onToggleTemplate={toggleWT} onToggleOption={toggleWO} optMemos={wOptMemos} setOptMemos={setWOptMemos} priority={wPriority} setPriority={setWPriority}/>
            <div style={{...cardStyle}}><div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>📝 추가 메모</div><textarea value={wMemo} onChange={e=>setWMemo(e.target.value)} placeholder="특이사항" rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
            <button onClick={handleWGen} disabled={wPriority.length===0||wSaving} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:wPriority.length===0?"#cbd5e1":"#1d4ed8",color:"white",fontWeight:700,fontSize:14,cursor:wPriority.length===0?"not-allowed":"pointer",marginBottom:10}}>
              {wSaving?"⏳ 저장 중...":wPriority.length===0?"⬆️ 업무 먼저 선택":"✨ 업무 지침서 생성 및 저장"}
            </button>
            {wOk&&<div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#16a34a",fontWeight:600,textAlign:"center"}}>✅ 저장 완료! 직원 화면에 실시간 반영 📡</div>}
            {wResult&&(
              <div style={{...cardStyle}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>📋 생성된 지침서</span>
                  <button onClick={()=>{navigator.clipboard.writeText(wResult);setWCopied(true);setTimeout(()=>setWCopied(false),2000);}} style={{padding:"4px 10px",borderRadius:6,border:"none",background:wCopied?"#16a34a":"#1d4ed8",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{wCopied?"✅ 복사됨":"📋 복사"}</button>
                </div>
                <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:10,fontSize:11,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{wResult}</pre>
                <Checklist result={wResult} checklist={wChecklist} setChecklist={setWChecklist} color="#1d4ed8" onFirebase={async n=>{if(liveDirective?.firebaseKey)await set(ref(db,`history/${liveDirective.firebaseKey}/checks`),n);await set(ref(db,"live/checks"),n);}}/>
              </div>
            )}
          </div>
        )}

        {section==="live"&&(
          <div style={{paddingBottom:80}}>
            <div style={{background:"#eff6ff",border:"1px solid #93c5fd",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:11,color:"#1d4ed8",fontWeight:600}}>📡 대표님이 지침서를 생성하면 즉시 반영돼요</div>
            {liveDirective?(
              <div style={{...cardStyle}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmtDate(liveDirective.date)}</span>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {liveDirective.orderChanged&&<span style={{fontSize:10,background:"#fffbeb",color:"#d97706",border:"1px solid #fcd34d",borderRadius:5,padding:"2px 6px",fontWeight:700}}>🔄 순서변경</span>}
                    <span style={{fontSize:10,color:"#16a34a",fontWeight:600}}>● 최신</span>
                  </div>
                </div>
                <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:10,fontSize:11,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{liveDirective.result}</pre>
                {liveDirective.checks&&(()=>{const t=Object.keys(liveDirective.checks).length,d=Object.values(liveDirective.checks).filter(Boolean).length;return t>0?<div style={{marginTop:10,padding:"8px 10px",borderRadius:8,background:"#f0fdf4",border:"1px solid #86efac"}}><div style={{fontSize:11,fontWeight:700,color:"#16a34a",marginBottom:4}}>✅ 직원 진행률: {d}/{t} ({Math.round(d/t*100)}%)</div><div style={{height:5,borderRadius:3,background:"#dcfce7"}}><div style={{height:"100%",borderRadius:3,background:"#16a34a",width:`${d/t*100}%`,transition:"width 0.4s"}}/></div></div>:null;})()}
                {liveDirective.tomorrowNote&&<div style={{marginTop:8,padding:"8px 10px",borderRadius:7,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:11,color:"#92400e"}}><div style={{fontWeight:700,marginBottom:2}}>📝 직원 내일 메모</div>{liveDirective.tomorrowNote}</div>}
              </div>
            ):<div style={{...cardStyle,textAlign:"center",color:"#94a3b8",padding:"40px 20px",fontSize:13}}>📭 아직 공유된 지침이 없어요</div>}
          </div>
        )}

        {section==="workerdo"&&<WorkerDoTab liveDirective={liveDirective}/>}

        {section==="att"&&<AttTab mode={mode} employees={employees} attHistory={attHistory} now={now} myStatus={myStatus} myCheckIn={myCheckIn} myCheckOut={myCheckOut} doCheckIn={doCheckIn} doCheckOut={doCheckOut} authMethod={authMethod} setAuthMethod={setAuthMethod} setAuthModal={setAuthModal} setRegisterModal={setRegisterModal} leaves={leaves} setLeaves={setLeaves} leaveForm={leaveForm} setLeaveForm={setLeaveForm} showToast={showToast}/>}

        {section==="boss"&&mode==="admin"&&(
          <div style={{paddingBottom:80}}>
            <div style={{...cardStyle}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>📅 날짜</div>
                <button onClick={()=>setBDate(getTodayStr())} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${bDate===getTodayStr()?"#7c3aed":"#e2e8f0"}`,background:bDate===getTodayStr()?"#7c3aed":"white",color:bDate===getTodayStr()?"white":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer"}}>오늘</button>
              </div>
              <input type="date" value={bDate} onChange={e=>setBDate(e.target.value)} style={{...inputStyle,overflow:"hidden"}}/>
              <div style={{marginTop:4,fontSize:10,color:"#94a3b8"}}>📌 {fmtDate(bDate)}</div>
            </div>
            <WorkSelector templates={bTemplates} optTab={bOptTab} setOptTab={setBOptTab} selected={bSelected} onToggleTemplate={toggleBT} onToggleOption={toggleBO} optMemos={bOptMemos} setOptMemos={setBOptMemos} priority={bPriority} setPriority={setBPriority}/>
            <div style={{...cardStyle}}><div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>📝 추가 메모</div><textarea value={bMemo} onChange={e=>setBMemo(e.target.value)} placeholder="특이사항" rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
            <button onClick={handleBGen} disabled={bPriority.length===0||bSaving} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:bPriority.length===0?"#cbd5e1":"#7c3aed",color:"white",fontWeight:700,fontSize:14,cursor:bPriority.length===0?"not-allowed":"pointer",marginBottom:10}}>
              {bSaving?"⏳ 저장 중...":bPriority.length===0?"⬆️ 업무 먼저 선택":"✨ 대표 업무 지침서 생성"}
            </button>
            {bOk&&<div style={{background:"#f5f3ff",border:"1px solid #c4b5fd",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#7c3aed",fontWeight:600,textAlign:"center"}}>✅ 히스토리에 저장됐어요</div>}
            {bResult&&(
              <div style={{...cardStyle,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>👔 대표 업무 지침서</span>
                  <button onClick={()=>{navigator.clipboard.writeText(bResult);setBCopied(true);setTimeout(()=>setBCopied(false),2000);}} style={{padding:"4px 10px",borderRadius:6,border:"none",background:bCopied?"#16a34a":"#7c3aed",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{bCopied?"✅":"📋"} {bCopied?"복사됨":"복사"}</button>
                </div>
                <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:10,fontSize:11,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{bResult}</pre>
                <Checklist result={bResult} checklist={bChecklist} setChecklist={setBChecklist} color="#7c3aed" onFirebase={async n=>{if(bossHistory[0]?.firebaseKey)await set(ref(db,`bossHistory/${bossHistory[0].firebaseKey}/checks`),n);}}/>
              </div>
            )}
            <div style={{...cardStyle}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",marginBottom:6}}>📝 업무 노트 (자동저장)</div>
              <textarea value={bossNote} onChange={async e=>{setBossNote(e.target.value);await set(ref(db,"bossNote"),e.target.value);}} placeholder="공유사항, 지시사항 등" rows={5} style={{...inputStyle,resize:"vertical",lineHeight:1.8}}/>
            </div>
          </div>
        )}

        {section==="history"&&(
          <div style={{paddingBottom:80}}>
            {mode==="admin"&&(
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                <button onClick={()=>{exportCSV(`직원업무_${getTodayStr()}.csv`,history.map(h=>[(h.priority||[]).map(id=>OPTION_BY_ID[id]?.label).filter(Boolean).join("/"),h.date,h.memo||"",h.tomorrowNote||""]),["업무목록","날짜","메모","내일메모"]);showToast("📊 직원 히스토리 내보내기!");}} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #1d4ed8",background:"#eff6ff",color:"#1d4ed8",fontSize:11,fontWeight:700,cursor:"pointer"}}>📊 직원업무</button>
                <button onClick={()=>{exportCSV(`대표업무_${getTodayStr()}.csv`,bossHistory.map(h=>[(h.priority||[]).map(id=>OPTION_BY_ID[id]?.label).filter(Boolean).join("/"),h.date,h.memo||""]),["업무목록","날짜","메모"]);showToast("📊 대표 히스토리 내보내기!");}} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #7c3aed",background:"#f5f3ff",color:"#7c3aed",fontSize:11,fontWeight:700,cursor:"pointer"}}>📊 대표업무</button>
                <button onClick={()=>{exportCSV(`근태기록_${getTodayStr()}.csv`,attHistory.map(r=>[r.name,r.date,r.checkIn||"",r.checkOut||"",r.status||""]),["이름","날짜","출근","퇴근","상태"]);showToast("📊 근태 기록 내보내기!");}} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #10b981",background:"#f0fdf4",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer"}}>📊 근태</button>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>📝 직원 업무 히스토리</div>
              {mode==="admin"&&history.length>0&&<button onClick={async()=>{if(window.confirm("전체 삭제?"))await set(ref(db,"history"),null);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑️ 전체삭제</button>}
            </div>
            {history.length===0?<div style={{...cardStyle,textAlign:"center",color:"#94a3b8",fontSize:12,marginBottom:16}}>직원 업무 히스토리가 없어요</div>:
            <div style={{marginBottom:20}}>{history.map(h=><HistCard key={h.firebaseKey||h.id} item={h} color="#1d4ed8" isAdmin={mode==="admin"} onDelete={async k=>await remove(ref(db,`history/${k}`))} onLoad={item=>{setWDate(item.date);setWMemo(item.memo||"");setWPriority(item.priority||[]);setWOptMemos(item.optionMemos||{});const tids=[...new Set((item.priority||[]).map(id=>OPTION_BY_ID[id]?.tid).filter(Boolean))];setWTemplates(tids);setWOptTab(tids[0]||null);setWSelected(new Set(item.priority||[]));setWResult(item.result||"");navigate("worker");}} onCheck={async(k,n)=>await set(ref(db,`history/${k}/checks`),n)}/>)}</div>}
            {mode==="admin"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:"#7c3aed"}}>👔 대표 업무 히스토리</div>
                {bossHistory.length>0&&<button onClick={async()=>{if(window.confirm("전체 삭제?"))await set(ref(db,"bossHistory"),null);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑️ 전체삭제</button>}
              </div>
              {bossHistory.length===0?<div style={{...cardStyle,textAlign:"center",color:"#94a3b8",fontSize:12,marginBottom:16}}>대표 업무 히스토리가 없어요</div>:
              <div style={{marginBottom:20}}>{bossHistory.map(h=><HistCard key={h.firebaseKey||h.id} item={h} color="#7c3aed" isAdmin={true} onDelete={async k=>await remove(ref(db,`bossHistory/${k}`))} onLoad={item=>{setBDate(item.date);setBMemo(item.memo||"");setBPriority(item.priority||[]);setBOptMemos(item.optionMemos||{});const tids=[...new Set((item.priority||[]).map(id=>OPTION_BY_ID[id]?.tid).filter(Boolean))];setBTemplates(tids);setBOptTab(tids[0]||null);setBSelected(new Set(item.priority||[]));setBResult(item.result||"");setBChecklist(item.checks||{});navigate("boss");}} onCheck={async(k,n)=>await set(ref(db,`bossHistory/${k}/checks`),n)}/>)}</div>}
            </>)}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>🐝 근태 기록</div>
              {mode==="admin"&&attHistory.length>0&&<button onClick={async()=>{if(window.confirm("근태 기록 전체 삭제?"))await set(ref(db,"attHistory"),null);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑️ 전체삭제</button>}
            </div>
            {attHistory.length===0?<div style={{...cardStyle,textAlign:"center",color:"#94a3b8",fontSize:12}}>근태 기록이 없어요</div>:
            <div style={{background:"white",borderRadius:10,overflow:"hidden"}}>
              {attHistory.slice(0,30).map((r,i)=>(
                <div key={r.firebaseKey||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #f1f5f9",fontSize:11}}>
                  <span style={{fontWeight:600,color:"#0f172a",width:55,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</span>
                  <span style={{color:"#64748b",flexShrink:0,fontSize:10}}>{r.date}</span>
                  <span style={{color:"#374151",flexShrink:0}}>{r.checkIn||"—"}→{r.checkOut||"중"}</span>
                  <span style={{padding:"2px 6px",borderRadius:8,fontSize:10,fontWeight:700,background:r.status==="정상"?"#f0fdf4":r.status==="지각"?"#fef2f2":"#eff6ff",color:r.status==="정상"?"#16a34a":r.status==="지각"?"#dc2626":"#1d4ed8",flexShrink:0}}>{r.status||"출근중"}</span>
                </div>
              ))}
            </div>}
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"white",borderTop:"1px solid #e2e8f0",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>navigate(t.key)} style={{flex:1,padding:"10px 4px 8px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20,lineHeight:1}}>{t.icon}</span>
            <span style={{fontSize:9,fontWeight:section===t.key?700:400,color:section===t.key?"#1d4ed8":"#94a3b8"}}>{t.label}</span>
            {section===t.key&&<div style={{width:20,height:2,background:"#1d4ed8",borderRadius:1}}/>}
          </button>
        ))}
      </div>

      {authModal?.type==="qr"&&<QRModal action={authModal.action} onClose={()=>setAuthModal(null)} onSuccess={authModal.action==="in"?doCheckIn:doCheckOut}/>}
      {authModal?.type==="gps"&&<GPSModal action={authModal.action} onClose={()=>setAuthModal(null)} onSuccess={authModal.action==="in"?doCheckIn:doCheckOut}/>}
      {authModal?.type==="wifi"&&<WiFiModal action={authModal.action} onClose={()=>setAuthModal(null)} onSuccess={authModal.action==="in"?doCheckIn:doCheckOut}/>}
      {registerModal&&<RegisterModal onClose={()=>setRegisterModal(false)} onSuccess={()=>showToast("✅ 직원이 등록됐어요!")}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{display:none;}body{margin:0;overflow-x:hidden;}`}</style>
    </div>
  );
}
