import { useState, useEffect } from "react";

// ── 데이터 정의 ──────────────────────────────────────────
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

// 시간 블록별 업무 분류 (마케팅 계열 / 사무 계열 / 기타)
const MARKETING_TIDS = new Set([1, 3]); // SNS, 릴스
const ADMIN_TIDS     = new Set([2, 4]); // 쇼핑몰, 사무
const PHOTO_TIDS     = new Set([5]);
const ETC_TIDS       = new Set([6]);

// ── 날짜 유틸 ────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// ── 지침서 자동 생성 엔진 ────────────────────────────────
function generateDirectiveText(date, priority, memo) {
  if (priority.length === 0) return "";

  const items = priority.map((id, idx) => ({ ...OPTION_BY_ID[id], rank: idx + 1 }));

  // 시간 블록별 분류
  const morning  = items.filter(i => MARKETING_TIDS.has(i.tid) || PHOTO_TIDS.has(i.tid));
  const afternoon = items.filter(i => ADMIN_TIDS.has(i.tid));
  const closing  = items.filter(i => MARKETING_TIDS.has(i.tid));
  const etcItems = items.filter(i => ETC_TIDS.has(i.tid));

  // 오전 블록 콘텐츠 (마케팅 + 사진)
  const morningLines = morning.length > 0
    ? morning.map(i => `📌 ${i.rank}순위 · ${TEMPLATE_META[i.tid].label} — ${i.label}`).join("\n")
    : "📌 오전 업무 없음 (사무 업무 위주로 진행)";

  // 오후 블록 콘텐츠 (사무·쇼핑몰)
  const afternoonLines = afternoon.length > 0
    ? afternoon.map(i => `✅ ${i.rank}순위 · ${TEMPLATE_META[i.tid].label} — ${i.label}`).join("\n")
    : "✅ 오후 루틴 업무 (예약 확인, 문의 응대)";

  // 마감 블록 (소통·마무리)
  const closingLines = closing.length > 0
    ? closing.map(i => `💬 ${i.label} 댓글·DM 소통 및 마무리`).join("\n")
    : "💬 오늘 업무 최종 점검 및 마무리";

  // 기타 업무
  const etcSection = etcItems.length > 0
    ? `\n🔔 오늘의 특별 일정\n${etcItems.map(i => `• ${i.label}`).join("\n")}`
    : "";

  // 핵심 목표 (1~2순위)
  const topGoals = items.slice(0, 2).map(i => `• ${i.label} 완료`).join("\n");

  // 메모 섹션
  const memoSection = memo.trim()
    ? `\n📝 추가 메모\n• ${memo.trim()}`
    : "";

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

// ── 공용 옵션 버튼 ───────────────────────────────────────
function OptionBtn({ item, isOn, color, bg, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 14px", borderRadius: 10, border: "2px solid",
      borderColor: isOn ? color : "#e8eaf0",
      background: isOn ? bg : "white",
      color: isOn ? color : "#555",
      fontWeight: isOn ? 700 : 400,
      cursor: "pointer", fontSize: 13, textAlign: "left", transition: "all 0.18s",
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, border: "2px solid",
        borderColor: isOn ? color : "#ccc",
        background: isOn ? color : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: 11, color: "white", fontWeight: 700,
      }}>{isOn ? "✓" : ""}</span>
      {item.label}
    </button>
  );
}

// ── 메인 앱 ──────────────────────────────────────────────
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

  useEffect(() => {
    const saved = sessionStorage.getItem("gm_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (item) => {
    const updated = [item, ...history].slice(0, 30);
    setHistory(updated);
    sessionStorage.setItem("gm_history", JSON.stringify(updated));
  };

  // 템플릿 토글
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

  // 옵션 토글
  const toggleOption = (optId) => {
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(optId)) {
        next.delete(optId);
        setPriority(p => p.filter(id => id !== optId));
      } else {
        next.add(optId);
        setPriority(p => [...p, optId]);
      }
      return next;
    });
  };

  // 우선순위 이동
  const movePriority = (idx, dir) => {
    setPriority(prev => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  // 지침서 생성
  const handleGenerate = () => {
    const text = generateDirectiveText(date, priority, memo);
    setResult(text);
    const lines = text.split("\n").filter(l => l.startsWith("📌") || l.startsWith("✅") || l.startsWith("💬"));
    const initCheck = {};
    lines.forEach((_, i) => { initCheck[i] = false; });
    setChecklist(initCheck);
    saveHistory({ date, priority, memo, result: text, id: Date.now() });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkItems = result.split("\n").filter(l => l.startsWith("📌") || l.startsWith("✅") || l.startsWith("💬"));
  const isDisabled = priority.length === 0;

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", minHeight: "100vh", background: "#f5f6fa" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "20px 24px", color: "white" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>📸 젠틀모먼츠</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>직원 업무 관리 시스템</div>
      </div>

      {/* Tab Nav */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #e8eaf0" }}>
        {[
          { key: "create",  label: "📝 업무 지침 생성" },
          { key: "history", label: "🗂️ 히스토리" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "14px 8px", border: "none", background: "none",
            fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? "#667eea" : "#888",
            borderBottom: tab === t.key ? "2px solid #667eea" : "2px solid transparent",
            cursor: "pointer", fontSize: 13, transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── TAB: 업무 지침 생성 ── */}
        {tab === "create" && (
          <div>

            {/* 날짜 */}
            <div style={card}>
              <label style={labelStyle}>📅 날짜</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>

            {/* 템플릿 복수 선택 */}
            <div style={card}>
              <label style={labelStyle}>
                🗂️ 업무 템플릿 선택
                <span style={{ color: "#667eea", fontSize: 11, marginLeft: 6, fontWeight: 400 }}>(복수 선택 가능)</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                {Object.entries(TEMPLATE_META).map(([tidStr, meta]) => {
                  const tid = Number(tidStr);
                  const isOn = activeTemplates.includes(tid);
                  return (
                    <button key={tid} onClick={() => toggleTemplate(tid)} style={{
                      padding: "11px 12px", borderRadius: 10, border: "2px solid",
                      borderColor: isOn ? meta.color : "#e8eaf0",
                      background: isOn ? meta.bg : "white",
                      color: isOn ? meta.color : "#555",
                      fontWeight: isOn ? 700 : 400,
                      cursor: "pointer", fontSize: 12, textAlign: "left",
                      transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, border: "2px solid",
                        borderColor: isOn ? meta.color : "#ccc",
                        background: isOn ? meta.color : "white",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: "white", fontWeight: 700, flexShrink: 0,
                      }}>{isOn ? "✓" : ""}</span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              {activeTemplates.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: "#888" }}>
                  ✅ {activeTemplates.length}개 템플릿 선택됨 — 아래에서 세부 업무를 선택하세요
                </div>
              )}
            </div>

            {/* 각 템플릿 옵션 패널 */}
            {activeTemplates.map(tid => {
              const meta = TEMPLATE_META[tid];
              const options = OPTION_MAP[tid];
              const selectedCount = options.filter(o => selectedOptions.has(o.id)).length;
              return (
                <div key={tid} style={{ ...card, borderLeft: `4px solid ${meta.color}` }}>
                  <label style={{ ...labelStyle, color: meta.color }}>
                    {meta.label} — 세부 업무 선택
                    <span style={{ color: "#aaa", fontSize: 11, marginLeft: 6, fontWeight: 400 }}>(복수 선택 가능)</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {options.map(opt => (
                      <OptionBtn
                        key={opt.id} item={opt}
                        isOn={selectedOptions.has(opt.id)}
                        color={meta.color} bg={meta.bg}
                        onClick={() => toggleOption(opt.id)}
                      />
                    ))}
                  </div>
                  {selectedCount > 0 && (
                    <div style={{ marginTop: 10, padding: "7px 12px", borderRadius: 8, background: meta.bg, fontSize: 12, color: meta.color, fontWeight: 600 }}>
                      ✅ {selectedCount}개 선택됨
                    </div>
                  )}
                </div>
              );
            })}

            {/* 우선순위 통합 패널 */}
            {priority.length >= 2 && (
              <div style={card}>
                <label style={labelStyle}>
                  🔢 전체 업무 우선순위 설정
                  <span style={{ color: "#667eea", fontSize: 11, marginLeft: 6, fontWeight: 400 }}>(▲▼으로 순서 조정)</span>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {priority.map((optId, idx) => {
                    const opt = OPTION_BY_ID[optId];
                    const meta = TEMPLATE_META[opt.tid];
                    return (
                      <div key={optId} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 10,
                        background: idx === 0 ? `${meta.color}15` : "#fafafa",
                        border: `2px solid ${idx === 0 ? meta.color : "#e8eaf0"}`,
                        transition: "all 0.2s",
                      }}>
                        <span style={{
                          minWidth: 26, height: 26, borderRadius: "50%",
                          background: idx === 0 ? meta.color : "#ddd",
                          color: "white", fontWeight: 700, fontSize: 12,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: "white",
                            background: meta.color, borderRadius: 4, padding: "1px 7px",
                            marginRight: 6,
                          }}>{meta.label}</span>
                          <span style={{ fontSize: 13, fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? meta.color : "#444" }}>
                            {opt.label}
                          </span>
                          {idx === 0 && <span style={{ marginLeft: 6, fontSize: 10, color: meta.color, fontWeight: 700 }}>⭐ 최우선</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                          <button onClick={() => movePriority(idx, -1)} disabled={idx === 0} style={{
                            padding: "2px 8px", borderRadius: 5, border: "1px solid #ddd",
                            background: idx === 0 ? "#f5f5f5" : "white",
                            cursor: idx === 0 ? "not-allowed" : "pointer", fontSize: 11, color: "#555",
                          }}>▲</button>
                          <button onClick={() => movePriority(idx, 1)} disabled={idx === priority.length - 1} style={{
                            padding: "2px 8px", borderRadius: 5, border: "1px solid #ddd",
                            background: idx === priority.length - 1 ? "#f5f5f5" : "white",
                            cursor: idx === priority.length - 1 ? "not-allowed" : "pointer", fontSize: 11, color: "#555",
                          }}>▼</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "#aaa" }}>
                  💡 설정한 우선순위가 업무 지침서에 그대로 반영됩니다.
                </div>
              </div>
            )}

            {/* 추가 메모 */}
            <div style={card}>
              <label style={labelStyle}>📝 추가 메모 (선택)</label>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="예: 오늘 오후 3시에 고객 촬영 예약 있음, 택배 발송 마감일 등"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>

            {/* 생성 버튼 */}
            <button onClick={handleGenerate} disabled={isDisabled} style={{
              width: "100%", padding: "15px", borderRadius: 12, border: "none",
              background: isDisabled ? "#c5c6d0" : "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white", fontWeight: 700, fontSize: 16,
              cursor: isDisabled ? "not-allowed" : "pointer",
              marginBottom: 20, transition: "all 0.2s",
            }}>
              {isDisabled ? "⬆️ 업무를 먼저 선택해 주세요" : "✨ 일일 업무 지침서 생성"}
            </button>

            {/* 결과 */}
            {result && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>📋 생성된 업무 지침서</span>
                  <button onClick={handleCopy} style={{
                    padding: "6px 14px", borderRadius: 8, border: "1px solid #667eea",
                    background: copied ? "#667eea" : "white",
                    color: copied ? "white" : "#667eea",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  }}>{copied ? "✅ 복사됨!" : "📋 복사하기"}</button>
                </div>
                <pre style={{
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: "#f9f9fc", borderRadius: 10, padding: "16px",
                  fontSize: 13, lineHeight: 1.8, color: "#333",
                  border: "1px solid #eee", margin: 0,
                }}>{result}</pre>

                {/* 체크리스트 */}
                {checkItems.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#555", marginBottom: 8 }}>✅ 직원 완료 체크리스트</div>
                    {checkItems.map((item, i) => (
                      <label key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8,
                        background: checklist[i] ? "#f0fff4" : "#fafafa",
                        marginBottom: 6, cursor: "pointer",
                        border: "1px solid", borderColor: checklist[i] ? "#86efac" : "#eee",
                        transition: "all 0.2s",
                      }}>
                        <input type="checkbox" checked={!!checklist[i]}
                          onChange={() => setChecklist(p => ({ ...p, [i]: !p[i] }))}
                          style={{ accentColor: "#667eea", width: 16, height: 16 }} />
                        <span style={{
                          fontSize: 12, color: checklist[i] ? "#15803d" : "#444",
                          textDecoration: checklist[i] ? "line-through" : "none",
                        }}>{item}</span>
                      </label>
                    ))}
                    <div style={{ marginTop: 8, fontSize: 12, color: "#667eea", fontWeight: 600 }}>
                      완료: {Object.values(checklist).filter(Boolean).length} / {checkItems.length}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: 히스토리 ── */}
        {tab === "history" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#333", marginBottom: 14 }}>🗂️ 과거 업무 지침 히스토리</div>
            {history.length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: "#aaa", padding: 40, fontSize: 14 }}>
                아직 생성된 지침이 없어요.<br />업무 지침 생성 탭에서 먼저 만들어보세요!
              </div>
            ) : history.map(h => <HistoryCard key={h.id} item={h} />)}
          </div>
        )}

      </div>
    </div>
  );
}

// ── 히스토리 카드 ─────────────────────────────────────────
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
            {item.priority?.map(id => OPTION_BY_ID[id]?.label).filter(Boolean).join(", ").slice(0, 45)}...
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleCopy} style={{
            padding: "4px 10px", borderRadius: 6, border: "1px solid #667eea",
            background: copied ? "#667eea" : "white", color: copied ? "white" : "#667eea",
            fontSize: 11, cursor: "pointer",
          }}>{copied ? "✅" : "📋"}</button>
          <span style={{ color: "#bbb", fontSize: 16 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <pre style={{
          marginTop: 12, whiteSpace: "pre-wrap", wordBreak: "break-word",
          background: "#f9f9fc", borderRadius: 8, padding: 12,
          fontSize: 12, lineHeight: 1.7, color: "#333", border: "1px solid #eee",
        }}>{item.result}</pre>
      )}
    </div>
  );
}

const card = {
  background: "white", borderRadius: 14, padding: "18px 16px",
  marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};
const labelStyle = {
  fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 8, display: "block",
};
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e8eaf0", fontSize: 13, color: "#333",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
