// Pagzly 시그니처 모티프 — 카드/이미지 모서리에 인쇄 크롭마크(✛)를 찍는다.
// 부모 요소에 className="relative"가 있어야 한다.
export default function CropMarks({
  color = "text-line",
}: {
  color?: string;
}) {
  const markClass = `pointer-events-none absolute select-none font-mono text-xs leading-none ${color}`;

  return (
    <>
      <span className={`${markClass} -left-2 -top-2`} aria-hidden="true">
        ✛
      </span>
      <span className={`${markClass} -right-2 -top-2`} aria-hidden="true">
        ✛
      </span>
      <span className={`${markClass} -bottom-2 -left-2`} aria-hidden="true">
        ✛
      </span>
      <span className={`${markClass} -bottom-2 -right-2`} aria-hidden="true">
        ✛
      </span>
    </>
  );
}
