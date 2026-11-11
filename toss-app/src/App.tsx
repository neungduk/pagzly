import { useMemo, useRef, useState } from "react";
import { LabPanel } from "./lab/LabPanel";
import { CheckFlow } from "./check/CheckFlow";

/** 실험 화면은 기본으로 숨김. 주소에 lab=1 이 있거나, 제목을 빠르게 5번 누르면 열린다(개발·진단용). */
function labFromQuery(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("lab") === "1";
}

export default function App() {
  const labQuery = useMemo(() => labFromQuery(), []);
  const [labTap, setLabTap] = useState(false);
  const taps = useRef<number[]>([]);

  const onTitleTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) setLabTap(true);
  };

  return (
    <div className="app">
      <header>
        <h1 onClick={onTitleTap}>팩즐리 라벨 점검</h1>
        <p className="muted">
          화장품 라벨 사진이나 PDF를 올리면 고칠 문구와 빠진 표시사항을 알려줘요.
        </p>
      </header>
      {labQuery || labTap ? <LabPanel /> : null}
      <CheckFlow />
    </div>
  );
}
