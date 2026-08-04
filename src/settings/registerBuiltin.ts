import {
  BulbOutlined,
  CloudOutlined,
  CommentOutlined,
  EyeOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons-vue";
import { registerSettingsModule } from "./registry";
import CompanionPanel from "./modules/CompanionPanel.vue";
import BehaviorPanel from "./modules/BehaviorPanel.vue";
import MotionPanel from "./modules/MotionPanel.vue";
import ChatPanel from "./modules/ChatPanel.vue";
import SkyWeatherPanel from "./modules/SkyWeatherPanel.vue";
import AppPanel from "./modules/AppPanel.vue";

let registered = false;

/** 幂等：设置壳只调一次 */
export function registerBuiltinSettingsModules(): void {
  if (registered) return;
  registered = true;

  registerSettingsModule({
    id: "buddy",
    order: 10,
    labelKey: "pet.tabBuddy",
    icon: RobotOutlined,
    panel: CompanionPanel,
  });

  registerSettingsModule({
    id: "behavior",
    order: 20,
    labelKey: "pet.tabBehavior",
    icon: EyeOutlined,
    panel: BehaviorPanel,
  });

  registerSettingsModule({
    id: "motion",
    order: 30,
    labelKey: "pet.tabMotion",
    icon: ThunderboltOutlined,
    panel: MotionPanel,
  });

  registerSettingsModule({
    id: "chat",
    order: 40,
    labelKey: "pet.tabChat",
    icon: CommentOutlined,
    panel: ChatPanel,
  });

  registerSettingsModule({
    id: "sky",
    order: 50,
    labelKey: "pet.tabSkyWeather",
    icon: CloudOutlined,
    panel: SkyWeatherPanel,
  });

  registerSettingsModule({
    id: "app",
    order: 90,
    labelKey: "pet.tabApp",
    icon: BulbOutlined,
    panel: AppPanel,
  });
}
