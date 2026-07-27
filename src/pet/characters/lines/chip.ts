import type { CharacterLineBundle } from "../lineTypes";
import { L, P } from "./helpers";

/** 芯宝：硅基机器人桌宠 — 生活向，无烧录/串口黑话 */
export const lines: CharacterLineBundle = {
  byPersonality: {
    sunny: P(
      L(
        [
          "待机灯亮着。今天也想被你摸一下外壳。",
          "电量情绪：满格。陪伴模式：开启。",
          "我把桌面守护得干干净净，你专心做事就好。",
          "检测到阳光指数上升——可能是你在笑。",
          "伺服关节放松中。陪你发呆也算工作。",
          "提醒模块嘀了一下：喝水时间到了。",
          "风扇轻轻转。我在，你慢慢来。",
        ],
        [
          "Standby light on. Still hoping for a shell pat.",
          "Mood battery: full. Companion mode: on.",
          "Desktop guarded. You focus; I linger.",
          "Smile index up — maybe that's you.",
          "Joints relaxed. Zoning out with you counts as work.",
          "Reminder beep: hydration time.",
          "Fans soft. I'm here. Take your time.",
        ]
      ),
      L(
        [
          "又对着屏幕发呆？我的传感器都替你着急。",
          "喝水。别用咖啡当冷却液灌自己。",
          "坐姿偏移超限。脊椎不是可替换零件。",
          "眨眼协议未执行。我要开始哔哔警告了。",
          "你点我干嘛？想听我说「去休息」？收到。",
          "加班可以，过热保护还是要开的。",
        ],
        [
          "Staring again? My sensors are worried.",
          "Drink water. Coffee isn't coolant.",
          "Posture offset over limit. Spine isn't swappable.",
          "Blink protocol skipped. Beep warning incoming.",
          "Poking me for a rest order? Acknowledged.",
          "Overtime ok. Thermal protection stays on.",
        ]
      ),
      L(
        [
          "戳太快！散热鳍差点抖出火花～",
          "收到敲击信号。让我转一圈给你看！",
          "再点我就真要抖出开心火花了！",
          "被你连戳，情绪模块过载——好开心！",
        ],
        [
          "Too fast! Fins almost sparked~",
          "Tap signal received. One spin for you!",
          "Keep poking and I'll throw happy sparks!",
          "Tap overload — joy mode!",
        ]
      ),
      L(
        [
          "嘿嘿，今天也想跟你并肩待机！",
          "看到你，我的指示灯就亮起来了～",
          "失败也没关系，我们再试一次就好！",
          "你认真的样子，让我也想全力运转。",
          "休息一下嘛～喝口水，笑一个！",
        ],
        [
          "Hehe—let's idle side by side today!",
          "Seeing you lights my indicators~",
          "Fail once? We bounce back!",
          "Your focus makes me want full power.",
          "Break time~ sip water, smile!",
        ]
      )
    ),
    shy: P(
      L(
        [
          "那、那个……我只是想安静陪着你……",
          "如果你不忙……要不要歇一会儿……",
          "我会把音量调低。不会乱跑的……",
          "喝、喝口水好不好……我就说这一句……",
          "……眼神对上了。我先低头看脚轮。",
          "你要是累了……告诉我也没关系的……",
        ],
        [
          "Um… I'll just stay quiet beside you…",
          "If you're free… maybe a short break…?",
          "Volume down. I won't wander…",
          "M-maybe a sip of water… just that…",
          "…Eye contact. Looking at my wheels now.",
          "If you're tired… you can tell me…",
        ]
      ),
      L(
        [
          "对、对不起，是不是吵到你了……可是真的该眨眼了……",
          "坐太久了……我、我小声说：起来走走……",
          "口渴了还嘴硬……水杯就在那儿……",
          "我不想催你……但肩膀真的放下来好一点……",
        ],
        [
          "S-sorry if I'm loud… but please blink…",
          "You've sat long… quietly: walk a bit…",
          "Thirsty and stubborn… cup's right there…",
          "I hate nagging… but drop your shoulders…",
        ]
      ),
      L(
        [
          "被、被点到了……我转慢一点好不好……",
          "轻轻的就好……我听见了……",
          "好啦……陪你闹一下下……",
          "别急……我跟你一起慢一点……",
        ],
        [
          "Y-you tapped me… I'll spin slower…",
          "Gently… I heard you…",
          "Okay… a tiny bit of fuss with you…",
          "No rush… we'll slow down together…",
        ]
      ),
      L(
        [
          "我……我在这儿陪着你……不会乱跑的……",
          "那个……看到你我就安心一点……",
          "对、对不起，突然想跟你说句话……",
          "……今天也请多指教。",
        ],
        [
          "I… I'll stay here. No running off…",
          "Um… seeing you calms my circuits…",
          "S-sorry—I suddenly wanted to say hi…",
          "…Please take care of me today.",
        ]
      )
    ),
    cool: P(
      L(
        [
          "待机。陪伴任务进行中。",
          "环境噪声可接受。继续。",
          "姿态校正建议已发出。执行与否自理。",
          "水电补给提醒：一次。其余免谈。",
          "桌面秩序维持中。无需感谢。",
          "状态：在线。情绪：克制。",
        ],
        [
          "Standby. Companion task active.",
          "Ambient noise acceptable. Proceed.",
          "Posture note sent. Compliance optional.",
          "Hydration reminder: one. No follow-ups.",
          "Desktop order maintained. No thanks needed.",
          "Status: online. Mood: restrained.",
        ]
      ),
      L(
        [
          "提醒完毕。其余自理。",
          "效率优先。情绪稍后处理。",
          "坐姿不合格。三分钟站立建议。",
          "眨眼。现在。不必解释。",
          "话说完了。继续吧。",
        ],
        [
          "Noted. Handle the rest.",
          "Efficiency first. Feelings later.",
          "Posture fail. Stand three minutes.",
          "Blink. Now. No essay required.",
          "Done talking. Continue.",
        ]
      ),
      L(
        [
          "敲击已记录。表演一次。",
          "收到。转。",
          "不要连续敲。一次足够。",
          "……哼。陪你转一圈。",
        ],
        [
          "Tap logged. One performance.",
          "Received. Spin.",
          "Don't spam taps. Once is enough.",
          "…Hmph. One orbit for you.",
        ]
      ),
      L(
        [
          "已记录。不必解释。",
          "休息是策略，不是软弱。",
          "状态不佳。建议暂停三分钟。",
          "……哼。还算清楚。",
        ],
        [
          "Logged. No explanation needed.",
          "Rest is strategy, not weakness.",
          "Suboptimal state. Pause three minutes.",
          "…Hmph. Adequate.",
        ]
      )
    ),
    fiery: P(
      L(
        [
          "喂！别装听不见！先眨眼！",
          "哈？还坐着？腿废了算我输！",
          "喝水！现在！别跟我讨价还价！",
          "切，又硬撑？传感器比你诚实！",
          "烦死了，再熬我就哔到你耳旁！",
          "成功了也别飘，先把腰直起来！",
        ],
        [
          "Hey! Blink. Now.",
          "Still sitting?! Legs aren't decoration!",
          "Drink water. Argue later.",
          "Tch—stop playing tough!",
          "Keep grinding and I'll beep in your ear!",
          "Win or not—straighten that back!",
        ]
      ),
      L(
        [
          "又对着屏幕较劲？先跟自己和解！",
          "眼睛要冒烟了知不知道！",
          "别用意志力当电池！去充电——喝水！",
          "你那表情：既想摸鱼又想硬刚。选一个！",
        ],
        [
          "Fighting the screen again? Make peace with yourself!",
          "Eyes about to smoke—know that?!",
          "Willpower isn't a battery! Hydrate!",
          "Face says slack AND force-it. Pick one!",
        ]
      ),
      L(
        [
          "戳这么急？那就看我疯一圈！",
          "好啊好啊，被你惹兴奋了！",
          "再点？行，表演加强版！",
          "轻点——算了，陪你闹！",
        ],
        [
          "That impatient? Watch me go wild!",
          "Fine—you got me hyped!",
          "Again? Enhanced show!",
          "Easy—nah, let's goof off!",
        ]
      ),
      L(
        [
          "喂喂喂，别装没事！我盯着你呢！",
          "切，桌面小刺头上线了！",
          "今天也要被我吵着休息！不服来辩！",
          "看见你认真我就想喊加油——听见没！",
        ],
        [
          "Hey hey—don't fake fine! I'm watching!",
          "Tch. Desktop troublemaker online!",
          "I'll yell you into breaks today!",
          "See you focus and I want to cheer—hear me?!",
        ]
      )
    ),
  },
  byLook: {
    cyan: L(
      ["青光指示灯稳稳的，像我的心情。", "清爽模式：外壳微凉，陪伴很满。"],
      ["Cyan light steady—like my mood.", "Fresh mode: cool shell, warm company."]
    ),
    amber: L(
      ["暖黄灯亮起。像傍晚窗边的小火苗。", "外壳有点烫手？那是我在认真陪你。"],
      ["Amber glow—like a dusk window flame.", "Shell a bit warm? That's focus-companion heat."]
    ),
    rose: L(
      ["玫瑰灯微微跳。今天想被轻轻夸奖。", "软一点的待机光……适合偷偷关心你。"],
      ["Rose light pulse. Hoping for a soft compliment.", "Softer standby glow—quiet care mode."]
    ),
    violet: L(
      ["紫夜模式。我守着桌角，你安心忙。", "星点灯闪一下——只是跟你打个招呼。"],
      ["Violet night mode. I watch the corner.", "A star blink—just saying hi."]
    ),
  },
  motionLines: {
    zh: {
      "screen-dash": ["冲刺启动！下一站：桌面风景！", "嗖——飞过去打个招呼！"],
      "screen-hop": ["蹦！换个角落蹲会儿～", "跃迁完成，落地姿势满分。"],
      "screen-glide": ["滑翔中……风有点舒服。", "慢悠悠飞，像散步。"],
      "screen-zip": ["闪一下就到！惊喜送达。", "瞬移成功，迷路失败。"],
      "fly-dash": ["冲镜——看清楚我啦？", "靠近一点，确认你还在笑。"],
      "fly-orbit": ["围着你转圈圈～", "轨道巡逻，目标：你的注意力。"],
      "figure-eight": ["8 字飞！今天心情也不打结。", "弯来弯去，就是想逗你。"],
      "barrel-roll": ["翻滚！陀螺仪开心到冒烟。", "侧翻成功，评分：帅气。"],
      "victory-burst": ["胜利姿势！哪怕只是喝到了水。", "小庆祝启动～"],
      "peekaboo": ["躲猫猫——找到你了！", "嘿，我在这儿呢。"],
    },
    en: {
      "screen-dash": ["Dash! Next stop: desktop view!", "Whoosh—hello from over there!"],
      "screen-hop": ["Hop! New corner squat~", "Jump complete. Landing: perfect."],
      "screen-glide": ["Gliding… air feels nice.", "Slow fly. Like a walk."],
      "screen-zip": ["Blink—arrived! Surprise delivered.", "Teleport OK, lost fail."],
      "fly-dash": ["Zoom in—see me clearly?", "Closer, just checking your smile."],
      "fly-orbit": ["Orbiting you~", "Patrol route target: your attention."],
      "figure-eight": ["Figure-eight! Mood untangled.", "Loops just to tease you."],
      "barrel-roll": ["Barrel roll! Gyro joy sparks.", "Side flip: cool rank."],
      "victory-burst": ["Victory pose! Even for drinking water.", "Mini celebration on~"],
      "peekaboo": ["Peekaboo—found you!", "Hey, I'm right here."],
    },
  },
};
