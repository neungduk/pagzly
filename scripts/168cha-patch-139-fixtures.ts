/**
 * 168차 — 139 세션 JSON의 뷰티 keyFeatures 오염을 카테고리별 문구로 교체.
 * (스크립트 재실행 없이 픽스처만 교정 — 무료)
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");

const PATCHES: Record<
  string,
  {
    keyFeatures: string;
    ingredients: string;
    certifications: string;
    targetCustomer: string;
  }
> = {
  fashion: {
    keyFeatures:
      "면 100%, 신축성 12%, 세탁 후 수축률 2% 이내, 오버사이즈 핏, 원단 중량 210g/yd",
    ingredients: "코튼 100%",
    certifications: "OEKO-TEX Standard 100",
    targetCustomer: "데일리 미니멀 룩을 선호하는 20~30대",
  },
  food: {
    keyFeatures:
      "메밀면 단백질 8g/1인분, 들기름 함량 표기, 나트륨 480mg, 조리 3분, 2인분 세트",
    ingredients: "메밀가루, 밀가루, 들기름, 소금",
    certifications: "HACCP",
    targetCustomer: "집밥·간편식을 찾는 직장인",
  },
  living: {
    keyFeatures:
      "내열 120℃, 용량 350mL, 무게 280g, 식기세척기 가능. 이런 분께 추천: 아침 커피·티 루틴을 즐기는 분. 이런 점은 확인 후 구매: 전자레인지 사용은 불가(손잡이 접합부).",
    ingredients: "도자기(세라믹), 무연 유약",
    certifications: "식품접촉기구 기준 적합",
    targetCustomer: "미니멀 테이블웨어를 선호하는 1~2인 가구",
  },
};

for (const [id, fields] of Object.entries(PATCHES)) {
  const p = path.join(ROOT, "review", `139cha-session-${id}.json`);
  const j = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
  Object.assign(j, fields);
  fs.writeFileSync(p, JSON.stringify(j), "utf8");
  console.log("patched", id, "kf=", fields.keyFeatures.slice(0, 60));
}
