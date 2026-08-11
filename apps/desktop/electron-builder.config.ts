import type { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.cafebot.desktop",
  productName: "Cafebot",
  directories: {
    output: "release",
  },
  files: ["out/**"],
  win: {
    target: "nsis",
  },
  mac: {
    target: "dmg",
    category: "public.app-category.education",
  },
  linux: {
    target: "AppImage",
    category: "Education",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};

export default config;
