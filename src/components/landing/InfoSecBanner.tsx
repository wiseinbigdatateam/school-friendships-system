export default function InfoSecBanner() {
  return (
    <div className="bg-gray-100">
      <div className="mx-auto flex w-full flex-col items-center gap-5 py-[72px] max-lg:items-start max-lg:px-6 max-md:gap-3 max-md:py-12 xl:w-[1280px]">
        <p className="text-2xl font-semibold text-sky-700 max-md:text-lg">
          AI 소외학생 예방진단, 학교가 걱정하는 두 가지를 완벽히 해결했습니다
        </p>

        {/* 하단 두 개의 섹션 */}
        <div className="flex max-lg:flex-col max-md:gap-3 md:gap-6 lg:gap-[72px]">
          {/* 왼쪽 섹션 */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <img src="/landing/check.svg" alt="체크 아이콘" />
              <p className="text-base text-indigo-950">
                학생 데이터, 철통 보안!
              </p>
            </div>

            <div className="flex flex-col gap-1 pl-5">
              <p className="text-base text-gray-600 max-md:text-sm">
                정부가 인정한 최고 수준 보안 인증(CSAP, 과기정통부·KISA) 획득
              </p>
              <p className="text-base text-gray-600 max-md:text-sm">
                해킹·유출 걱정 없이 학생 데이터 안전 보관
              </p>
            </div>
          </div>

          {/* 오른쪽 섹션 */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <img src="/landing/check.svg" alt="체크 아이콘" />
              <p className="text-base text-indigo-950">
                개인정보 동의, 간편 처리!
              </p>
            </div>

            <div className="flex flex-col gap-1 pl-5">
              <p className="text-base text-gray-600 max-md:text-sm">
                교사가 별도로 챙길 일 전혀 없음
              </p>
              <p className="text-base text-gray-600 max-md:text-sm">
                휴대폰 접속 → 학부모 동의 → 학생 진단 한 번에 진행
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
