"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const faqs: FaqItem[] = [
  {
    question: "스튜디오에서 찍은 사진이 아니어도 되나요?",
    answer:
      "네, 스마트폰으로 찍은 사진이면 충분합니다. AI가 배경을 자동으로 제거하고 화질을 보정한 뒤, 상품 고유의 색감에 맞춘 새 스튜디오 배경을 생성해 자연스러운 상세페이지로 완성해 드립니다.",
  },
  {
    question: "생성된 카피와 이미지, 저작권 문제는 없나요?",
    answer:
      "생성되는 카피와 배경 이미지는 요청마다 새로 만들어지는 결과물입니다. 다만 업로드하시는 상품 사진 자체는 반드시 본인이 촬영했거나 사용 권한이 있는 사진만 올려주세요.",
  },
  {
    question: "완성된 페이지를 스마트스토어·쿠팡에 바로 쓸 수 있나요?",
    answer:
      "완성된 상세페이지는 이미지 파일로 바로 다운로드할 수 있습니다. 스마트스토어, 쿠팡을 비롯한 어떤 판매 채널의 상세페이지 등록란에도 그대로 업로드하실 수 있습니다.",
  },
  {
    question: "화장품·식품인데 광고 문구 규제가 걱정돼요.",
    answer:
      "화장품·식품 카테고리는 식약처 표시광고 기준을 자동으로 검수합니다. 효능을 단정하거나 과장된 표현이 감지되면 순화된 문구로 자동 교체하고, 어떤 부분이 바뀌었는지 결과 화면에서 확인할 수 있습니다.",
  },
  {
    question: "결과물이 마음에 안 들면 수정할 수 있나요?",
    answer:
      "언제든 '정보 수정'에서 상품 정보나 사진을 바꿔 다시 생성할 수 있습니다. 완성된 페이지는 이미지로 다운로드해 다른 곳에 자유롭게 활용하실 수 있습니다.",
  },
  {
    question: "사진은 몇 장까지, 어떤 형식으로 올릴 수 있나요?",
    answer:
      "JPG·PNG 형식으로 최소 7장·최대 10장까지 업로드할 수 있습니다. AI는 그중 서로 다른 사진 최소 7장을 상세페이지에 사용합니다. 다양한 각도의 사진을 올릴수록 갤러리·디테일·인스타 피드가 더 풍성해집니다.",
  },
  {
    question: "인스타그램 피드용 이미지도 만들 수 있나요?",
    answer:
      "네. 결과 화면에서 '인스타 피드용 만들기'를 누르면 상세페이지 카피·사진으로 1080×1080 피드 카드를 만들고 PNG로 바로 저장할 수 있습니다.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={faq.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-6 text-left"
            >
              <span className="text-base font-semibold text-ink sm:text-lg">
                {faq.question}
              </span>
              <span
                className={`shrink-0 font-mono text-xl text-registration-red transition-transform duration-200 ${
                  isOpen ? "rotate-45" : ""
                }`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div
              className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <p className="pb-6 leading-relaxed text-ink/70">{faq.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
