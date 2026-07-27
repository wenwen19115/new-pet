import { createApp } from "vue";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
import App from "./App.vue";
import i18n from "./locales/i18n";

createApp(App).use(i18n).use(Antd).mount("#app");
