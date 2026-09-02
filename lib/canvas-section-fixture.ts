import type { CanvasSection } from "@/lib/types/generate";

/** 72차 QA 전용 — text + image + shape + table + ai-image 요소가 섞인 캔버스 섹션 */
export function buildCanvasQaFixtureSection(
  baseNeutral = "#DAD4CF",
  sampleImageUrl?: string,
): CanvasSection {
  return {
    type: "canvas",
    slot: "canvas_qa_fixture",
    frameWidth: 1080,
    frameHeight: 720,
    background: { color: baseNeutral },
    elements: [
      {
        id: "qa-shape-1",
        kind: "shape",
        shape: "rect",
        x: 8,
        y: 10,
        w: 84,
        h: 28,
        fill: "#ffffffcc",
        z: 1,
      },
      {
        id: "qa-text-1",
        kind: "text",
        role: "main",
        text: "자유 캔버스 QA",
        x: 12,
        y: 14,
        w: 76,
        h: 12,
        align: "center",
        color: "#1B1B18",
        z: 2,
      },
      {
        id: "qa-text-2",
        kind: "text",
        role: "body",
        text: "텍스트·이미지·도형이 % 좌표로 배치됩니다.",
        x: 12,
        y: 42,
        w: 40,
        h: 18,
        align: "left",
        color: "#1B1B18",
        z: 3,
      },
      {
        id: "qa-image-1",
        kind: "image",
        imageIndex: 0,
        x: 56,
        y: 38,
        w: 32,
        h: 48,
        radius: 12,
        z: 4,
      },
      {
        id: "qa-shape-2",
        kind: "shape",
        shape: "circle",
        x: 14,
        y: 68,
        w: 10,
        h: 14,
        fill: "#844F1F",
        z: 5,
      },
      {
        id: "qa-shape-3",
        kind: "shape",
        shape: "line",
        x: 28,
        y: 74,
        w: 60,
        h: 2,
        fill: "#633B17",
        z: 6,
      },
      {
        id: "qa-table-1",
        kind: "table",
        rows: [
          { label: "용량", value: "50ml" },
          { label: "제형", value: "젤 크림" },
        ],
        x: 12,
        y: 58,
        w: 38,
        h: 22,
        headerColor: "#E8E2DC",
        borderColor: "#844F1F",
        z: 7,
      },
      {
        id: "qa-ai-image-pending",
        kind: "ai-image",
        prompt: "부드러운 아침 햇살, 미니멀 스튜디오 배경",
        x: 54,
        y: 58,
        w: 34,
        h: 28,
        radius: 10,
        z: 8,
        status: "pending",
      },
      ...(sampleImageUrl
        ? [
            {
              id: "qa-ai-image-done",
              kind: "ai-image" as const,
              prompt: "자연광 라이프스타일 컷",
              resultUrl: sampleImageUrl,
              x: 54,
              y: 22,
              w: 30,
              h: 24,
              radius: 10,
              z: 9,
              status: "done" as const,
            },
          ]
        : []),
    ],
  };
}

/** 76차 성능·회귀 QA — 요소 24개 이상 */
export function buildCanvasStressFixtureSection(baseNeutral = "#E8E4DF"): CanvasSection {
  const elements: CanvasSection["elements"] = [
    {
      id: "stress-title",
      kind: "text",
      role: "main",
      text: "Stress QA · 24 elements",
      x: 8,
      y: 6,
      w: 84,
      h: 10,
      align: "center",
      z: 1,
    },
  ];

  for (let i = 0; i < 20; i += 1) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    elements.push({
      id: `stress-text-${i}`,
      kind: "text",
      role: "body",
      text: `요소 ${i + 1}`,
      x: 6 + col * 18,
      y: 18 + row * 14,
      w: 16,
      h: 10,
      z: 2 + i,
    });
  }

  elements.push(
    {
      id: "stress-shape",
      kind: "shape",
      shape: "rect",
      x: 72,
      y: 72,
      w: 20,
      h: 12,
      fill: "#ffffffaa",
      z: 30,
    },
    {
      id: "stress-line",
      kind: "shape",
      shape: "line",
      x: 8,
      y: 88,
      w: 84,
      h: 2,
      fill: "#633B17",
      z: 31,
    },
    {
      id: "stress-table",
      kind: "table",
      rows: [
        { label: "A", value: "1" },
        { label: "B", value: "2" },
      ],
      x: 8,
      y: 72,
      w: 28,
      h: 18,
      z: 32,
    },
  );

  return {
    type: "canvas",
    slot: "canvas_stress_fixture",
    frameWidth: 1080,
    frameHeight: 720,
    background: { color: baseNeutral },
    elements,
  };
}
