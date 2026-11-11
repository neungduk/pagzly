import { useMemo } from "react";
import { LabPanel } from "./lab/LabPanel";
import { CheckFlow } from "./check/CheckFlow";

function showLab(): boolean {
  if (typeof window === "undefined") return true;
  const q = new URLSearchParams(window.location.search);
  // 기본 표시. lab=0 이면 숨김(스위치 분리용)
  return q.get("lab") !== "0";
}

export default function App() {
  const lab = useMemo(() => showLab(), []);

  return (
    <div className="app">
      <header>
        <h1>Pagzly 라벨 점검</h1>
        <p className="muted">토스 미니앱 실험용 정적 화면</p>
      </header>
      {lab ? <LabPanel /> : null}
      <CheckFlow />
    </div>
  );
}
