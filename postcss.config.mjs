import tailwindcss from "@tailwindcss/postcss";

const config = process.env.VITEST
  ? {
      plugins: [tailwindcss()],
    }
  : {
      plugins: {
        "@tailwindcss/postcss": {},
      },
    };

export default config;
