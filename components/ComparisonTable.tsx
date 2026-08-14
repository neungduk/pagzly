import { IconCheck, IconMinus } from "@tabler/icons-react";
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

const cellClass = "px-3 py-5 align-top sm:px-5";
const bodyTextClass = "font-mono text-[11px] leading-relaxed sm:text-sm";

function MinusCell({ children }: { children: string }) {
  return (
    <span className="flex items-start gap-1.5">
      <IconMinus size={14} stroke={2.5} className="mt-0.5 shrink-0 text-ink/30" />
      {children}
    </span>
  );
}

function CheckCell({ children }: { children: string }) {
  return (
    <span className="flex items-start gap-1.5">
      <IconCheck size={14} stroke={2.5} className="mt-0.5 shrink-0 text-registration-red" />
      {children}
    </span>
  );
}

export default function ComparisonTable() {
  return (
    <div>
      <div className="relative mx-auto max-w-4xl">
        <CropMarks />
        <div className="overflow-hidden rounded-[4px] border border-line bg-white">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "34%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <th className={`${cellClass} text-xs font-semibold text-ink/40 sm:text-sm`}>
                  <span className="sr-only">비교 항목</span>
                </th>
                <th className={`${cellClass} bg-white text-xs font-semibold text-ink sm:text-sm`}>
                  디자인 외주
                </th>
                <th className={`${cellClass} bg-white text-xs font-semibold text-ink sm:text-sm`}>
                  템플릿 툴
                </th>
                <th className={`${cellClass} bg-registration-red`}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-paper sm:text-sm">
                      Pagzly
                    </span>
                    <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[9px] font-semibold text-registration-red">
                      추천
                    </span>
                  </span>
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
                    className={`${cellClass} text-xs font-semibold text-ink sm:text-sm`}
                  >
                    {row.label}
                  </th>
                  <td className={`${cellClass} bg-white text-ink/70 ${bodyTextClass}`}>
                    <MinusCell>{row.outsourcing}</MinusCell>
                  </td>
                  <td className={`${cellClass} bg-white text-ink/70 ${bodyTextClass}`}>
                    <MinusCell>{row.template}</MinusCell>
                  </td>
                  <td
                    className={`${cellClass} bg-[#F5DEDE] font-semibold text-registration-red ${bodyTextClass}`}
                  >
                    <CheckCell>{row.pagzly}</CheckCell>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-4xl px-1 text-xs leading-relaxed text-ink/40">
        * Pagzly의 소요 시간·비용은 사진 5장 기준 실제 파이프라인(배경 제거·화질
        보정·배경 생성 + AI 카피 생성) 실행 원가를 집계한 값입니다. 디자인
        외주·템플릿 툴 수치는 국내 셀러들이 일반적으로 겪는 시세 범위입니다.
      </p>
    </div>
  );
}
