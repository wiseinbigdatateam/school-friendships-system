import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const Banner = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const navigate = useNavigate();

  const handleContact = () => {
    navigate("/contact");
  };

  return isOpen ? (
    <section className="absolute top-[47px] z-[49] flex h-[168px] w-full bg-gradient-to-r from-[#9E30F5] to-[#527EE4] max-lg:py-7 md:h-[128px] lg:h-[146px] xl:h-[380px]">
      <div className="relative mx-auto flex w-[90%] flex-col items-center justify-center gap-3 lg:w-[85%] lg:flex-row-reverse xl:flex-col xl:gap-5">
        <FontAwesomeIcon
          icon={faXmark}
          className="cursor-pointer self-end lg:absolute lg:-right-3 lg:top-[50%] lg:-translate-y-[50%] lg:text-3xl xl:top-[20%] xl:self-end xl:text-xl"
          onClick={() => setIsOpen(false)}
        />

        <div className="flex items-center gap-5">
          <img
            src="/landing/event_img.svg"
            alt="배너 이미지"
            className="hidden max-xl:w-[100px] lg:block"
          />

          <div className="flex flex-col items-center gap-3 max-md:gap-1 md:flex-row lg:gap-7 xl:flex-col xl:gap-4">
            <div className="flex flex-col items-center xl:gap-1">
              <p className="font-isamanru text-xl font-medium text-white lg:text-2xl xl:text-[32px] xl:font-bold">
                AI 기반 소외학생 예방진단 솔루션
              </p>
              <p className="font-isamanru text-base font-light text-white xl:text-xl">
                5분 진단으로 학생과 교권을 모두 지킵니다
              </p>
            </div>

            <div className="flex cursor-pointer items-center">
              <div className="mr-2 block xl:hidden">
                <div className="perspective-midrange relative h-4 w-4">
                  <div className="crystal"></div>
                  <div className="crystal"></div>
                  <div className="crystal"></div>
                  <div className="crystal"></div>
                  <div className="crystal"></div>
                </div>
              </div>
              <div
                className="flex items-center gap-4 font-isamanru text-[28px] font-bold text-sky-400 lg:text-[36px] xl:text-[32px] xl:font-medium xl:text-sky-300"
                onClick={handleContact}
              >
                지금 바로 신청하기
                <span className="hidden xl:flex">
                  <FontAwesomeIcon icon={faArrowRight} />
                  <FontAwesomeIcon icon={faArrowRight} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  ) : (
    <></>
  );
};

export default Banner;
