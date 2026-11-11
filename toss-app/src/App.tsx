import { useEffect, useMemo, useRef, useState } from "react";
import { LabPanel } from "./lab/LabPanel";
import { CheckScreen } from "./CheckScreen";
import { TOSS_SHOW_US_MARKET } from "./config";
import { demoEnabled, readDemoName } from "./demo/enabled";

/** 실험 화면은 기본 숨김. ?lab=1 또는 제목 3초 안 5회 탭 */
function labFromQuery(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("lab") === "1";
}

export default function App() {
  const labQuery = useMemo(() => labFromQuery(), []);
  const [labTap, setLabTap] = useState(false);
  const taps = useRef<number[]>([]);
  const demoName = useMemo(() => readDemoName(), []);

  useEffect(() => {
    if (!demoEnabled() || !demoName) {
      document.documentElement.removeAttribute("data-demo");
      return;
    }
    document.documentElement.setAttribute("data-demo", demoName);
  }, [demoName]);

  const onTitleTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) setLabTap(true);
  };

  const labOpen = labQuery || labTap;

  return (
    <div className="toss-app" data-kr-only={TOSS_SHOW_US_MARKET ? undefined : "1"}>
      {labOpen ? <LabPanel /> : null}
      <CheckScreen onTitleTap={onTitleTap} demoName={demoName} />
    </div>
  );
}
