import { createApp } from "vue";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
import App from "./App.vue";
import i18n from "./locales/i18n";
import { loadPetSettings } from "./pet/data/settings";
import { paintDocumentBackdrop } from "./theme/applyTheme";

// 尽早铺底色，别等 Vue/splash 再闪白
paintDocumentBackdrop(loadPetSettings().theme.style);

createApp(App).use(i18n).use(Antd).mount("#app");
