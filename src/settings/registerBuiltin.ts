import {
  BulbOutlined,
  CommentOutlined,
  EyeOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons-vue";
import { registerSettingsModule } from "./registry";
import CompanionPanel from "./modules/CompanionPanel.vue";
import LookPanel from "./modules/LookPanel.vue";
import MotionPanel from "./modules/MotionPanel.vue";
import ChatPanel from "./modules/ChatPanel.vue";
import AppPanel from "./modules/AppPanel.vue";

let registered = false;

/** Idempotent — call once from settings shell */
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
    id: "look",
    order: 20,
    labelKey: "pet.tabBehavior",
    icon: EyeOutlined,
    panel: LookPanel,
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
    id: "app",
    order: 90,
    labelKey: "pet.tabApp",
    icon: BulbOutlined,
    panel: AppPanel,
  });
}
