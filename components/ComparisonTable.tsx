import CropMarks from "@/components/CropMarks";

type Row = {
  label: string;
  outsourcing: string;
  template: string;
  pagzly: string;
};

const rows: Row[] = [
  {
    label: "소요 시간",
    outsourcing: "평균 3~7일",
    template: "즉시 시작, 직접 편집에 수 시간",
    pagzly: "약 2~3분 (자동 생성)",
  },
  {
    label: "건당 비용",
    outsourcing: "건당 5만~30만원대",
    template: "월 구독료 별도 (직접 편집 필요)",
    pagzly: "약 $0.16 (AI 파이프라인 원가)",
  },
  {
    label: "색·톤 매칭 방식",
    outsourcing: "디자이너와 직접 소통·조율",
    template: "직접 색상 선택",
    pagzly: "상품 사진에서 색상 자동 추출",
  },
  {
    label: "수정 가능 여부",
    outsourcing: "추가 비용·시간 발생",
    template: "가능 (직접 편집)",
    pagzly: "정보만 바꿔 즉시 재생성",
  },
];

export default function ComparisonTable() {
  return (
    <div>
      <div className="relative mx-auto max-w-4xl overflow-x-auto rounded-none border border-line bg-paper">
        <CropMarks />
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="w-1/4 p-4 text-sm font-semibold text-ink/50 sm:p-6">
                &nbsp;
              </th>
              <th className="p-4 text-sm font-semibold text-ink sm:p-6">
                디자인 외주
              </th>
              <th className="p-4 text-sm font-semibold text-ink sm:p-6">
                템플릿 툴
              </th>
              <th className="bg-registration-red/5 p-4 text-sm font-bold text-registration-red sm:p-6">
                Pagzly
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={i !== rows.length - 1 ? "border-b border-line" : ""}
              >
                <th
                  scope="row"
                  className="p-4 align-top text-sm font-semibold text-ink sm:p-6"
                >
                  {row.label}
                </th>
                <td className="p-4 align-top font-mono text-sm text-ink/70 sm:p-6">
                  {row.outsourcing}
                </td>
                <td className="p-4 align-top font-mono text-sm text-ink/70 sm:p-6">
                  {row.template}
                </td>
                <td className="bg-registration-red/5 p-4 align-top font-mono text-sm font-semibold text-registration-red sm:p-6">
                  {row.pagzly}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mx-auto mt-4 max-w-4xl text-xs leading-relaxed text-ink/40">
        * Pagzly의 소요 시간·비용은 사진 5장 기준 실제 파이프라인(배경 제거·화질
        보정·배경 생성 + AI 카피 생성) 실행 원가를 집계한 값입니다. 디자인
        외주·템플릿 툴 수치는 국내 셀러들이 일반적으로 겪는 시세 범위입니다.
      </p>
    </div>
  );
}
