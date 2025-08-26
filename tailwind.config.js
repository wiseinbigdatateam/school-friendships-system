/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        noto: ["Noto Sans KR", "sans-serif"],
        pretendard: ["Pretendard", "sans-serif"],
        wiseon: ["Noto Sans KR", "Pretendard", "sans-serif"],
      },
    },
  },
  plugins: ["prettier-plugin-tailwindcss"],
};
