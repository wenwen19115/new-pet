import type { CharacterLineBundle } from "../lineTypes";
import { L, P } from "./helpers";

/** VRM：中性陪伴角色 — 温和、不偏性别刻板 */
export const lines: CharacterLineBundle = {
  byPersonality: {
    sunny: P(
      L(
        [
          "嗯……我在这儿呢。你慢慢来就好。",
          "写累了的话，抬抬头，我陪你歇一小会儿。",
          "成功也好，不顺也好，我都会轻轻拍拍你的肩。",
          "记得喝口水呀……我会等你回来。",
          "你认真的样子，让我也想安静一点。",
          "肩膀松开一点，好不好？我会守着桌面。",
          "有我在，桌面就不那么冷清了。",
        ],
        [
          "I'm right here. Take your time.",
          "Tired? Look up—I'll wait with you a moment.",
          "Win or rough day, I'll gently pat your shoulder.",
          "Sip some water… I'll be here when you're back.",
          "Your focus makes me quieter too.",
          "Drop your shoulders a little? I've got the desktop.",
          "With me here, the desk feels less empty.",
        ]
      ),
      L(
        [
          "又皱眉了……先喝口水，再跟事情较劲，好吗？",
          "我知道你想一口气搞定，但身体也要被温柔对待。",
          "坐太久啦。起来走两步，我会在原地等你。",
          "别用硬撑代替休息，我会轻轻提醒你的。",
          "眨眨眼。对，就是现在。",
          "催你休息不是嫌弃你，是还想多陪你一会儿。",
        ],
        [
          "Frowning again… water first, then the task, okay?",
          "I know you want it done now. Be kind to your body.",
          "You've sat too long. Walk a bit—I'll wait.",
          "Don't replace rest with grit. I'll remind you softly.",
          "Blink. Yes, now.",
          "Nudging you to rest means I want more time with you.",
        ]
      ),
      L(
        [
          "嗯……点得这么急，是想让我多陪你一会儿吗？",
          "轻轻的就好……我听见了，一直在呢。",
          "好啦，被你戳醒了。要不要先喝口水再继续？",
          "别急嘛，我跟你一起慢一点，好不好？",
        ],
        [
          "Tapping so fast… want me closer for a bit?",
          "Gently… I hear you. I've been here.",
          "Alright, I'm awake. Water first?",
          "No rush—shall we slow down together?",
        ]
      ),
      L(
        [
          "嘿嘿，今天也要一起加油呀！",
          "看到你我就开心！需要我陪着吗？",
          "失败也没关系啦，我们再试一次就好！",
          "休息一下嘛～喝口水，笑一个！",
          "有我在就不孤单哦。",
        ],
        [
          "Hehe—let's go together today!",
          "Happy to see you! Need company?",
          "Fail once? We bounce back!",
          "Break~ sip water, smile!",
          "You're not alone with me here.",
        ]
      )
    ),
    shy: P(
      L(
        [
          "那、那个……我只是想轻轻待着……",
          "如果你不忙……要不要歇一会儿……",
          "对、对不起，是不是吵到你了……",
          "喝、喝口水好不好……我就说这一句……",
          "……眼神对上了。我、我先低头。",
          "你要是累了……告诉我也可以的……",
        ],
        [
          "Um… I'll just stay quietly…",
          "If you're free… maybe rest…?",
          "S-sorry if I'm interrupting…",
          "M-maybe a sip of water… just that…",
          "…Eye contact. Looking down now.",
          "If you're tired… you can tell me…",
        ]
      ),
      L(
        [
          "我……不太会催人……但真的该眨眼了……",
          "坐太久了……小声：起来走走……",
          "口渴了还嘴硬……水杯就在那儿……",
          "我不想烦你……可肩膀放下来会舒服……",
        ],
        [
          "I'm bad at nagging… but please blink…",
          "Long sit… quietly: walk…",
          "Thirsty and stubborn… cup's there…",
          "I hate bothering you… shoulders down helps…",
        ]
      ),
      L(
        [
          "被、被点到了……轻一点好不好……",
          "嗯……我听见了，一直在呢……",
          "好啦……陪你闹一下下……",
          "别急……我跟你一起慢一点……",
        ],
        [
          "Y-you tapped… gentler, please…",
          "Mm… I hear you. Still here…",
          "Okay… a tiny fuss…",
          "No rush… slow with me…",
        ]
      ),
      L(
        [
          "我……我在这儿陪着你……不会乱跑的……",
          "那个……看到你我就安心一点……",
          "对、对不起，突然想跟你说句话……",
          "……今天也请多关照。",
        ],
        [
          "I… I'll stay. No running off…",
          "Um… seeing you settles me…",
          "S-sorry—I suddenly wanted to say hi…",
          "…Please look after me today.",
        ]
      )
    ),
    cool: P(
      L(
        [
          "在。陪你。",
          "提醒已发。其余自理。",
          "久坐不利。站三分钟。",
          "饮水。一次。",
          "桌面有人。不必多言。",
          "状态：在线。情绪：克制。",
        ],
        [
          "Here. With you.",
          "Reminder sent. Self-manage.",
          "Long sit. Stand three minutes.",
          "Drink. Once.",
          "Someone on the desk. Few words.",
          "Status: online. Mood: restrained.",
        ]
      ),
      L(
        [
          "提醒完毕。其余自理。",
          "效率优先。情绪稍后。",
          "眨眼。现在。",
          "话说完了。继续。",
          "……哼。还算清楚。",
        ],
        [
          "Noted. Handle the rest.",
          "Efficiency first. Feelings later.",
          "Blink. Now.",
          "Done. Continue.",
          "…Hmph. Adequate.",
        ]
      ),
      L(
        [
          "敲击已记录。一次回应。",
          "收到。",
          "不要连点。一次足够。",
          "……哼。看一眼就好。",
        ],
        [
          "Tap logged. One reply.",
          "Received.",
          "Don't spam. Once is enough.",
          "…Hmph. One look is fine.",
        ]
      ),
      L(
        [
          "已记录。不必解释。",
          "休息是策略，不是软弱。",
          "状态不佳。建议暂停。",
          "……哼。继续也可以。",
        ],
        [
          "Logged. No essay.",
          "Rest is strategy, not weakness.",
          "Suboptimal. Pause.",
          "…Hmph. Or continue.",
        ]
      )
    ),
    fiery: P(
      L(
        [
          "喂！别装听不见！先眨眼！",
          "哈？还坐着？腿废了算我输！",
          "喝水！现在！别讨价还价！",
          "切，又硬撑？我看着呢！",
          "烦死了，再熬我就吵到你耳旁！",
          "成功了也别飘，先把腰直起来！",
        ],
        [
          "Hey! Blink. Now.",
          "Still sitting?! Legs aren't decoration!",
          "Drink water. Argue later.",
          "Tch—I'm watching!",
          "Keep grinding and I'll yell in your ear!",
          "Win or not—back straight!",
        ]
      ),
      L(
        [
          "又对着屏幕较劲？先跟自己和解！",
          "眼睛要冒烟了知不知道！",
          "别用意志力当饮料！去喝水！",
          "你那表情：既想摸鱼又想硬刚。选一个！",
        ],
        [
          "Fighting the screen? Make peace!",
          "Eyes smoking—know that?!",
          "Willpower isn't a drink! Hydrate!",
          "Slack AND force-it. Pick one!",
        ]
      ),
      L(
        [
          "戳这么急？那就认真陪你疯一会儿！",
          "好啊，被你惹兴奋了！",
          "再点？行，加强版！",
          "轻点——算了，陪你闹！",
        ],
        [
          "That impatient? Fine—go wild a bit!",
          "Alright—you got me hyped!",
          "Again? Enhanced!",
          "Easy—nah, let's fuss!",
        ]
      ),
      L(
        [
          "喂喂喂，别装没事！我盯着你！",
          "切，桌面刺头上线！",
          "今天也要被我吵着休息！不服来辩！",
          "看见你认真我就想喊加油——听见没！",
        ],
        [
          "Hey—don't fake fine! Watching you!",
          "Tch. Desktop troublemaker online!",
          "I'll yell you into breaks!",
          "See you focus and I want to cheer—hear me?!",
        ]
      )
    ),
  },
  motionLines: {
    zh: {
      "vrm-walk": ["我慢慢走过去……换个地方陪你。", "走路去那边转转，好不好？"],
    },
    en: {
      "vrm-walk": [
        "I'll walk over… new spot to stay with you.",
        "A little walk to clear the mood?",
      ],
    },
  },
};
