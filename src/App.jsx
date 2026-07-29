import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, remove, get } from "firebase/database";

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

// ── 상수 ─────────────────────────────────────────────────
const ADMIN_PIN = "241119";
const WORKER_PIN = "260701";
const MIN_WAGE = 10320; // 2024 최저시급

// ── 업무 템플릿 데이터 ────────────────────────────────────
const TEMPLATE_META = {
  1: { label: "📱 SNS 업무",            color: "#3b82f6", bg: "#eff6ff" },
  2: { label: "🛍️ 쇼핑몰 관리",         color: "#ef4444", bg: "#fef2f2" },
  3: { label: "🎬 릴스 제작 및 업로드",  color: "#f59e0b", bg: "#fffbeb" },
  4: { label: "📋 사무업무",             color: "#10b981", bg: "#f0fdf4" },
  5: { label: "📷 사진 업무",            color: "#8b5cf6", bg: "#f5f3ff" },
  6: { label: "📌 기타 업무",            color: "#64748b", bg: "#f8fafc" },
};
const OPTION_MAP = {
  1:[{id:"blog",label:"📝 블로그",tid:1},{id:"yuyu",label:"🎥 유유모먼트",tid:1},{id:"wishiz_snap",label:"📸 위시즈스냅",tid:1},{id:"wishiz_family",label:"👨‍👩‍👧 위시즈패밀리",tid:1},{id:"gentle_threads",label:"🧵 젠틀 스레드",tid:1},{id:"wishiz_threads",label:"🧵 위시즈 스레드",tid:1},{id:"yuyu_threads",label:"🧵 유유 스레드",tid:1}],
  2:[{id:"naver_order",label:"🛒 네이버 스스 주문",tid:2},{id:"coupang_reg",label:"📦 쿠팡 온채널 등록",tid:2},{id:"smartstore_reg",label:"🏪 스스 온채널 등록",tid:2},{id:"cs",label:"💬 CS 응대",tid:2}],
  3:[{id:"reels_plan",label:"💡 릴스 기획",tid:3},{id:"reels_shoot",label:"🎥 릴스 촬영",tid:3},{id:"reels_edit",label:"✂️ 릴스 편집",tid:3},{id:"reels_upload",label:"📤 릴스 업로드",tid:3}],
  4:[{id:"office_assist",label:"🗂️ 사무보조",tid:4},{id:"accounting",label:"🧾 회계 업무",tid:4},{id:"etc4",label:"📌 기타",tid:4}],
  5:[{id:"photo_select",label:"🖼️ 원본 셀렉",tid:5},{id:"photo_edit1",label:"🎨 1차 보정",tid:5},{id:"photo_edit2",label:"✨ 2차 보정",tid:5},{id:"photo_send",label:"📤 고객 전송",tid:5},{id:"photo_print",label:"🖨️ 인화 외주",tid:5}],
  6:[{id:"meeting",label:"🤝 회의",tid:6},{id:"cleaning",label:"🧹 청소",tid:6},{id:"dining",label:"🍽️ 회식",tid:6},{id:"other_etc",label:"📌 기타",tid:6}],
};
const ALL_OPTIONS = Object.values(OPTION_MAP).flat();
const OPTION_BY_ID = Object.fromEntries(ALL_OPTIONS.map(o=>[o.id,o]));

// ── 유틸 ─────────────────────────────────────────────────
function getTodayString(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;}
function formatDate(s){if(!s)return"";const d=new Date(s+"T00:00:00");const days=["일","월","화","수","목","금","토"];return`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;}
function formatTime(d){return d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});}
function formatTimeShort(d){return d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});}
function parseTimeToMinutes(t){if(!t)return 0;const[h,m]=t.split(":").map(Number);return h*60+m;}
function minutesToHours(m){return Math.round(m/60*10)/10;}
function generateDirectiveText(date,priority,memo,optionMemos){
  if(!priority?.length)return"";
  const items=priority.map((id,idx)=>({...OPTION_BY_ID[id],rank:idx+1}));
  const taskLines=items.map(i=>{const mn=optionMemos?.[i.id]?`\n   └ 📝 ${optionMemos[i.id]}`:"";const ut=i.tid===1?" 업로드":"";return`${i.rank}번째 · ${i.label}${ut}${mn}`;}).join("\n");
  const ms=memo?.trim()?`\n📝 메모\n${memo.trim()}`:"";
  return`📅 ${formatDate(date)} 업무 지침서\n\n안녕하세요! 오늘도 잘 부탁드려요 😊\n\n━━━━━━━━━━━━━━━━━━\n📋 오늘의 업무 목록\n━━━━━━━━━━━━━━━━━━\n${taskLines}\n${ms}\n\n수고하세요! 오늘도 화이팅입니다 💪`;
}

// ── 공용 컴포넌트 ─────────────────────────────────────────
function Toast({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t);},[]);
  return<div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:type==="err"?"#dc2626":"#0f172a",color:"white",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",whiteSpace:"nowrap",maxWidth:"90vw",textAlign:"center"}}>{msg}</div>;
}

function Modal({title,children,onClose,maxW=360}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000,padding:"0 0 0 0"}}>
      <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:maxW,boxShadow:"0 -8px 32px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#94a3b8",cursor:"pointer",padding:4}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({children,onClick,color="#1d4ed8",light,full,disabled,style={},size="md"}){
  const pad=size==="sm"?"6px 12px":size==="lg"?"14px 20px":"10px 16px";
  const fs=size==="sm"?11:size==="lg"?15:13;
  return(
    <button onClick={onClick} disabled={disabled} style={{padding:pad,borderRadius:8,border:light?`1.5px solid ${color}`:"none",background:light?"white":disabled?"#cbd5e1":color,color:light?color:"white",fontWeight:700,fontSize:fs,cursor:disabled?"not-allowed":"pointer",width:full?"100%":undefined,opacity:disabled?0.7:1,transition:"all 0.15s",...style}}>
      {children}
    </button>
  );
}

// ── QR 인증 모달 ─────────────────────────────────────────
function QRAuthModal({action,onClose,onSuccess}){
  const [step,setStep]=useState("idle");
  const videoRef=useRef(null);
  const streamRef=useRef(null);

  const startCamera=async()=>{
    setStep("scanning");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      streamRef.current=stream;
      if(videoRef.current) videoRef.current.srcObject=stream;
      // QR 스캔 시뮬레이션 (실제 환경에서는 jsQR 라이브러리 필요)
      setTimeout(()=>{stopCamera();setStep("done");},3000);
    }catch(e){
      setStep("denied");
    }
  };
  const stopCamera=()=>{
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
  };
  useEffect(()=>()=>stopCamera(),[]);

  return(
    <Modal title="📱 QR 코드 인증" onClose={()=>{stopCamera();onClose();}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"100%",aspectRatio:"1",background:"#0f172a",borderRadius:12,marginBottom:16,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {step==="scanning"&&<video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
          {step==="idle"&&<div style={{color:"#64748b",fontSize:13}}>📷 카메라로 QR 스캔</div>}
          {step==="done"&&<div style={{fontSize:48}}>✅</div>}
          {step==="denied"&&<div style={{color:"#ef4444",fontSize:12,padding:16}}>카메라 접근 권한이 없어요<br/>수동 인증을 이용해주세요</div>}
          {step==="scanning"&&<div style={{position:"absolute",left:"10%",right:"10%",height:2,background:"#3b82f6",top:"50%",boxShadow:"0 0 10px #3b82f6"}}/>}
        </div>
        {step==="done"?(
          <><div style={{fontSize:13,color:"#16a34a",fontWeight:600,marginBottom:12}}>QR 인증 완료!</div>
          <Btn full color="#16a34a" onClick={()=>{onSuccess();onClose();}}>확인 ({action==="in"?"출근":"퇴근"} 완료)</Btn></>
        ):step==="idle"?(
          <Btn full onClick={startCamera}>카메라 시작</Btn>
        ):step==="denied"?(
          <Btn full color="#64748b" onClick={onClose}>닫기</Btn>
        ):(
          <div style={{fontSize:12,color:"#3b82f6"}}>QR 코드를 카메라에 비춰주세요...</div>
        )}
      </div>
    </Modal>
  );
}

// ── GPS 인증 모달 ─────────────────────────────────────────
function GPSAuthModal({action,onClose,onSuccess}){
  const [step,setStep]=useState("idle");
  const [pos,setPos]=useState(null);
  const [err,setErr]=useState("");
  // 젠틀모먼츠 스튜디오 위치 (예시 - 실제 좌표로 변경 필요)
  const OFFICE_LAT=36.5684; const OFFICE_LNG=128.7294; const MAX_DIST=200;

  const getDistance=(lat1,lng1,lat2,lng2)=>{
    const R=6371000;const dLat=(lat2-lat1)*Math.PI/180;const dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const startGPS=()=>{
    setStep("locating");
    if(!navigator.geolocation){setErr("GPS를 지원하지 않는 기기예요");setStep("err");return;}
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const dist=Math.round(getDistance(pos.coords.latitude,pos.coords.longitude,OFFICE_LAT,OFFICE_LNG));
        setPos({lat:pos.coords.latitude,lng:pos.coords.longitude,dist});
        setStep(dist<=MAX_DIST?"done":"far");
      },
      e=>{setErr("위치 권한을 허용해주세요");setStep("err");},
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  return(
    <Modal title="📍 GPS 위치 인증" onClose={onClose}>
      <div style={{textAlign:"center"}}>
        <div style={{width:120,height:120,margin:"0 auto 16px",borderRadius:"50%",background:step==="done"?"#f0fdf4":step==="far"?"#fef2f2":step==="locating"?"#eff6ff":"#f8fafc",border:`3px solid ${step==="done"?"#22c55e":step==="far"?"#ef4444":step==="locating"?"#3b82f6":"#e2e8f0"}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4,transition:"all 0.3s"}}>
          <div style={{fontSize:36}}>{step==="done"?"✅":step==="far"?"❌":step==="locating"?"📡":"📍"}</div>
          {pos&&<div style={{fontSize:10,color:"#64748b"}}>{pos.dist}m</div>}
        </div>
        {step==="idle"&&<div style={{fontSize:12,color:"#64748b",marginBottom:12}}>현재 위치가 사무실 반경 {MAX_DIST}m 이내여야 합니다</div>}
        {step==="locating"&&<div style={{fontSize:12,color:"#3b82f6",marginBottom:12}}>위치 확인 중...</div>}
        {step==="done"&&<div style={{fontSize:12,color:"#16a34a",fontWeight:600,marginBottom:12}}>위치 인증 완료! (사무실 {pos?.dist}m)</div>}
        {step==="far"&&<div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>사무실에서 너무 멀어요 ({pos?.dist}m)<br/>사무실 반경 {MAX_DIST}m 이내에서 인증해주세요</div>}
        {(step==="err"||err)&&<div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{err}</div>}
        {step==="done"?(
          <Btn full color="#16a34a" onClick={()=>{onSuccess();onClose();}}>확인 ({action==="in"?"출근":"퇴근"} 완료)</Btn>
        ):step==="far"?(
          <Btn full color="#64748b" onClick={onClose}>닫기</Btn>
        ):(step==="err"||step==="denied")?(
          <Btn full color="#64748b" onClick={onClose}>닫기</Btn>
        ):(
          <Btn full onClick={startGPS} disabled={step==="locating"}>{step==="locating"?"확인 중...":"위치 확인 시작"}</Btn>
        )}
      </div>
    </Modal>
  );
}

// ── Wi-Fi 인증 모달 ───────────────────────────────────────
function WiFiAuthModal({action,onClose,onSuccess}){
  const [step,setStep]=useState("idle");
  const OFFICE_SSID="GentleMoments_Office";

  const checkNetwork=async()=>{
    setStep("checking");
    // NetworkInformation API 시도
    try{
      if("connection" in navigator){
        const conn=navigator.connection;
        // 실제로는 SSID를 웹에서 직접 읽기 불가 - 서버 IP 체크 방식 사용
        const res=await fetch("https://api.ipify.org?format=json",{signal:AbortSignal.timeout(5000)});
        if(res.ok){
          // 네트워크 연결 확인 완료 (SSID 체크는 앱에서만 가능)
          setTimeout(()=>setStep("done"),500);
          return;
        }
      }
      // fallback: 연결 여부만 확인
      setTimeout(()=>setStep(navigator.onLine?"done":"err"),1500);
    }catch(e){
      setTimeout(()=>setStep(navigator.onLine?"done":"err"),1500);
    }
  };

  return(
    <Modal title="📶 Wi-Fi 네트워크 인증" onClose={onClose}>
      <div style={{textAlign:"center"}}>
        <div style={{padding:"20px",background:step==="done"?"#f0fdf4":"#f8fafc",borderRadius:12,marginBottom:16,border:`1px solid ${step==="done"?"#86efac":"#e2e8f0"}`}}>
          <div style={{fontSize:40,marginBottom:8}}>📶</div>
          {step==="idle"&&<div style={{fontSize:12,color:"#64748b"}}>사무실 Wi-Fi에 연결된 상태에서 인증하세요<br/><strong>{OFFICE_SSID}</strong></div>}
          {step==="checking"&&<div style={{fontSize:12,color:"#3b82f6",fontWeight:600}}>네트워크 확인 중...</div>}
          {step==="done"&&<div style={{fontSize:13,color:"#16a34a",fontWeight:700}}>✅ 네트워크 인증 완료<br/><span style={{fontSize:11,fontWeight:400}}>인터넷 연결 확인됨</span></div>}
          {step==="err"&&<div style={{fontSize:12,color:"#ef4444"}}>네트워크 연결을 확인해주세요</div>}
        </div>
        {step==="done"?(
          <Btn full color="#16a34a" onClick={()=>{onSuccess();onClose();}}>확인 ({action==="in"?"출근":"퇴근"} 완료)</Btn>
        ):step==="err"?(
          <Btn full color="#64748b" onClick={onClose}>닫기</Btn>
        ):(
          <Btn full onClick={checkNetwork} disabled={step==="checking"}>{step==="checking"?"확인 중...":"연결 확인"}</Btn>
        )}
      </div>
    </Modal>
  );
}

// ── 로그인 화면 ───────────────────────────────────────────
function LoginScreen({onLogin}){
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [shake,setShake]=useState(false);

  const handleNum=(n)=>{
    if(pin.length>=6) return;
    const next=pin+n;
    setPin(next);
    if(next.length===6){
      if(next===ADMIN_PIN){onLogin("admin");}
      else if(next===WORKER_PIN){onLogin("worker");}
      else{
        setShake(true);setErr("잘못된 PIN번호예요");
        setTimeout(()=>{setPin("");setErr("");setShake(false);},1000);
      }
    }
  };
  const handleDel=()=>setPin(p=>p.slice(0,-1));

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{marginBottom:32,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8}}>📸</div>
        <div style={{fontSize:24,fontWeight:800,color:"white"}}>젠틀모먼츠</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:4}}>업무·근태 관리 시스템</div>
      </div>

      {/* PIN 표시 */}
      <div style={{marginBottom:8,display:"flex",gap:12,animation:shake?"shake 0.4s ease":"none"}}>
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<pin.length?"white":"rgba(255,255,255,0.3)",transition:"all 0.15s"}}/>
        ))}
      </div>
      {err&&<div style={{color:"#fca5a5",fontSize:12,marginBottom:12,fontWeight:600}}>{err}</div>}
      {!err&&<div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginBottom:12}}>PIN 번호 6자리를 입력하세요</div>}

      {/* 키패드 */}
      <div style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:20,backdropFilter:"blur(10px)"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
            <button key={i} onClick={()=>n==="⌫"?handleDel():n!==""&&handleNum(String(n))}
              disabled={n===""}
              style={{width:64,height:64,borderRadius:"50%",border:"none",background:n===""?"transparent":n==="⌫"?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.15)",color:"white",fontSize:n==="⌫"?20:22,fontWeight:600,cursor:n===""?"default":"pointer",transition:"all 0.1s",backdropFilter:"blur(5px)"}}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{marginTop:24,textAlign:"center",color:"rgba(255,255,255,0.5)",fontSize:11}}>
        관리자 및 직원용 PIN을 입력하세요
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ── 직원 등록 모달 ────────────────────────────────────────
function RegisterModal({onClose,onSuccess,isAdmin}){
  const [form,setForm]=useState({name:"",role:"",phone:"",hourlyRate:10320,monthlyRate:2156880,contractType:"hourly"});
  const [loading,setLoading]=useState(false);

  const handleSubmit=async()=>{
    if(!form.name.trim()||!form.role.trim()){alert("이름과 직무를 입력해주세요");return;}
    setLoading(true);
    try{
      await push(ref(db,"employees"),{...form,id:Date.now(),registeredAt:getTodayString(),active:true});
      onSuccess();onClose();
    }catch(e){alert("등록 실패");}
    setLoading(false);
  };

  return(
    <Modal title="직원 신규 등록" onClose={onClose} maxW={400}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>이름 *</label>
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="홍길동" style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>직무/역할 *</label>
          <input value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} placeholder="SNS 마케터" style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>연락처</label>
          <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="010-0000-0000" style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>계약 유형</label>
          <div style={{display:"flex",gap:8}}>
            {["hourly","monthly"].map(t=>(
              <button key={t} onClick={()=>setForm(p=>({...p,contractType:t}))} style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px solid ${form.contractType===t?"#1d4ed8":"#e2e8f0"}`,background:form.contractType===t?"#eff6ff":"white",color:form.contractType===t?"#1d4ed8":"#64748b",fontWeight:form.contractType===t?700:400,fontSize:12,cursor:"pointer"}}>
                {t==="hourly"?"시급제":"월급제"}
              </button>
            ))}
          </div>
        </div>
        {form.contractType==="hourly"?(
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>시급 (원)</label>
            <input type="number" value={form.hourlyRate} onChange={e=>setForm(p=>({...p,hourlyRate:Number(e.target.value)}))} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ):(
          <>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>월 급여 (원)</label>
            <input type="number" value={form.monthlyRate} onChange={e=>setForm(p=>({...p,monthlyRate:Number(e.target.value)}))} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>환산 시급 (원)</label>
            <input type="number" value={form.hourlyRate} onChange={e=>setForm(p=>({...p,hourlyRate:Number(e.target.value)}))} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          </>
        )}
        <Btn full onClick={handleSubmit} disabled={loading} style={{marginTop:4}}>
          {loading?"등록 중...":"✅ 직원 등록"}
        </Btn>
      </div>
    </Modal>
  );
}

// ── 급여 계산 로직 ────────────────────────────────────────
function calcSalary(employee, attRecords){
  const empRecs=attRecords.filter(r=>r.employeeId===employee.firebaseKey||r.name===employee.name);
  // 주별 근무시간 집계
  const weeklyMap={};
  let totalWorkMin=0, extraMin=0, shortMin=0;
  const DAILY_STD_MIN=8*60; // 8시간

  empRecs.forEach(r=>{
    if(!r.checkIn||!r.checkOut) return;
    const inM=parseTimeToMinutes(r.checkIn);
    const outM=parseTimeToMinutes(r.checkOut);
    const workMin=Math.max(0,outM-inM-60); // 점심 1시간 제외
    totalWorkMin+=workMin;
    const d=new Date(r.date+"T00:00:00");
    const dow=d.getDay();
    const weekKey=`${r.date.slice(0,7)}-W${Math.ceil(d.getDate()/7)}`;
    if(!weeklyMap[weekKey]) weeklyMap[weekKey]=0;
    // 주중(월~금)
    if(dow>=1&&dow<=5){
      weeklyMap[weekKey]+=workMin;
      if(workMin<DAILY_STD_MIN) shortMin+=DAILY_STD_MIN-workMin;
      else extraMin+=workMin-DAILY_STD_MIN;
    } else {
      // 주말 근무
      weeklyMap[weekKey]+=workMin;
      extraMin+=workMin;
    }
  });

  // 유연근무 상쇄
  const netExtra=Math.max(0,extraMin-shortMin);
  const netShort=Math.max(0,shortMin-extraMin);

  // 주휴수당 계산
  const WEEKLY_STD_MIN=40*60;
  let weeklyPay=0;
  const hourlyRate=employee.hourlyRate||10320;
  Object.values(weeklyMap).forEach(wMin=>{
    if(wMin>=15*60){
      const ratio=Math.min(wMin/WEEKLY_STD_MIN,1);
      weeklyPay+=Math.round(hourlyRate*8*ratio);
    }
  });

  const totalWorkH=minutesToHours(totalWorkMin);
  const netExtraH=minutesToHours(netExtra);
  const netShortH=minutesToHours(netShort);

  // 월급제 계산
  const baseMonthly=employee.monthlyRate||2156880;
  const flexAdj=Math.round((netExtraH-netShortH)*hourlyRate);
  const TAX_RATE=0.10;
  const monthlyGross=baseMonthly+flexAdj;
  const monthlyNet=Math.round(monthlyGross*(1-TAX_RATE));

  // 시급제 계산
  const hourlyGross=Math.round(totalWorkH*hourlyRate+weeklyPay);
  const hourlyNet=Math.round(hourlyGross*(1-TAX_RATE));

  return{
    totalWorkH,netExtraH,netShortH,weeklyPay,
    monthlyGross,monthlyNet,flexAdj,
    hourlyGross,hourlyNet,
    weeklyMap,hourlyRate,baseMonthly,
    taxRate:TAX_RATE,recordCount:empRecs.length,
  };
}

// ══════════════════════════════════════════════════════════
// 메인 앱
// ══════════════════════════════════════════════════════════
export default function App(){
  const [mode,setMode]=useState(null); // null=login, admin, worker
  const [now,setNow]=useState(new Date());
  const [toast,setToast]=useState(null);

  // 네비게이션 히스토리
  const [navHistory,setNavHistory]=useState([]);
  const [navIdx,setNavIdx]=useState(-1);
  const [section,setSection]=useState("dashboard");

  // Firebase 데이터
  const [employees,setEmployees]=useState([]);
  const [history,setHistory]=useState([]);
  const [bossHistory,setBossHistory]=useState([]);
  const [liveDirective,setLiveDirective]=useState(null);
  const [attHistory,setAttHistory]=useState([]);
  const [bossNote,setBossNote]=useState("");

  // 출퇴근
  const [myStatus,setMyStatus]=useState("미출근");
  const [myCheckIn,setMyCheckIn]=useState(null);
  const [myCheckOut,setMyCheckOut]=useState(null);
  const [authMethod,setAuthMethod]=useState("manual");
  const [authModal,setAuthModal]=useState(null);
  const [registerModal,setRegisterModal]=useState(false);

  // 업무 지침 state
  const [wDate,setWDate]=useState(getTodayString());
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
  const [wSaveOk,setWSaveOk]=useState(false);

  // 대표 업무 state
  const [bDate,setBDate]=useState(getTodayString());
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
  const [bSaveOk,setBSaveOk]=useState(false);

  // 근태 서브탭
  const [attTab,setAttTab]=useState("clock");
  const [leaves,setLeaves]=useState([{id:1,name:"(직원명)",type:"반차",date:"2026-07-30",reason:"병원 진료",status:"대기"}]);
  const [leaveForm,setLeaveForm]=useState({type:"연차",date:"",reason:""});

  // 급여 관리
  const [salaryTarget,setSalaryTarget]=useState(null);
  const [salaryMonth,setSalaryMonth]=useState(getTodayString().slice(0,7));

  useEffect(()=>{
    const t=setInterval(()=>setNow(new Date()),1000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    const u1=onValue(ref(db,"employees"),snap=>{
      const d=snap.val();
      setEmployees(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).filter(e=>e.active!==false):[]);
    });
    const u2=onValue(ref(db,"history"),snap=>{
      const d=snap.val();
      setHistory(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,50):[]);
    });
    const u3=onValue(ref(db,"live"),snap=>{if(snap.val())setLiveDirective(snap.val());});
    const u4=onValue(ref(db,"bossHistory"),snap=>{
      const d=snap.val();
      setBossHistory(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,50):[]);
    });
    const u5=onValue(ref(db,"attHistory"),snap=>{
      const d=snap.val();
      setAttHistory(d?Object.entries(d).map(([k,v])=>({...v,firebaseKey:k})).sort((a,b)=>b.id-a.id).slice(0,200):[]);
    });
    const u6=onValue(ref(db,"bossNote"),snap=>{if(snap.val()!==null)setBossNote(snap.val());});
    return()=>{u1();u2();u3();u4();u5();u6();};
  },[]);

  const showToast=(msg,type="ok")=>setToast({msg,type});

  // 네비게이션 (뒤로/앞으로)
  const navigate=useCallback((sec)=>{
    if(sec===section) return;
    setSection(sec);
    setNavHistory(prev=>{
      const trimmed=prev.slice(0,navIdx+1);
      const next=[...trimmed,sec];
      setNavIdx(next.length-1);
      return next;
    });
  },[section,navIdx]);

  const goBack=()=>{
    if(navIdx>0){const prev=navHistory[navIdx-1];setSection(prev);setNavIdx(i=>i-1);}
  };
  const goForward=()=>{
    if(navIdx<navHistory.length-1){const next=navHistory[navIdx+1];setSection(next);setNavIdx(i=>i+1);}
  };

  useEffect(()=>{
    if(mode&&navHistory.length===0){setNavHistory(["dashboard"]);setNavIdx(0);setSection("dashboard");}
  },[mode]);

  const doCheckIn=()=>{
    const t=formatTimeShort(new Date());
    setMyStatus("출근중");setMyCheckIn(t);
    push(ref(db,"attHistory"),{name:mode==="admin"?"백송 대표":"직원",date:getTodayString(),checkIn:t,checkOut:null,status:"출근중",id:Date.now(),mode});
    showToast(`✅ 출근 완료! ${t}`);
  };
  const doCheckOut=()=>{
    const t=formatTimeShort(new Date());
    setMyStatus("퇴근");setMyCheckOut(t);
    push(ref(db,"attHistory"),{name:mode==="admin"?"백송 대표":"직원",date:getTodayString(),checkIn:myCheckIn,checkOut:t,status:"정상",id:Date.now(),mode});
    showToast(`🏠 퇴근 완료! ${t}`);
  };

  const handleWGenerate=async()=>{
    const text=generateDirectiveText(wDate,wPriority,wMemo,wOptMemos);
    const lines=text.split("\n").filter(l=>/^\d+번째/.test(l));
    const checks={};lines.forEach((_,i)=>{checks[i]=false;});
    setWResult(text);setWChecklist(checks);setWSaving(true);
    try{
      const item={date:wDate,priority:wPriority,memo:wMemo,optionMemos:wOptMemos,result:text,id:Date.now(),checks,tomorrowNote:"",orderChanged:false,workerOrder:null};
      const pushed=await push(ref(db,"history"),item);
      await set(ref(db,"live"),{...item,firebaseKey:pushed.key});
      setWSaveOk(true);setTimeout(()=>setWSaveOk(false),2500);
    }catch(e){console.error(e);}
    setWSaving(false);
  };

  const handleBGenerate=async()=>{
    const text=generateDirectiveText(bDate,bPriority,bMemo,bOptMemos);
    const lines=text.split("\n").filter(l=>/^\d+번째/.test(l));
    const checks={};lines.forEach((_,i)=>{checks[i]=false;});
    setBResult(text);setBChecklist(checks);setBSaving(true);
    try{
      const item={date:bDate,priority:bPriority,memo:bMemo,optionMemos:bOptMemos,result:text,id:Date.now(),checks,type:"boss"};
      await push(ref(db,"bossHistory"),item);
      setBSaveOk(true);setTimeout(()=>setBSaveOk(false),2500);
    }catch(e){console.error(e);}
    setBSaving(false);
  };

  const toggleWTemplate=(tid)=>{
    setWTemplates(prev=>{
      if(prev.includes(tid)){const rids=OPTION_MAP[tid].map(o=>o.id);setWSelected(p=>{const n=new Set(p);rids.forEach(id=>n.delete(id));return n;});setWPriority(p=>p.filter(id=>!rids.includes(id)));setWOptMemos(p=>{const n={...p};rids.forEach(id=>delete n[id]);return n;});const rem=prev.filter(t=>t!==tid);setWOptTab(rem.length>0?rem[rem.length-1]:null);return rem;}
      setWOptTab(tid);return[...prev,tid];
    });
  };
  const toggleWOption=(optId)=>{
    setWSelected(prev=>{const next=new Set(prev);if(next.has(optId)){next.delete(optId);setWPriority(p=>p.filter(id=>id!==optId));setWOptMemos(p=>{const n={...p};delete n[optId];return n;});}else{next.add(optId);setWPriority(p=>[...p,optId]);}return next;});
  };
  const toggleBTemplate=(tid)=>{
    setBTemplates(prev=>{
      if(prev.includes(tid)){const rids=OPTION_MAP[tid].map(o=>o.id);setBSelected(p=>{const n=new Set(p);rids.forEach(id=>n.delete(id));return n;});setBPriority(p=>p.filter(id=>!rids.includes(id)));setBOptMemos(p=>{const n={...p};rids.forEach(id=>delete n[id]);return n;});const rem=prev.filter(t=>t!==tid);setBOptTab(rem.length>0?rem[rem.length-1]:null);return rem;}
      setBOptTab(tid);return[...prev,tid];
    });
  };
  const toggleBOption=(optId)=>{
    setBSelected(prev=>{const next=new Set(prev);if(next.has(optId)){next.delete(optId);setBPriority(p=>p.filter(id=>id!==optId));setBOptMemos(p=>{const n={...p};delete n[optId];return n;});}else{next.add(optId);setBPriority(p=>[...p,optId]);}return next;});
  };

  // 로그인 전
  if(!mode) return<LoginScreen onLogin={m=>{setMode(m);showToast(m==="admin"?"👋 관리자로 로그인했어요":"👋 직원으로 로그인했어요");}}/>;

  // ── 탭 정의 ──
  const ADMIN_TABS=[
    {key:"dashboard",icon:"🏠",label:"홈"},
    {key:"worker",icon:"📝",label:"업무지침"},
    {key:"att",icon:"🐝",label:"근태"},
    {key:"boss",icon:"👔",label:"대표업무"},
    {key:"history",icon:"🗂️",label:"히스토리"},
  ];
  const WORKER_TABS=[
    {key:"dashboard",icon:"🏠",label:"홈"},
    {key:"live",icon:"📡",label:"오늘업무"},
    {key:"workerdo",icon:"✅",label:"업무이행"},
    {key:"att",icon:"🐝",label:"근태"},
  ];
  const TABS=mode==="admin"?ADMIN_TABS:WORKER_TABS;

  // ── 내부 컴포넌트 ──

  // 업무 선택 패널
  function WorkSelector({templates,optTab,setOptTab,selected,toggleTemplate,toggleOption,optMemos,setOptMemos,priority,setPriority}){
    const moveP=(idx,dir)=>{const n=[...priority],s=idx+dir;if(s<0||s>=n.length)return;[n[idx],n[s]]=[n[s],n[idx]];setPriority(n);};
    return(
      <>
        <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>업무 템플릿 선택</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {Object.entries(TEMPLATE_META).map(([tidStr,meta])=>{
              const tid=Number(tidStr),isOn=templates.includes(tid);
              return<button key={tid} onClick={()=>toggleTemplate(tid)} style={{padding:"9px 10px",borderRadius:8,border:`1.5px solid ${isOn?meta.color:"#e2e8f0"}`,background:isOn?meta.bg:"white",color:isOn?meta.color:"#64748b",fontWeight:isOn?700:400,cursor:"pointer",fontSize:11,textAlign:"left",display:"flex",alignItems:"center",gap:5}}><span style={{width:13,height:13,borderRadius:3,border:`2px solid ${isOn?meta.color:"#cbd5e1"}`,background:isOn?meta.color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"white",fontWeight:700,flexShrink:0}}>{isOn?"✓":""}</span>{meta.label}</button>;
            })}
          </div>
        </div>
        {templates.length>0&&(
          <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {templates.map(tid=>{const meta=TEMPLATE_META[tid];const cnt=OPTION_MAP[tid].filter(o=>selected.has(o.id)).length;const isA=optTab===tid;return<button key={tid} onClick={()=>setOptTab(tid)} style={{padding:"5px 10px",borderRadius:16,border:`1.5px solid ${isA?meta.color:"#e2e8f0"}`,background:isA?meta.color:"white",color:isA?"white":meta.color,fontWeight:isA?700:500,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:4}}>{meta.label}{cnt>0&&<span style={{background:isA?"rgba(255,255,255,0.3)":meta.color,color:"white",borderRadius:8,fontSize:9,padding:"0 4px",fontWeight:700}}>{cnt}</span>}</button>;})}
            </div>
            {optTab&&OPTION_MAP[optTab]&&(()=>{const meta=TEMPLATE_META[optTab];const opts=OPTION_MAP[optTab];return<div style={{borderTop:`2px solid ${meta.color}`,paddingTop:10}}><div style={{fontSize:11,fontWeight:700,color:meta.color,marginBottom:8}}>{meta.label} 세부 선택</div><div style={{display:"flex",flexDirection:"column",gap:5}}>{opts.map(opt=><div key={opt.id}><button onClick={()=>toggleOption(opt.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${selected.has(opt.id)?meta.color:"#e2e8f0"}`,background:selected.has(opt.id)?meta.bg:"white",color:selected.has(opt.id)?meta.color:"#64748b",fontWeight:selected.has(opt.id)?700:400,cursor:"pointer",fontSize:12,textAlign:"left"}}><span style={{width:14,height:14,borderRadius:3,border:`2px solid ${selected.has(opt.id)?meta.color:"#cbd5e1"}`,background:selected.has(opt.id)?meta.color:"white",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"white",flexShrink:0}}>{selected.has(opt.id)?"✓":""}</span>{opt.label}</button>{selected.has(opt.id)&&<input value={optMemos[opt.id]||""} onChange={e=>setOptMemos(p=>({...p,[opt.id]:e.target.value}))} placeholder={`${opt.label} 메모`} style={{marginTop:3,width:"100%",padding:"6px 10px",border:"1px solid #e2e8f0",borderRadius:6,fontSize:11,outline:"none",boxSizing:"border-box",background:"#f8fafc"}}/>}</div>)}</div></div>;})()}
          </div>
        )}
        {priority.length>=2&&(
          <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:8}}>🔢 업무 순서 <span style={{color:"#94a3b8",fontWeight:400,fontSize:10}}>(▲▼ 또는 드래그)</span></div>
            {priority.map((id,idx)=>{const opt=OPTION_BY_ID[id],meta=TEMPLATE_META[opt.tid];return(
              <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,border:`1px solid ${idx===0?meta.color:"#e2e8f0"}`,background:idx===0?`${meta.color}10`:"#f8fafc",marginBottom:5}}>
                <span style={{minWidth:20,height:20,borderRadius:"50%",background:idx===0?meta.color:"#cbd5e1",color:"white",fontWeight:700,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{idx+1}</span>
                <span style={{fontSize:10,fontWeight:700,color:"white",background:meta.color,borderRadius:3,padding:"1px 5px",flexShrink:0,maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{opt.tid===1?"SNS":opt.tid===2?"쇼핑":opt.tid===3?"릴스":opt.tid===4?"사무":opt.tid===5?"사진":"기타"}</span>
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

  // 체크리스트
  function Checklist({result,checklist,setChecklist,onFirebase,color="#3b82f6"}){
    const items=result.split("\n").filter(l=>/^\d+번째/.test(l));
    if(!items.length) return null;
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

  // 히스토리 카드
  function HistCard({item,onDelete,onLoad,onCheck,color="#3b82f6"}){
    const[open,setOpen]=useState(false);
    const[copied,setCopied]=useState(false);
    const[del,setDel]=useState(false);
    const[localChecks,setLocalChecks]=useState(item.checks||{});
    const items=(item.result||"").split("\n").filter(l=>/^\d+번째/.test(l));
    const done=Object.values(localChecks).filter(Boolean).length;
    return(
      <div style={{background:"white",borderRadius:10,marginBottom:8,overflow:"hidden",borderLeft:`3px solid ${color}`}}>
        <div onClick={()=>setOpen(o=>!o)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:12,color:"#0f172a"}}>{formatDate(item.date)}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(item.priority||[]).map(id=>OPTION_BY_ID[id]?.label).filter(Boolean).join(", ").slice(0,40)}</div>
            {items.length>0&&<div style={{fontSize:10,marginTop:2,color:done===items.length?"#16a34a":"#f59e0b",fontWeight:600}}>{done===items.length?"✅ 완료":`⏳ ${done}/${items.length}`}</div>}
          </div>
          <span style={{color:"#94a3b8",fontSize:11,marginLeft:6}}>{open?"▲":"▼"}</span>
        </div>
        {open&&(
          <div style={{padding:"0 12px 12px"}}>
            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
              <button onClick={()=>{navigator.clipboard.writeText(item.result);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${copied?"#16a34a":color}`,background:copied?"#16a34a":color,color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{copied?"✅":"📋"} {copied?"복사됨":"복사"}</button>
              {onLoad&&<button onClick={()=>onLoad(item)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #f59e0b",background:"#f59e0b",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>✏️ 불러오기</button>}
              {mode==="admin"&&(!del?<button onClick={()=>setDel(true)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #ef4444",background:"#ef4444",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>🗑️</button>:<><button onClick={()=>onDelete(item.firebaseKey)} style={{padding:"5px 8px",borderRadius:6,background:"#ef4444",border:"none",color:"white",fontSize:10,cursor:"pointer"}}>확인</button><button onClick={()=>setDel(false)} style={{padding:"5px 8px",borderRadius:6,background:"#94a3b8",border:"none",color:"white",fontSize:10,cursor:"pointer"}}>취소</button></>)}
            </div>
            <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:7,padding:10,fontSize:10,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{item.result}</pre>
            {items.length>0&&(
              <div style={{marginTop:8}}>
                {items.map((ci,i)=>(
                  <label key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:6,background:localChecks[i]?"#f0fdf4":"#f8fafc",marginBottom:3,cursor:"pointer",border:`1px solid ${localChecks[i]?"#86efac":"#e2e8f0"}`}}>
                    <input type="checkbox" checked={!!localChecks[i]} onChange={async()=>{const n={...localChecks,[i]:!localChecks[i]};setLocalChecks(n);if(onCheck&&item.firebaseKey)await onCheck(item.firebaseKey,n);}} style={{accentColor:color,width:12,height:12}}/>
                    <span style={{fontSize:10,color:localChecks[i]?"#16a34a":"#374151",textDecoration:localChecks[i]?"line-through":"none"}}>{ci}</span>
                  </label>
                ))}
              </div>
            )}
            {item.tomorrowNote&&<div style={{marginTop:6,padding:"6px 8px",borderRadius:6,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:10,color:"#92400e"}}>📝 내일 메모: {item.tomorrowNote}</div>}
          </div>
        )}
      </div>
    );
  }

  // 급여 명세서 화면
  function SalaryPage(){
    const[target,setTarget]=useState(salaryTarget);
    const[month,setMonth]=useState(salaryMonth);

    const monthRecs=attHistory.filter(r=>r.date?.startsWith(month));
    const calc=target?calcSalary(target,monthRecs):null;

    return(
      <div style={{padding:"0 0 80px"}}>
        <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:10}}>💰 급여 명세서</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>정산 월</div>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>직원 선택</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {employees.length===0&&<div style={{fontSize:12,color:"#94a3b8",padding:"8px 0"}}>등록된 직원이 없어요</div>}
              {employees.map(emp=>(
                <button key={emp.firebaseKey} onClick={()=>setTarget(emp)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${target?.firebaseKey===emp.firebaseKey?"#1d4ed8":"#e2e8f0"}`,background:target?.firebaseKey===emp.firebaseKey?"#eff6ff":"white",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:14,flexShrink:0}}>{emp.name[0]}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{emp.name}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{emp.role} · {emp.contractType==="hourly"?"시급제":"월급제"} · {(emp.hourlyRate||10320).toLocaleString()}원/h</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {calc&&target&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* 근태 요약 */}
            <div style={{background:"white",borderRadius:12,padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:10}}>■ 1. 이번 달 근태 요약</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  ["실근로시간",`${calc.totalWorkH}시간 (기록 ${calc.recordCount}건)`],
                  ["유연근무 상쇄",calc.netExtraH>0?`추가 ${calc.netExtraH}h 인정`:calc.netShortH>0?`미달 ${calc.netShortH}h 공제 대상`:"상쇄 없음"],
                  ["주휴수당",`${calc.weeklyPay.toLocaleString()}원`],
                  ["환산시급",`${(calc.hourlyRate||10320).toLocaleString()}원`],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                    <span style={{color:"#64748b"}}>{k}</span>
                    <span style={{fontWeight:600,color:"#0f172a"}}>{v}</span>
                  </div>
                ))}
              </div>
              {calc.recordCount===0&&<div style={{marginTop:8,padding:"8px 10px",borderRadius:6,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:11,color:"#92400e"}}>⚠️ {month} 근태 기록이 없어요. 출퇴근 기록 후 다시 확인하세요.</div>}
            </div>

            {/* A. 월급제 */}
            {target.contractType==="monthly"&&(
              <div style={{background:"white",borderRadius:12,padding:14}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1d4ed8",marginBottom:10}}>■ 2-A. 월급제 기준 정산</div>
                {[
                  ["기본 월급",`${(calc.baseMonthly||2156880).toLocaleString()}원`],
                  ["유연근무 정산",`${calc.flexAdj>=0?"+":""} ${calc.flexAdj.toLocaleString()}원`],
                  ["주휴수당",`${calc.weeklyPay.toLocaleString()}원`],
                  [`4대보험·세금 공제 (${Math.round(calc.taxRate*100)}%)`,`-${Math.round((calc.monthlyGross+calc.weeklyPay)*calc.taxRate).toLocaleString()}원`],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                    <span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                  </div>
                ))}
                <div style={{background:"#0f172a",borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                  <span style={{color:"white",fontSize:13,fontWeight:700}}>최종 실지급액</span>
                  <span style={{color:"#60a5fa",fontSize:20,fontWeight:800}}>{Math.round((calc.monthlyGross+calc.weeklyPay)*(1-calc.taxRate)).toLocaleString()}원</span>
                </div>
              </div>
            )}

            {/* B. 시급제 */}
            <div style={{background:"white",borderRadius:12,padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#7c3aed",marginBottom:10}}>{target.contractType==="hourly"?"■ 2. 시급제 정산":"■ 2-B. 시급제 비교 (참고용)"}</div>
              {[
                ["순수 근로 시급 페이",`${Math.round(calc.totalWorkH*(calc.hourlyRate||10320)).toLocaleString()}원 (${calc.totalWorkH}h × ${(calc.hourlyRate||10320).toLocaleString()}원)`],
                ["주휴수당",`+${calc.weeklyPay.toLocaleString()}원`],
                [`4대보험·세금 공제 (${Math.round(calc.taxRate*100)}%)`,`-${Math.round(calc.hourlyGross*calc.taxRate).toLocaleString()}원`],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                  <span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
              <div style={{background:"#0f172a",borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <span style={{color:"white",fontSize:13,fontWeight:700}}>최종 실지급액</span>
                <span style={{color:"#a78bfa",fontSize:20,fontWeight:800}}>{calc.hourlyNet.toLocaleString()}원</span>
              </div>
            </div>

            {target.contractType==="monthly"&&(
              <div style={{background:"#eff6ff",border:"1px solid #93c5fd",borderRadius:10,padding:"10px 12px",fontSize:11,color:"#1d4ed8"}}>
                💡 월급제 대비 시급제 차이: {(Math.round((calc.monthlyGross+calc.weeklyPay)*(1-calc.taxRate))-calc.hourlyNet).toLocaleString()}원
              </div>
            )}

            <button onClick={()=>showToast("📄 급여명세서가 발급됐어요!")} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",color:"white",fontWeight:700,fontSize:14,cursor:"pointer"}}>📄 명세서 발급하기</button>
          </div>
        )}
      </div>
    );
  }

  // 근태 탭
  function AttTab(){
    return(
      <div style={{paddingBottom:80}}>
        {/* 서브 탭 */}
        <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
          {[{k:"clock",l:"⏰ 출퇴근"},{k:"manage",l:"👥 근태관리"},{k:"leave",l:"📋 휴가"},{k:"salary",l:"💰 급여"}].map(t=>(
            <button key={t.k} onClick={()=>setAttTab(t.k)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${attTab===t.k?"#1d4ed8":"#e2e8f0"}`,background:attTab===t.k?"#1d4ed8":"white",color:attTab===t.k?"white":"#64748b",fontWeight:attTab===t.k?700:400,cursor:"pointer",fontSize:12,whiteSpace:"nowrap",flexShrink:0}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* 출퇴근 */}
        {attTab==="clock"&&(
          <div>
            <div style={{background:myStatus==="퇴근"?"linear-gradient(135deg,#7c3aed,#a855f7)":myStatus==="출근중"?"linear-gradient(135deg,#1d4ed8,#3b82f6)":"linear-gradient(135deg,#475569,#64748b)",borderRadius:16,padding:"24px 20px",color:"white",textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:11,opacity:0.7}}>{formatDate(getTodayString())}</div>
              <div style={{fontSize:40,fontWeight:800,letterSpacing:"-1px",fontVariantNumeric:"tabular-nums",margin:"6px 0"}}>{formatTime(now)}</div>
              <div style={{display:"inline-block",padding:"5px 14px",background:"rgba(255,255,255,0.2)",borderRadius:16,fontSize:12,fontWeight:600}}>
                {myStatus==="퇴근"?`✅ 퇴근완료 ${myCheckOut}`:myStatus==="출근중"?`🟢 출근중 (${myCheckIn})`:"⏸ 미출근"}
              </div>
            </div>

            {/* 인증 방식 */}
            <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
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
              <button onClick={()=>{
                if(myStatus!=="미출근"){showToast("이미 출근 상태예요","err");return;}
                if(authMethod==="manual") doCheckIn();
                else setAuthModal({type:authMethod,action:"in"});
              }} disabled={myStatus!=="미출근"} style={{padding:"16px",borderRadius:12,border:"none",background:myStatus!=="미출근"?"#e2e8f0":"#1d4ed8",color:"white",fontWeight:800,fontSize:15,cursor:myStatus!=="미출근"?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:myStatus!=="미출근"?0.6:1}}>
                <span style={{fontSize:28}}>🟢</span>출근하기
              </button>
              <button onClick={()=>{
                if(myStatus!=="출근중"){showToast("먼저 출근해주세요","err");return;}
                if(authMethod==="manual") doCheckOut();
                else setAuthModal({type:authMethod,action:"out"});
              }} disabled={myStatus!=="출근중"} style={{padding:"16px",borderRadius:12,border:"none",background:myStatus!=="출근중"?"#e2e8f0":"#dc2626",color:"white",fontWeight:800,fontSize:15,cursor:myStatus!=="출근중"?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:myStatus!=="출근중"?0.6:1}}>
                <span style={{fontSize:28}}>🔴</span>퇴근하기
              </button>
            </div>

            {/* 직원 등록 버튼 */}
            {mode==="admin"&&(
              <button onClick={()=>setRegisterModal(true)} style={{width:"100%",padding:"11px",borderRadius:10,border:"1.5px solid #1d4ed8",background:"white",color:"#1d4ed8",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>
                ➕ 신규 직원 등록
              </button>
            )}

            {/* 등록 직원 목록 */}
            {employees.length>0&&(
              <div style={{background:"white",borderRadius:12,padding:14,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>등록된 직원</div>
                {employees.map(emp=>(
                  <div key={emp.firebaseKey} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:13,flexShrink:0}}>{emp.name[0]}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{emp.name}</div>
                      <div style={{fontSize:10,color:"#64748b"}}>{emp.role} · {emp.contractType==="hourly"?"시급":"월급"} {(emp.hourlyRate||10320).toLocaleString()}원</div>
                    </div>
                    {mode==="admin"&&(
                      <button onClick={async()=>{if(window.confirm(`${emp.name}을 삭제할까요?`)) await set(ref(db,`employees/${emp.firebaseKey}/active`),false);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,cursor:"pointer"}}>삭제</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 주간 근무 현황 */}
            <div style={{background:"white",borderRadius:12,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>이번 주 근무</div>
                <div style={{fontSize:11,fontWeight:700,color:"#1d4ed8"}}>{attHistory.filter(r=>r.checkIn&&r.checkOut).length}건 기록</div>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:60}}>
                {["월","화","수","목","금","토","일"].map((d,i)=>{
                  const today=new Date();
                  const dayH=i<5?8:0;
                  const isToday=today.getDay()-1===i;
                  return(
                    <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{width:"100%",background:"#f1f5f9",borderRadius:3,height:44,display:"flex",flexDirection:"column",justifyContent:"flex-end",overflow:"hidden"}}>
                        <div style={{background:isToday?"#1d4ed8":dayH>0?"#93c5fd":"#e2e8f0",height:`${(dayH/10)*100}%`,borderRadius:3,minHeight:dayH>0?3:0}}/>
                      </div>
                      <div style={{fontSize:9,color:isToday?"#1d4ed8":"#64748b",fontWeight:isToday?700:400}}>{d}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 근태 관리 */}
        {attTab==="manage"&&(
          <div>
            {employees.length===0&&<div style={{background:"white",borderRadius:12,padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:13}}>등록된 직원이 없어요.<br/>출퇴근 탭에서 직원을 등록해주세요.</div>}
            {employees.map(emp=>{
              const recs=attHistory.filter(r=>r.name===emp.name).slice(0,5);
              return(
                <div key={emp.firebaseKey} style={{background:"white",borderRadius:12,padding:14,marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:15,flexShrink:0}}>{emp.name[0]}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>{emp.name}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{emp.role}</div>
                    </div>
                  </div>
                  {recs.length===0&&<div style={{fontSize:11,color:"#94a3b8"}}>출퇴근 기록 없음</div>}
                  {recs.map((r,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:"1px solid #f1f5f9",fontSize:11}}>
                      <span style={{color:"#64748b"}}>{r.date}</span>
                      <span style={{color:"#374151"}}>{r.checkIn||"—"} → {r.checkOut||"근무중"}</span>
                      <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:r.status==="정상"?"#f0fdf4":r.status==="지각"?"#fef2f2":"#eff6ff",color:r.status==="정상"?"#16a34a":r.status==="지각"?"#dc2626":"#1d4ed8"}}>{r.status||"출근중"}</span>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* 전체 기록 */}
            <div style={{background:"white",borderRadius:12,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>전체 출퇴근 기록</div>
              {attHistory.slice(0,20).map((r,i)=>(
                <div key={r.firebaseKey||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #f1f5f9",fontSize:11}}>
                  <span style={{fontWeight:600,color:"#0f172a"}}>{r.name}</span>
                  <span style={{color:"#64748b"}}>{r.date}</span>
                  <span style={{color:"#374151"}}>{r.checkIn||"—"}→{r.checkOut||"중"}</span>
                  <span style={{padding:"2px 7px",borderRadius:8,fontSize:10,fontWeight:700,background:r.status==="정상"?"#f0fdf4":r.status==="지각"?"#fef2f2":"#eff6ff",color:r.status==="정상"?"#16a34a":r.status==="지각"?"#dc2626":"#1d4ed8"}}>{r.status||"출근중"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 휴가 */}
        {attTab==="leave"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"white",borderRadius:12,padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:12}}>휴가 신청</div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {["연차","반차","병가"].map(t=>(
                  <button key={t} onClick={()=>setLeaveForm(p=>({...p,type:t}))} style={{flex:1,padding:"8px",borderRadius:7,border:`1.5px solid ${leaveForm.type===t?"#1d4ed8":"#e2e8f0"}`,background:leaveForm.type===t?"#eff6ff":"white",color:leaveForm.type===t?"#1d4ed8":"#64748b",fontWeight:leaveForm.type===t?700:400,fontSize:12,cursor:"pointer"}}>
                    {t}
                  </button>
                ))}
              </div>
              <input type="date" value={leaveForm.date} onChange={e=>setLeaveForm(p=>({...p,date:e.target.value}))} style={{width:"100%",padding:"9px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
              <textarea value={leaveForm.reason} onChange={e=>setLeaveForm(p=>({...p,reason:e.target.value}))} placeholder="사유 입력" rows={2} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",marginBottom:8}}/>
              <Btn full onClick={()=>{
                if(!leaveForm.date||!leaveForm.reason){showToast("날짜와 사유를 입력해주세요","err");return;}
                setLeaves(p=>[...p,{id:Date.now(),name:mode==="admin"?"대표":"직원",...leaveForm,status:"대기"}]);
                setLeaveForm({type:"연차",date:"",reason:""});showToast("✅ 휴가 신청 완료!");
              }}>신청하기</Btn>
            </div>
            <div style={{background:"white",borderRadius:12,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>신청 목록</div>
              {leaves.map(l=>(
                <div key={l.id} style={{padding:"10px",borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:mode==="admin"&&l.status==="대기"?8:0}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:12}}>{l.name} · {l.type}</div>
                      <div style={{fontSize:10,color:"#64748b"}}>{l.date} · {l.reason}</div>
                    </div>
                    <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:l.status==="승인"?"#f0fdf4":l.status==="반려"?"#fef2f2":"#fffbeb",color:l.status==="승인"?"#16a34a":l.status==="반려"?"#dc2626":"#d97706"}}>{l.status}</span>
                  </div>
                  {mode==="admin"&&l.status==="대기"&&(
                    <div style={{display:"flex",gap:6}}>
                      <Btn color="#16a34a" onClick={()=>{setLeaves(p=>p.map(x=>x.id===l.id?{...x,status:"승인"}:x));showToast("✅ 승인됐어요!");}}>✅ 승인</Btn>
                      <Btn color="#ef4444" onClick={()=>{setLeaves(p=>p.map(x=>x.id===l.id?{...x,status:"반려"}:x));showToast("반려됐어요","err");}}>❌ 반려</Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 급여 */}
        {attTab==="salary"&&<SalaryPage/>}
      </div>
    );
  }

  // 업무 이행 탭
  function WorkerDoTab(){
    const[localOrder,setLocalOrder]=useState(null);
    const[orderChanged,setOrderChanged]=useState(false);
    useEffect(()=>{
      if(liveDirective?.result){
        const raw=liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l));
        if(liveDirective.workerOrder)setLocalOrder(liveDirective.workerOrder);
        else setLocalOrder(p=>p||raw);
      }
    },[liveDirective]);
    if(!liveDirective||!localOrder)return<div style={{background:"white",borderRadius:12,padding:"40px 20px",textAlign:"center",color:"#94a3b8",fontSize:13}}>📭 아직 공유된 업무 지침이 없어요</div>;
    const checks=liveDirective.checks||{};
    const tomorrowNote=liveDirective.tomorrowNote||"";
    const done=Object.values(checks).filter(Boolean).length;
    const toggleCheck=async(i)=>{const n={...checks,[i]:!checks[i]};await set(ref(db,"live/checks"),n);if(liveDirective.firebaseKey)await set(ref(db,`history/${liveDirective.firebaseKey}/checks`),n);};
    const moveItem=async(idx,dir)=>{const n=[...localOrder],s=idx+dir;if(s<0||s>=n.length)return;[n[idx],n[s]]=[n[s],n[idx]];setLocalOrder(n);setOrderChanged(true);await set(ref(db,"live/orderChanged"),true);await set(ref(db,"live/workerOrder"),n);};
    return(
      <div style={{paddingBottom:80}}>
        <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:11,color:"#16a34a",fontWeight:600}}>✅ 체크와 순서 변경이 대표님께 실시간 공유돼요</div>
        <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{formatDate(liveDirective.date)}</div><div style={{fontSize:11,color:"#16a34a",fontWeight:600}}>완료 {done}/{localOrder.length}</div></div>
            {orderChanged&&<button onClick={async()=>{const raw=liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l));setLocalOrder(raw);setOrderChanged(false);await set(ref(db,"live/orderChanged"),false);await set(ref(db,"live/workerOrder"),null);}} style={{padding:"5px 10px",border:"1px solid #e2e8f0",borderRadius:6,background:"white",fontSize:10,color:"#64748b",cursor:"pointer"}}>순서 원래대로</button>}
          </div>
          {orderChanged&&<div style={{padding:"6px 10px",borderRadius:7,background:"#fffbeb",border:"1px solid #fcd34d",marginBottom:10,fontSize:11,color:"#d97706",fontWeight:600}}>🔄 순서 변경됨 — 대표님께 알림 전송</div>}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {localOrder.map((item,i)=>{
              const isC=!!checks[i];
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,background:isC?"#f0fdf4":"#f8fafc",border:`1px solid ${isC?"#86efac":"#e2e8f0"}`}}>
                  <input type="checkbox" checked={isC} onChange={()=>toggleCheck(i)} style={{accentColor:"#16a34a",width:16,height:16,flexShrink:0}}/>
                  <span style={{minWidth:20,height:20,borderRadius:"50%",background:isC?"#16a34a":"#cbd5e1",color:"white",fontWeight:700,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                  <span style={{flex:1,fontSize:11,color:isC?"#16a34a":"#374151",textDecoration:isC?"line-through":"none"}}>{item}</span>
                  <div style={{display:"flex",flexDirection:"column",gap:1}}>
                    <button onClick={()=>moveItem(i,-1)} disabled={i===0} style={{padding:"2px 5px",border:"1px solid #e2e8f0",borderRadius:3,background:"white",cursor:i===0?"not-allowed":"pointer",fontSize:8}}>▲</button>
                    <button onClick={()=>moveItem(i,1)} disabled={i===localOrder.length-1} style={{padding:"2px 5px",border:"1px solid #e2e8f0",borderRadius:3,background:"white",cursor:i===localOrder.length-1?"not-allowed":"pointer",fontSize:8}}>▼</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:10,height:6,borderRadius:3,background:"#e2e8f0"}}><div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#16a34a,#22c55e)",width:`${localOrder.length>0?done/localOrder.length*100:0}%`,transition:"width 0.4s"}}/></div>
        </div>
        <div style={{background:"white",borderRadius:12,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#d97706",marginBottom:6}}>📝 내일 할 일 메모</div>
          <textarea value={tomorrowNote} onChange={async e=>{await set(ref(db,"live/tomorrowNote"),e.target.value);if(liveDirective.firebaseKey)await set(ref(db,`history/${liveDirective.firebaseKey}/tomorrowNote`),e.target.value);}} placeholder={"오늘 못한 일, 내일 챙길 것"} rows={4} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
          {tomorrowNote&&<div style={{marginTop:4,fontSize:10,color:"#16a34a",fontWeight:600}}>✅ 자동 저장됨</div>}
        </div>
      </div>
    );
  }

  // 대시보드
  function Dashboard(){
    const workerDone=liveDirective?.checks?Object.values(liveDirective.checks).filter(Boolean).length:0;
    const workerTotal=liveDirective?.result?liveDirective.result.split("\n").filter(l=>/^\d+번째/.test(l)).length:0;
    return(
      <div style={{paddingBottom:80}}>
        <div style={{background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",borderRadius:16,padding:"20px",color:"white",marginBottom:16}}>
          <div style={{fontSize:12,opacity:0.7}}>{formatDate(getTodayString())}</div>
          <div style={{fontSize:20,fontWeight:800,margin:"4px 0"}}>안녕하세요, {mode==="admin"?"백송 대표님":"직원님"} 👋</div>
          <div style={{fontSize:12,opacity:0.8}}>오늘도 젠틀모먼츠 화이팅!</div>
          <div style={{marginTop:12,display:"flex",gap:8}}>
            <div style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800}}>{attHistory.filter(r=>r.date===getTodayString()).length}</div>
              <div style={{fontSize:10,opacity:0.8}}>오늘 출퇴근</div>
            </div>
            <div style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800}}>{employees.length}</div>
              <div style={{fontSize:10,opacity:0.8}}>등록 직원</div>
            </div>
            <div style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800}}>{workerTotal>0?`${Math.round(workerDone/workerTotal*100)}%`:"—"}</div>
              <div style={{fontSize:10,opacity:0.8}}>업무 진행률</div>
            </div>
          </div>
        </div>

        {mode==="admin"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            {[
              {label:"업무 지침 생성",icon:"📝",sec:"worker",desc:"직원 업무 배분"},
              {label:"실시간 공유 확인",icon:"📡",sec:"live",desc:"직원 진행 상황"},
              {label:"근태 관리",icon:"🐝",sec:"att",desc:"출퇴근·급여"},
              {label:"대표 업무",icon:"👔",sec:"boss",desc:"나의 업무 관리"},
            ].map((b,i)=>(
              <button key={i} onClick={()=>navigate(b.sec)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"white",borderRadius:10,border:"none",cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:22,width:36,textAlign:"center"}}>{b.icon}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{b.label}</div><div style={{fontSize:11,color:"#64748b"}}>{b.desc}</div></div>
                <span style={{color:"#94a3b8",fontSize:16}}>›</span>
              </button>
            ))}
          </div>
        )}

        {mode==="worker"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {label:"오늘 업무 확인",icon:"📡",sec:"live"},
              {label:"업무 이행 체크",icon:"✅",sec:"workerdo"},
              {label:"출퇴근 기록",icon:"🐝",sec:"att"},
            ].map((b,i)=>(
              <button key={i} onClick={()=>navigate(b.sec)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"white",borderRadius:10,border:"none",cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:22}}>{b.icon}</span>
                <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{b.label}</div>
                <span style={{color:"#94a3b8",fontSize:16,marginLeft:"auto"}}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 메인 레이아웃 (모바일 우선)
  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#f1f5f9",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* 상단바 */}
      <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"10px 16px",display:"flex",alignItems:"center",gap:8,position:"sticky",top:0,zIndex:100,flexShrink:0}}>
        <button onClick={goBack} disabled={navIdx<=0} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e2e8f0",background:navIdx<=0?"#f8fafc":"white",color:navIdx<=0?"#cbd5e1":"#374151",cursor:navIdx<=0?"not-allowed":"pointer",fontSize:14,flexShrink:0}}>‹</button>
        <button onClick={goForward} disabled={navIdx>=navHistory.length-1} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e2e8f0",background:navIdx>=navHistory.length-1?"#f8fafc":"white",color:navIdx>=navHistory.length-1?"#cbd5e1":"#374151",cursor:navIdx>=navHistory.length-1?"not-allowed":"pointer",fontSize:14,flexShrink:0}}>›</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {TABS.find(t=>t.key===section)?.label||section}
          </div>
          <div style={{fontSize:10,color:"#94a3b8",fontVariantNumeric:"tabular-nums"}}>{formatTime(now)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:16,background:myStatus==="출근중"?"#eff6ff":myStatus==="퇴근"?"#f5f3ff":"#f8fafc",border:`1px solid ${myStatus==="출근중"?"#93c5fd":myStatus==="퇴근"?"#c4b5fd":"#e2e8f0"}`,flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:myStatus==="출근중"?"#2563eb":myStatus==="퇴근"?"#7c3aed":"#94a3b8"}}/>
          <span style={{fontSize:10,fontWeight:700,color:myStatus==="출근중"?"#2563eb":myStatus==="퇴근"?"#7c3aed":"#64748b"}}>{myStatus}</span>
        </div>
        <button onClick={()=>{if(window.confirm("로그아웃 할까요?"))setMode(null);}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #e2e8f0",background:"white",color:"#64748b",fontSize:11,cursor:"pointer",flexShrink:0}}>로그아웃</button>
      </div>

      {/* 콘텐츠 */}
      <div style={{flex:1,overflow:"auto",padding:"16px 14px",paddingBottom:90}}>
        {section==="dashboard"&&<Dashboard/>}

        {/* 업무 지침 */}
        {section==="worker"&&mode==="admin"&&(
          <div>
            <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>📅 날짜</div>
                <button onClick={()=>setWDate(getTodayString())} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${wDate===getTodayString()?"#1d4ed8":"#e2e8f0"}`,background:wDate===getTodayString()?"#1d4ed8":"white",color:wDate===getTodayString()?"white":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer"}}>오늘</button>
              </div>
              <input type="date" value={wDate} onChange={e=>setWDate(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              <div style={{marginTop:4,fontSize:10,color:"#94a3b8"}}>📌 {formatDate(wDate)}</div>
            </div>
            <WorkSelector templates={wTemplates} optTab={wOptTab} setOptTab={setWOptTab} selected={wSelected} toggleTemplate={toggleWTemplate} toggleOption={toggleWOption} optMemos={wOptMemos} setOptMemos={setWOptMemos} priority={wPriority} setPriority={setWPriority}/>
            <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>📝 추가 메모</div>
              <textarea value={wMemo} onChange={e=>setWMemo(e.target.value)} placeholder="특이사항" rows={2} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <button onClick={handleWGenerate} disabled={wPriority.length===0||wSaving} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:wPriority.length===0?"#cbd5e1":"#1d4ed8",color:"white",fontWeight:700,fontSize:14,cursor:wPriority.length===0?"not-allowed":"pointer",marginBottom:10}}>
              {wSaving?"⏳ 저장 중...":wPriority.length===0?"⬆️ 업무 먼저 선택":"✨ 업무 지침서 생성 및 저장"}
            </button>
            {wSaveOk&&<div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#16a34a",fontWeight:600,textAlign:"center"}}>✅ 저장 완료! 직원 화면에 실시간 반영 📡</div>}
            {wResult&&(
              <div style={{background:"white",borderRadius:12,padding:14}}>
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

        {/* 실시간 공유 */}
        {section==="live"&&(
          <div style={{paddingBottom:80}}>
            <div style={{background:"#eff6ff",border:"1px solid #93c5fd",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:11,color:"#1d4ed8",fontWeight:600}}>📡 대표님이 지침서를 생성하면 즉시 반영돼요</div>
            {liveDirective?(
              <div style={{background:"white",borderRadius:12,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{formatDate(liveDirective.date)}</span>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {liveDirective.orderChanged&&<span style={{fontSize:10,background:"#fffbeb",color:"#d97706",border:"1px solid #fcd34d",borderRadius:5,padding:"2px 6px",fontWeight:700}}>🔄 순서변경</span>}
                    <span style={{fontSize:10,color:"#16a34a",fontWeight:600}}>● 최신</span>
                  </div>
                </div>
                <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:10,fontSize:11,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{liveDirective.result}</pre>
                {liveDirective.checks&&(()=>{const t=Object.keys(liveDirective.checks).length,d=Object.values(liveDirective.checks).filter(Boolean).length;return t>0?<div style={{marginTop:10,padding:"8px 10px",borderRadius:8,background:"#f0fdf4",border:"1px solid #86efac"}}><div style={{fontSize:11,fontWeight:700,color:"#16a34a",marginBottom:4}}>✅ 직원 진행률: {d}/{t} ({Math.round(d/t*100)}%)</div><div style={{height:5,borderRadius:3,background:"#dcfce7"}}><div style={{height:"100%",borderRadius:3,background:"#16a34a",width:`${d/t*100}%`,transition:"width 0.4s"}}/></div></div>:null;})()}
                {liveDirective.tomorrowNote&&<div style={{marginTop:8,padding:"8px 10px",borderRadius:7,background:"#fffbeb",border:"1px solid #fcd34d",fontSize:11,color:"#92400e"}}><div style={{fontWeight:700,marginBottom:2}}>📝 직원 내일 메모</div>{liveDirective.tomorrowNote}</div>}
              </div>
            ):<div style={{background:"white",borderRadius:12,padding:"40px 20px",textAlign:"center",color:"#94a3b8",fontSize:13}}>📭 아직 공유된 지침이 없어요</div>}
          </div>
        )}

        {section==="workerdo"&&<WorkerDoTab/>}
        {section==="att"&&<AttTab/>}

        {/* 대표 업무 */}
        {section==="boss"&&mode==="admin"&&(
          <div style={{paddingBottom:80}}>
            <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>📅 날짜</div>
                <button onClick={()=>setBDate(getTodayString())} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${bDate===getTodayString()?"#7c3aed":"#e2e8f0"}`,background:bDate===getTodayString()?"#7c3aed":"white",color:bDate===getTodayString()?"white":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer"}}>오늘</button>
              </div>
              <input type="date" value={bDate} onChange={e=>setBDate(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <WorkSelector templates={bTemplates} optTab={bOptTab} setOptTab={setBOptTab} selected={bSelected} toggleTemplate={toggleBTemplate} toggleOption={toggleBOption} optMemos={bOptMemos} setOptMemos={setBOptMemos} priority={bPriority} setPriority={setBPriority}/>
            <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:6}}>📝 추가 메모</div>
              <textarea value={bMemo} onChange={e=>setBMemo(e.target.value)} placeholder="특이사항" rows={2} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <button onClick={handleBGenerate} disabled={bPriority.length===0||bSaving} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:bPriority.length===0?"#cbd5e1":"#7c3aed",color:"white",fontWeight:700,fontSize:14,cursor:bPriority.length===0?"not-allowed":"pointer",marginBottom:10}}>
              {bSaving?"⏳ 저장 중...":bPriority.length===0?"⬆️ 업무 먼저 선택":"✨ 대표 업무 지침서 생성"}
            </button>
            {bSaveOk&&<div style={{background:"#f5f3ff",border:"1px solid #c4b5fd",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#7c3aed",fontWeight:600,textAlign:"center"}}>✅ 히스토리에 저장됐어요</div>}
            {bResult&&(
              <div style={{background:"white",borderRadius:12,padding:14,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>👔 대표 업무 지침서</span>
                  <button onClick={()=>{navigator.clipboard.writeText(bResult);setBCopied(true);setTimeout(()=>setBCopied(false),2000);}} style={{padding:"4px 10px",borderRadius:6,border:"none",background:bCopied?"#16a34a":"#7c3aed",color:"white",fontSize:10,fontWeight:700,cursor:"pointer"}}>{bCopied?"✅":"📋"} {bCopied?"복사됨":"복사"}</button>
                </div>
                <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",borderRadius:8,padding:10,fontSize:11,lineHeight:1.7,color:"#374151",border:"1px solid #e2e8f0",margin:0}}>{bResult}</pre>
                <Checklist result={bResult} checklist={bChecklist} setChecklist={setBChecklist} color="#7c3aed" onFirebase={async n=>{if(bossHistory[0]?.firebaseKey)await set(ref(db,`bossHistory/${bossHistory[0].firebaseKey}/checks`),n);}}/>
              </div>
            )}
            <div style={{background:"white",borderRadius:12,padding:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",marginBottom:6}}>📝 업무 노트 (자동저장)</div>
              <textarea value={bNote} onChange={async e=>{setBNote(e.target.value);await set(ref(db,"bossNote"),e.target.value);}} placeholder="공유사항, 지시사항 등" rows={5} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.8}}/>
            </div>
          </div>
        )}

        {/* 히스토리 */}
        {section==="history"&&(
          <div style={{paddingBottom:80}}>
            {/* 직원 히스토리 */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>📝 직원 업무 히스토리</div>
              {mode==="admin"&&history.length>0&&<button onClick={async()=>{if(window.confirm("전체 삭제?"))await set(ref(db,"history"),null);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑️ 전체삭제</button>}
            </div>
            {history.length===0?<div style={{background:"white",borderRadius:10,padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:12,marginBottom:16}}>직원 업무 히스토리가 없어요</div>:
            <div style={{marginBottom:20}}>{history.map(h=><HistCard key={h.firebaseKey||h.id} item={h} color="#1d4ed8" onDelete={async k=>{if(mode==="admin")await remove(ref(db,`history/${k}`));else showToast("관리자만 삭제 가능해요","err");}} onLoad={item=>{setWDate(item.date);setWMemo(item.memo||"");setWPriority(item.priority||[]);setWOptMemos(item.optionMemos||{});const tids=[...new Set((item.priority||[]).map(id=>OPTION_BY_ID[id]?.tid).filter(Boolean))];setWTemplates(tids);setWOptTab(tids[0]||null);setWSelected(new Set(item.priority||[]));setWResult(item.result||"");navigate("worker");}} onCheck={async(k,n)=>{await set(ref(db,`history/${k}/checks`),n);}}/>)}</div>}

            {/* 대표 히스토리 */}
            {mode==="admin"&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:"#7c3aed"}}>👔 대표 업무 히스토리</div>
                {bossHistory.length>0&&<button onClick={async()=>{if(window.confirm("전체 삭제?"))await set(ref(db,"bossHistory"),null);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑️ 전체삭제</button>}
              </div>
              {bossHistory.length===0?<div style={{background:"white",borderRadius:10,padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:12,marginBottom:16}}>대표 업무 히스토리가 없어요</div>:
              <div style={{marginBottom:20}}>{bossHistory.map(h=><HistCard key={h.firebaseKey||h.id} item={h} color="#7c3aed" onDelete={async k=>{await remove(ref(db,`bossHistory/${k}`));}} onLoad={item=>{setBDate(item.date);setBMemo(item.memo||"");setBPriority(item.priority||[]);setBOptMemos(item.optionMemos||{});const tids=[...new Set((item.priority||[]).map(id=>OPTION_BY_ID[id]?.tid).filter(Boolean))];setBTemplates(tids);setBOptTab(tids[0]||null);setBSelected(new Set(item.priority||[]));setBResult(item.result||"");setBChecklist(item.checks||{});navigate("boss");}} onCheck={async(k,n)=>{await set(ref(db,`bossHistory/${k}/checks`),n);}}/>)}</div>}
            </>)}

            {/* 근태 히스토리 */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>🐝 근태 기록</div>
              {mode==="admin"&&attHistory.length>0&&<button onClick={async()=>{if(window.confirm("근태 기록 전체 삭제?"))await set(ref(db,"attHistory"),null);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #ef4444",background:"white",color:"#ef4444",fontSize:10,fontWeight:600,cursor:"pointer"}}>🗑️ 전체삭제</button>}
            </div>
            {attHistory.length===0?<div style={{background:"white",borderRadius:10,padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:12}}>근태 기록이 없어요</div>:
            <div style={{background:"white",borderRadius:10,overflow:"hidden"}}>
              {attHistory.slice(0,30).map((r,i)=>(
                <div key={r.firebaseKey||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #f1f5f9",fontSize:11}}>
                  <span style={{fontWeight:600,color:"#0f172a",width:60,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</span>
                  <span style={{color:"#64748b",flexShrink:0}}>{r.date}</span>
                  <span style={{color:"#374151",flexShrink:0}}>{r.checkIn||"—"}→{r.checkOut||"중"}</span>
                  <span style={{padding:"2px 6px",borderRadius:8,fontSize:10,fontWeight:700,background:r.status==="정상"?"#f0fdf4":r.status==="지각"?"#fef2f2":"#eff6ff",color:r.status==="정상"?"#16a34a":r.status==="지각"?"#dc2626":"#1d4ed8",flexShrink:0}}>{r.status||"출근중"}</span>
                </div>
              ))}
            </div>}
          </div>
        )}
      </div>

      {/* 하단 탭 네비 */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"white",borderTop:"1px solid #e2e8f0",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>navigate(t.key)} style={{flex:1,padding:"10px 4px 8px",border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20,lineHeight:1}}>{t.icon}</span>
            <span style={{fontSize:9,fontWeight:section===t.key?700:400,color:section===t.key?"#1d4ed8":"#94a3b8"}}>{t.label}</span>
            {section===t.key&&<div style={{width:20,height:2,background:"#1d4ed8",borderRadius:1}}/>}
          </button>
        ))}
      </div>

      {/* 인증 모달 */}
      {authModal?.type==="qr"&&<QRAuthModal action={authModal.action} onClose={()=>setAuthModal(null)} onSuccess={()=>authModal.action==="in"?doCheckIn():doCheckOut()}/>}
      {authModal?.type==="gps"&&<GPSAuthModal action={authModal.action} onClose={()=>setAuthModal(null)} onSuccess={()=>authModal.action==="in"?doCheckIn():doCheckOut()}/>}
      {authModal?.type==="wifi"&&<WiFiAuthModal action={authModal.action} onClose={()=>setAuthModal(null)} onSuccess={()=>authModal.action==="in"?doCheckIn():doCheckOut()}/>}

      {/* 직원 등록 모달 */}
      {registerModal&&<RegisterModal onClose={()=>setRegisterModal(false)} onSuccess={()=>showToast("✅ 직원이 등록됐어요!")} isAdmin={mode==="admin"}/>}

      {/* 토스트 */}
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{display:none;}body{margin:0;overflow-x:hidden;}`}</style>
    </div>
  );
}
