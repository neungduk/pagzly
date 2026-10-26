/**
 * 455차 2 — 사진 로드 실패 시 빈 틀 마감(DESIGN_V4). 438차 폴백은 실패한 <img>를 숨겨 alt 글자·깨진 아이콘을 없앴지만, 아치·링·카드 같은 사진 틀이 내용 없는 흰 구멍으로 남았고
 * (사진이 틀 높이를 정하던 곳은 높이 0으로 무너졌고), 색상 옵션처럼 CSS `display:block!important`가 인라인 숨김을 이기는 곳은 alt 글자가 그대로 보였다.
 * 실패한 <img>의 틀(부모, 절대 위치 래퍼면 그 바깥, overflow:hidden일 때만)에 `data-pz-np`를 달고, CSS가 그 틀에 면 톤(deepAccent 틴트) + 가는 사선 무늬를 깐다(새 글자 없음).
 * 틀에 aspect-ratio가 없으면 실패한 사진이 차지하던 비율을 그 틀에 예약한다. 사진이 정상 로드되면 아무 속성도 붙지 않아 화면은 그대로다.
 * export는 문서 머리의 캡처 단계 error 리스너 한 개(문서 전체 <img>, 개별 <img> 문자열 불변), 라이브는 hideImgOnError·SectionImage가 같은 동작의 markNoPhotoFrame을 부른다.
 */
// design-tokens ↔ design-v4 순환을 피하려고 색 변환은 여기서 직접 한다
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const NO_PHOTO_ATTR = "data-pz-np";

/** 실패한 사진의 틀을 표시하고 무너질 틀은 비율을 예약한다. 사진을 숨기기 *전에* 불러야 사진 상자 크기를 읽는다 */
export function markNoPhotoFrame(img: HTMLImageElement): void {
  let p = img.parentElement;
  if (!p || typeof getComputedStyle !== "function") return;
  // 사진이 절대 위치 래퍼 안에 있으면 그 바깥 틀을 본다
  if (getComputedStyle(p).position === "absolute" && getComputedStyle(p).overflow !== "hidden" && p.parentElement) p = p.parentElement;
  if (getComputedStyle(p).overflow !== "hidden") return; // 본문 흐름 속 로고·아이콘 같은 인라인 이미지의 부모는 건드리지 않는다
  const r = img.getBoundingClientRect();
  if (getComputedStyle(p).aspectRatio === "auto" && r.width > 40 && r.height > 40) p.style.aspectRatio = `${r.width} / ${r.height}`;
  p.setAttribute(NO_PHOTO_ATTR, "1");
}

/** export 문서 머리용 스크립트: markNoPhotoFrame과 같은 동작(error는 버블링하지 않으므로 캡처 단계). 개별 인라인 onerror(display:none) 뒤에 !important 숨김을 한 번 더 건다 */
export const NO_PHOTO_EXPORT_SCRIPT = `<script>document.addEventListener('error',function(e){var i=e.target;if(!i||i.tagName!=='IMG')return;var p=i.parentElement,g=getComputedStyle;if(p&&g(p).position==='absolute'&&g(p).overflow!=='hidden'&&p.parentElement)p=p.parentElement;if(p&&g(p).overflow==='hidden'){var r=i.getBoundingClientRect();if(g(p).aspectRatio==='auto'&&r.width>40&&r.height>40)p.style.aspectRatio=r.width+' / '+r.height;p.setAttribute('${NO_PHOTO_ATTR}','1')}setTimeout(function(){i.style.setProperty('display','none','important')},0)},true)</script>`;

/** 빈 틀 면 CSS. 틀 자신의 배경색 위에 얹히도록 이미지 레이어로 깐다: deepAccent 틴트 + 흰 살짝 + 어두운·밝은 사선 한 쌍(밝은 면에서는 어두운 선이, 어두운 면에서는 밝은 선이 보인다) */
export function noPhotoCss(scope: string, deepAccent: string): string {
  const tint = rgba(deepAccent, 0.08);
  const lift = "rgba(255,255,255,0.09)";
  const dark = rgba(deepAccent, 0.1);
  const light = "rgba(255,255,255,0.14)";
  return `${scope} [${NO_PHOTO_ATTR}]{background-image:linear-gradient(${tint},${tint}),linear-gradient(${lift},${lift}),repeating-linear-gradient(135deg,${dark} 0,${dark} 1px,transparent 1px,transparent 7px,${light} 7px,${light} 8px,transparent 8px,transparent 14px)!important}`;
}

/**
 * 라이브용: 렌더러 루트 안의 모든 <img>(React 이미지 + dangerouslySetInnerHTML 문자열 속 이미지)의 실패를 캡처 단계로 듣는다. 하이드레이션 전에 이미 실패한 사진은 마운트 때 한 번 훑는다.
 * 라이브는 export 문서 머리 스크립트가 없어서 이 함수가 같은 일을 한다. 반환값은 해제 함수.
 */
export function watchNoPhotoFrames(root: HTMLElement): () => void {
  const hide = (img: HTMLImageElement) => {
    if (img.style.visibility !== "hidden") img.style.setProperty("display", "none", "important");
  };
  const on = (e: Event) => {
    const t = e.target;
    if (t instanceof HTMLImageElement) {
      markNoPhotoFrame(t);
      hide(t);
    }
  };
  root.addEventListener("error", on, true);
  root.querySelectorAll("img").forEach((i) => {
    if (i.complete && i.naturalWidth === 0 && i.getAttribute("src")) {
      markNoPhotoFrame(i);
      hide(i);
    }
  });
  return () => root.removeEventListener("error", on, true);
}
