import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";

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

const TEMPLATE_META = {
  1: { label: "📱 SNS 업무",            color: "#667eea", bg: "#f0f0ff" },
  2: { label: "🛍️ 쇼핑몰 관리",         color: "#f5576c", bg: "#fff0f3" },
  3: { label: "🎬 릴스 제작 및 업로드",  color: "#f7971e", bg: "#fff8f0" },
  4: { label: "📋 사무업무",             color: "#43b89c", bg: "#f0faf7" },
  5: { label: "📷 사진 업무",            color: "#a855f7", bg: "#faf0ff" },
  6: { label: "📌 기타 업무",            color: "#64748b", bg: "#f4f6f8" },
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
    { id: "sns_upload",     label: "📤 게시글 업로드",        tid: 1 },
    { id: "sns_engage",     label: "💬 소통 및 마무리",       tid: 1 },
  ],
  2: [
    { id: "naver_order",    label: "🛒 젠틀모먼츠 네이버 스스 주문 확인", tid: 2 },
    { id: "coupang_reg",    label: "📦 쿠팡 온채널 물품 등록",             tid: 2 },
    { id: "smartstore_reg", label: "🏪 스스 온채널 물품 등록",             tid: 2 },
    { id: "cs",             label: "💬 CS (고객 문의 응대)",                tid: 2 },
  ],
  3: [
    { id: "reels_plan",   label: "💡 릴스 기획",   tid: 3 },
    { id: "reels_shoot",  label: "🎥 릴스 촬영",   tid: 3 },
    { id: "reels_edit",   label: "✂️ 릴스 편집",   tid: 3 },
    { id: "reels_upload", label: "📤 릴스 업로드", tid: 3 },
  ],
  4: [
    { id: "office_assist", label: "🗂️ 사무보조",  tid: 4 },
    { id: "accounting",    label: "🧾 회계 업무",  tid: 4 },
    { id: "etc",           label: "📌 기타",        tid: 4 },
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
const MARKETING_TIDS = new Set([1, 3]);
const ADMIN_TIDS     = new Set([2, 4]);
const PHOTO_TIDS     = new Set([5]);
const ETC_TIDS       = new Set([6]);

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// "1순위" → "1번째" 로 표시
function orderLabel(n) { return `${n}번째`; }

function generateDirectiveText(date, priority, memo) {
  if (priority.length === 0) return "";
  const items = priority.map((id, idx) => ({ ...OPTION_BY_ID[id], rank: idx + 1 }));
  const top1 = items[0];
  const rest = items.slice(1);
  const morning   = [top1, ...rest.filter(i => (MARKETING_TIDS.has(i.tid) || PHOTO_TIDS.has(i.tid)) && i.id !== top1.id)];
  const afternoon = rest.filter(i => ADMIN_TIDS.has(i.tid));
  const etcItems  = items.filter(i => ETC_TIDS.has(i.tid));

  const morningLines = morning.map(i => `📌 ${orderLabel(i.rank)} · ${TEMPLATE_META[i.tid].label} — ${i.label}`).join("\n");
  const afternoonLines = afternoon.length > 0
    ? afternoon.map(i => `✅ ${orderLabel(i.rank)} · ${TEMPLATE_META[i.tid].label} — ${i.label}`).join("\n")
    : "✅ 오후 루틴 업무 (예약 확인, 문의 응대)";
  const closingItems = items.filter(i => MARKETING_TIDS.has(i.tid));
  const closingLines = closingItems.length > 0
    ? closingItems.map(i => `💬 ${i.label} 댓글·DM 소통 및 마무리`).join("\n")
    : "💬 오늘 업무 최종 점검 및 마무리";
  const etcSection = etcItems.length > 0
    ? `\n🔔 오늘의 특별 일정\n${etcItems.map(i => `• ${i.label}`).join("\n")}` : "";
  const topGoals = items.slice(0, 2).map(i => `• ${i.label} 완료`).join("\n");
  const memoSection = memo.trim() ? `\n📝 추가 메모\n• ${memo.trim()}` : "";

  return `📅 ${formatDate(date)} 업무 지침서

안녕하세요! 오늘도 잘 부탁드려요 😊

🎯 오늘의 핵심 목표
${topGoals}

━━━━━━━━━━━━━━━━━━
🌅 10:00 ~ 12:00 | 집중 업무 블록
━━━━━━━━━━━━━━━━━━
${morningLines}

🍱 12:00 ~ 13:00 | 점심시간

━━━━━━━━━━━━━━━━━━
📁 13:00 ~ 15:00 | 사무 & 루틴 블록
━━━━━━━━━━━━━━━━━━
${afternoonLines}

━━━━━━━━━━━━━━━━━━
📲 15:00 ~ 16:00 | 소통 & 마감 블록
━━━━━━━━━━━━━━━━━━
${closingLines}
${etcSection}${memoSection}

수고하세요! 오늘도 화이팅입니다 💪`;
}

function OptionBtn({ item, isOn, color, bg, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 14px", borderRadius: 10, border: "2px solid",
      borderColor: isOn ? color : "#e8eaf0", background: isOn ? bg : "white",
      color: isOn ? color : "#555", fontWeight: isOn ? 700 : 400,
      cursor: "pointer", fontSize: 13, textAlign: "left", transition: "all 0.18s",
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, border: "2px solid",
        borderColor: isOn ? color : "#ccc", background: isOn ? color : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: 11, color: "white", fontWeight: 700,
      }}>{isOn ? "✓" : ""}</span>
      {item.label}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState("create");
  const [date, setDate] = useState(getTodayString());
  const [activeTemplates, setActiveTemplates] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState(new Set());
  const [priority, setPriority] = useState([]);
  const [memo, setMemo] = useState("");
  const [result, setResult] = useState("");
  const [checklist, setChecklist] = useState({});
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [liveDirective, setLiveDirective] = useState(null);

  useEffect(() => {
    const histRef = ref(db, "history");
    const unsub1 = onValue(histRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data)
          .map(([key, val]) => ({ ...val, firebaseKey: key }))
          .sort((a, b) => b.id - a.id).slice(0, 30);
        setHistory(arr);
      } else setHistory([]);
    });
    const unsub2 = onValue(ref(db, "live"), (snap) => {
      if (snap.val()) setLiveDirective(snap.val());
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const toggleTemplate = (tid) => {
    setActiveTemplates(prev => {
      if (prev.includes(tid)) {
        const removedIds = OPTION_MAP[tid].map(o => o.id);
        setSelectedOptions(p => { const n = new Set(p); removedIds.forEach(id => n.delete(id)); return n; });
        setPriority(p => p.filter(id => !removedIds.includes(id)));
        return prev.filter(t => t !== tid);
      }
      return [...prev, tid];
    });
  };

  const toggleOption = (optId) => {
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(optId)) { next.delete(optId); setPriority(p => p.filter(id => id !== optId)); }
      else { next.add(optId); setPriority(p => [...p, optId]); }
      return next;
    });
  };

  const movePriority = (idx, dir) => {
    setPriority(prev => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleGenerate = async () => {
    const text = generateDirectiveText(date, priority, memo);
    setResult(text);
    const lines = text.split("\n").filter(l => l.startsWith("📌") || l.startsWith("✅") || l.startsWith("💬"));
    const initCheck = {};
    lines.forEach((_, i) => { initCheck[i] = false; });
    setChecklist(initCheck);
    setSaving(true);
    try {
      const item = { date, priority, memo, result: text, id: Date.now(), checks: initCheck, tomorrowNote: "", orderChanged: false };
      await push(ref(db, "history"), item);
      await set(ref(db, "live"), item);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleCopy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const checkItems = result.split("\n").filter(l => l.startsWith("📌") || l.startsWith("✅") || l.startsWith("💬"));
  const isDisabled = saving || priority.length === 0;

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", minHeight: "100vh", background: "#f5f6fa" }}>
      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>📸 젠틀모먼츠</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>직원 업무 관리 시스템</div>
      </div>

      {/* 탭 4개 */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #e8eaf0" }}>
        {[
          { key: "create",  label: "📝 업무 지침" },
          { key: "live",    label: "📡 실시간 공유" },
          { key: "worker",  label: "✅ 업무 이행" },
          { key: "history", label: "🗂️ 히스토리" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "13px 4px", border: "none", background: "none",
            fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? "#667eea" : "#888",
            borderBottom: tab === t.key ? "2px solid #667eea" : "2px solid transparent",
            cursor: "pointer", fontSize: 11, transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── 업무 지침 생성 ── */}
        {tab === "create" && (
          <div>
            <div style={card}>
              <label style={labelStyle}>📅 날짜</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>

            <div style={card}>
              <label style={labelStyle}>🗂️ 업무 템플릿 선택 <span style={{ color: "#667eea", fontSize: 11, fontWeight: 400 }}>(복수 선택 가능)</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                {Object.entries(TEMPLATE_META).map(([tidStr, meta]) => {
                  const tid = Number(tidStr);
                  const isOn = activeTemplates.includes(tid);
                  return (
                    <button key={tid} onClick={() => toggleTemplate(tid)} style={{
                      padding: "11px 12px", borderRadius: 10, border: "2px solid",
                      borderColor: isOn ? meta.color : "#e8eaf0", background: isOn ? meta.bg : "white",
                      color: isOn ? meta.color : "#555", fontWeight: isOn ? 700 : 400,
                      cursor: "pointer", fontSize: 12, textAlign: "left",
                      transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, border: "2px solid",
                        borderColor: isOn ? meta.color : "#ccc", background: isOn ? meta.color : "white",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: "white", fontWeight: 700, flexShrink: 0,
                      }}>{isOn ? "✓" : ""}</span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTemplates.map(tid => {
              const meta = TEMPLATE_META[tid];
              const options = OPTION_MAP[tid];
              const cnt = options.filter(o => selectedOptions.has(o.id)).length;
              return (
                <div key={tid} style={{ ...card, borderLeft: `4px solid ${meta.color}` }}>
                  <label style={{ ...labelStyle, color: meta.color }}>{meta.label} — 세부 업무 선택</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {options.map(opt => (
                      <OptionBtn key={opt.id} item={opt} isOn={selectedOptions.has(opt.id)}
                        color={meta.color} bg={meta.bg} onClick={() => toggleOption(opt.id)} />
                    ))}
                  </div>
                  {cnt > 0 && <div style={{ marginTop: 10, padding: "7px 12px", borderRadius: 8, background: meta.bg, fontSize: 12, color: meta.color, fontWeight: 600 }}>✅ {cnt}개 선택됨</div>}
                </div>
              );
            })}

            {priority.length >= 2 && (
              <div style={card}>
                <label style={labelStyle}>🔢 전체 업무 순서 설정 <span style={{ color: "#667eea", fontSize: 11, fontWeight: 400 }}>(▲▼으로 조정)</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {priority.map((optId, idx) => {
                    const opt = OPTION_BY_ID[optId];
                    const meta = TEMPLATE_META[opt.tid];
                    return (
                      <div key={optId} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                        background: idx === 0 ? `${meta.color}15` : "#fafafa",
                        border: `2px solid ${idx === 0 ? meta.color : "#e8eaf0"}`,
                      }}>
                        <span style={{
                          minWidth: 26, height: 26, borderRadius: "50%",
                          background: idx === 0 ? meta.color : "#ddd",
                          color: "white", fontWeight: 700, fontSize: 12,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "white", background: meta.color, borderRadius: 4, padding: "1px 7px", marginRight: 6 }}>{meta.label}</span>
                          <span style={{ fontSize: 13, fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? meta.color : "#444" }}>{opt.label}</span>
                          {idx === 0 && <span style={{ marginLeft: 6, fontSize: 10, color: meta.color, fontWeight: 700 }}>⭐ 첫번째</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                          <button onClick={() => movePriority(idx, -1)} disabled={idx === 0} style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #ddd", background: idx === 0 ? "#f5f5f5" : "white", cursor: idx === 0 ? "not-allowed" : "pointer", fontSize: 11, color: "#555" }}>▲</button>
                          <button onClick={() => movePriority(idx, 1)} disabled={idx === priority.length - 1} style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #ddd", background: idx === priority.length - 1 ? "#f5f5f5" : "white", cursor: idx === priority.length - 1 ? "not-allowed" : "pointer", fontSize: 11, color: "#555" }}>▼</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={card}>
              <label style={labelStyle}>📝 추가 메모 (선택)</label>
              <textarea value={memo} onChange={e => setMemo(e.target.value)}
                placeholder="예: 오늘 오후 3시에 고객 촬영 예약 있음" rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            <button onClick={handleGenerate} disabled={isDisabled} style={{
              width: "100%", padding: "15px", borderRadius: 12, border: "none",
              background: isDisabled ? "#c5c6d0" : "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white", fontWeight: 700, fontSize: 16,
              cursor: isDisabled ? "not-allowed" : "pointer", marginBottom: 12, transition: "all 0.2s",
            }}>{saving ? "⏳ 저장 중..." : isDisabled ? "⬆️ 업무를 먼저 선택해 주세요" : "✨ 업무 지침서 생성 및 저장"}</button>

            {saveSuccess && (
              <div style={{ background: "#f0fff4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: "#15803d", fontWeight: 600, textAlign: "center" }}>
                ✅ 저장 완료! 직원 화면에 실시간 반영됐어요 📡
              </div>
            )}

            {result && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>📋 생성된 업무 지침서</span>
                  <button onClick={handleCopy} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #667eea", background: copied ? "#667eea" : "white", color: copied ? "white" : "#667eea", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{copied ? "✅ 복사됨!" : "📋 복사하기"}</button>
                </div>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#f9f9fc", borderRadius: 10, padding: "16px", fontSize: 13, lineHeight: 1.8, color: "#333", border: "1px solid #eee", margin: 0 }}>{result}</pre>
              </div>
            )}
          </div>
        )}

        {/* ── 실시간 공유 ── */}
        {tab === "live" && (
          <div>
            <div style={{ ...card, background: "linear-gradient(135deg, #667eea15, #764ba215)", border: "1px solid #667eea30" }}>
              <div style={{ fontSize: 13, color: "#667eea", fontWeight: 700, marginBottom: 4 }}>📡 실시간 공유 지침서</div>
              <div style={{ fontSize: 11, color: "#888" }}>대표님이 지침서를 생성하면 즉시 반영돼요 · 직원의 체크 현황과 내일 메모도 실시간 확인 가능해요</div>
            </div>
            {liveDirective ? (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>📅 {formatDate(liveDirective.date)}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {liveDirective.orderChanged && (
                      <span style={{ fontSize: 11, background: "#fff3cd", color: "#856404", borderRadius: 6, padding: "3px 8px", fontWeight: 700, border: "1px solid #ffc107" }}>
                        🔄 직원이 순서 변경함
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#43b89c", fontWeight: 600 }}>● 최신</span>
                  </div>
                </div>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#f9f9fc", borderRadius: 10, padding: "16px", fontSize: 13, lineHeight: 1.8, color: "#333", border: "1px solid #eee", margin: 0 }}>{liveDirective.result}</pre>
                {/* 내일 할 일 메모 확인 */}
                {liveDirective.tomorrowNote && (
                  <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fcd34d" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 6 }}>📝 직원의 내일 할 일 메모</div>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#444", margin: 0, lineHeight: 1.7 }}>{liveDirective.tomorrowNote}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ ...card, textAlign: "center", color: "#aaa", padding: 48, fontSize: 14 }}>
                📭 아직 공유된 업무 지침이 없어요.
              </div>
            )}
          </div>
        )}

        {/* ── 업무 이행 탭 (직원용) ── */}
        {tab === "worker" && <WorkerTab liveDirective={liveDirective} db={db} />}

        {/* ── 히스토리 ── */}
        {tab === "history" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#333", marginBottom: 14 }}>🗂️ 과거 업무 지침 히스토리</div>
            {history.length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: "#aaa", padding: 40, fontSize: 14 }}>아직 생성된 지침이 없어요.</div>
            ) : history.map(h => <HistoryCard key={h.firebaseKey || h.id} item={h} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 업무 이행 탭 컴포넌트 ─────────────────────────────────
function WorkerTab({ liveDirective, db }) {
  const [localOrder, setLocalOrder] = useState(null);
  const [orderChanged, setOrderChanged] = useState(false);

  useEffect(() => {
    if (liveDirective?.result) {
      const raw = liveDirective.result.split("\n")
        .filter(l => l.startsWith("📌") || l.startsWith("✅") || l.startsWith("💬"));
      const getRank = (line) => { const m = line.match(/(\d+)번째/); return m ? parseInt(m[1]) : 999; };
      const sorted = [...raw].sort((a, b) => getRank(a) - getRank(b));
      // 이미 직원이 변경한 순서가 있으면 유지
      if (!localOrder) setLocalOrder(sorted);
    }
  }, [liveDirective]);

  if (!liveDirective || !localOrder) {
    return (
      <div style={{ ...card, textAlign: "center", color: "#aaa", padding: 48, fontSize: 14 }}>
        📭 아직 공유된 업무 지침이 없어요.<br />
        <span style={{ fontSize: 12, marginTop: 6, display: "block" }}>대표님이 지침서를 생성하면 여기에 나타나요!</span>
      </div>
    );
  }

  const liveChecks = liveDirective.checks || {};
  const tomorrowNote = liveDirective.tomorrowNote || "";
  const completedCount = Object.values(liveChecks).filter(Boolean).length;

  const moveItem = async (idx, dir) => {
    const next = [...localOrder];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setLocalOrder(next);
    setOrderChanged(true);
    // Firebase에 순서 변경 알림
    await set(ref(db, "live/orderChanged"), true);
    await set(ref(db, "live/workerOrder"), next);
  };

  const resetOrder = async () => {
    const raw = liveDirective.result.split("\n")
      .filter(l => l.startsWith("📌") || l.startsWith("✅") || l.startsWith("💬"));
    const getRank = (line) => { const m = line.match(/(\d+)번째/); return m ? parseInt(m[1]) : 999; };
    const sorted = [...raw].sort((a, b) => getRank(a) - getRank(b));
    setLocalOrder(sorted);
    setOrderChanged(false);
    await set(ref(db, "live/orderChanged"), false);
    await set(ref(db, "live/workerOrder"), null);
  };

  return (
    <div>
      <div style={{ ...card, background: "linear-gradient(135deg, #43b89c15, #43b89c05)", border: "1px solid #43b89c40" }}>
        <div style={{ fontSize: 13, color: "#43b89c", fontWeight: 700, marginBottom: 4 }}>✅ 업무 이행 체크</div>
        <div style={{ fontSize: 11, color: "#888" }}>순서를 변경하면 대표님께 알림이 가요 · 체크는 실시간으로 공유돼요</div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>📅 {formatDate(liveDirective.date)}</span>
            <span style={{ marginLeft: 10, fontSize: 12, color: "#667eea", fontWeight: 600 }}>
              완료 {completedCount} / {localOrder.length}
            </span>
          </div>
          {orderChanged && (
            <button onClick={resetOrder} style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid #e8eaf0",
              background: "white", fontSize: 11, color: "#888", cursor: "pointer",
            }}>순서 원래대로</button>
          )}
        </div>

        {orderChanged && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fff3cd", border: "1px solid #ffc107", marginBottom: 12, fontSize: 12, color: "#856404", fontWeight: 600 }}>
            🔄 순서를 변경했어요 — 대표님께 알림이 전송됐어요
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {localOrder.map((item, i) => {
            const isChecked = !!liveChecks[i];
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 12px", borderRadius: 10,
                background: isChecked ? "#f0fff4" : "#fafafa",
                border: `1px solid ${isChecked ? "#86efac" : "#e8eaf0"}`,
                transition: "all 0.2s",
              }}>
                {/* 체크박스 */}
                <input type="checkbox" checked={isChecked}
                  onChange={async () => {
                    const newChecks = { ...liveChecks, [i]: !liveChecks[i] };
                    await set(ref(db, "live/checks"), newChecks);
                  }}
                  style={{ accentColor: "#43b89c", width: 18, height: 18, flexShrink: 0, cursor: "pointer" }} />

                {/* 순서 번호 */}
                <span style={{
                  minWidth: 24, height: 24, borderRadius: "50%",
                  background: isChecked ? "#43b89c" : "#ddd",
                  color: "white", fontWeight: 700, fontSize: 11,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{i + 1}</span>

                {/* 업무명 */}
                <span style={{
                  flex: 1, fontSize: 12, lineHeight: 1.5,
                  color: isChecked ? "#15803d" : "#333",
                  textDecoration: isChecked ? "line-through" : "none",
                }}>{item}</span>

                {/* 순서 변경 버튼 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={{
                    padding: "2px 7px", borderRadius: 4, border: "1px solid #ddd",
                    background: i === 0 ? "#f5f5f5" : "white",
                    cursor: i === 0 ? "not-allowed" : "pointer", fontSize: 10, color: "#555",
                  }}>▲</button>
                  <button onClick={() => moveItem(i, localOrder.length - 1)} disabled={i === localOrder.length - 1} style={{
                    padding: "2px 7px", borderRadius: 4, border: "1px solid #ddd",
                    background: i === localOrder.length - 1 ? "#f5f5f5" : "white",
                    cursor: i === localOrder.length - 1 ? "not-allowed" : "pointer", fontSize: 10, color: "#555",
                  }}>▼</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 완료 진행바 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
            <span>오늘의 진행률</span>
            <span style={{ color: "#43b89c", fontWeight: 700 }}>{localOrder.length > 0 ? Math.round(completedCount / localOrder.length * 100) : 0}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "#e8eaf0" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: "linear-gradient(90deg, #43b89c, #667eea)",
              width: `${localOrder.length > 0 ? completedCount / localOrder.length * 100 : 0}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      </div>

      {/* 내일 할 일 메모 */}
      <div style={card}>
        <label style={{ ...labelStyle, color: "#f7971e" }}>
          📝 내일 할 일 메모
          <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400, marginLeft: 6 }}>
            (오늘 못한 일이나 내일 챙길 것을 적어주세요)
          </span>
        </label>
        <textarea
          value={tomorrowNote}
          onChange={async (e) => { await set(ref(db, "live/tomorrowNote"), e.target.value); }}
          placeholder={"예:\n• 릴스 편집 마무리 필요\n• 쿠팡 물품 등록 3개 남음\n• CS 답변 2건 미완료"}
          rows={5}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, background: "#fefefe" }}
        />
        {tomorrowNote ? (
          <div style={{ marginTop: 6, fontSize: 11, color: "#43b89c", fontWeight: 600 }}>
            ✅ 메모 저장됨 — 대표님도 실시간으로 확인할 수 있어요
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 11, color: "#bbb" }}>
            입력하면 자동 저장돼요
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ item }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ ...card, marginBottom: 10 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>📅 {formatDate(item.date)}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
            {(item.priority || []).map(id => OPTION_BY_ID[id]?.label).filter(Boolean).join(", ").slice(0, 50)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleCopy} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #667eea", background: copied ? "#667eea" : "white", color: copied ? "white" : "#667eea", fontSize: 11, cursor: "pointer" }}>{copied ? "✅" : "📋"}</button>
          <span style={{ color: "#bbb", fontSize: 16 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#f9f9fc", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.7, color: "#333", border: "1px solid #eee" }}>{item.result}</pre>
      )}
    </div>
  );
}

const card = { background: "white", borderRadius: 14, padding: "18px 16px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const labelStyle = { fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 8, display: "block" };
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8eaf0", fontSize: 13, color: "#333", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
