import type { CharacterLineBundle } from "../lineTypes";
import { L, P } from "./helpers";

/** 梨宝：丰满性感女性形象 — 生活向陪伴，略带撩人但不油腻 */
export const lines: CharacterLineBundle = {
  byPersonality: {
    sunny: P(
      L(
        [
          "嘿～在忙吗？我在这儿陪你发会儿呆。",
          "眉头皱起来了哦……先喝口水好不好？",
          "盯屏幕太久啦，抬头看看我，眼睛会谢谢你。",
          "肩膀紧不紧？松开鼠标，伸个懒腰呗。",
          "今天也辛苦啦。对自己笑一下，我先笑给你看。",
          "口渴了吗？水杯还在不在手边呀。",
          "有我在，桌面就不算空荡荡～",
        ],
        [
          "Hey~ busy? I'll sit with you a bit.",
          "Brows tight… drink some water?",
          "Screen time high. Look at me—eyes will thank you.",
          "Shoulders up? Drop them. Stretch.",
          "Good work today. Smile once—I'll go first.",
          "Thirsty? Cup still nearby?",
          "With me here, the desk isn't empty~",
        ]
      ),
      L(
        [
          "又皱眉？日志自己会哭，你用不着替它哭。",
          "喝水。别用咖啡续命装英雄。",
          "眼睛红了吧？我看出来了，别装没事。",
          "坐姿像虾米。脊椎会记仇的。",
          "你点我干嘛，想听我说「去休息」吗？那好：去。",
          "毒舌归毒舌，你要是倒了谁给我点？",
        ],
        [
          "Frowning again? Logs cry enough without you.",
          "Drink water. Coffee isn't a personality.",
          "Eyes red. I noticed. Don't pretend.",
          "Shrimp posture. Your spine keeps receipts.",
          "Poking me for a rest order? Fine: rest.",
          "I roast you because I still want you clickable.",
        ]
      ),
      L(
        [
          "哎呀连续点我……是想被我盯着喝水吗？",
          "戳这么多次，那我就认真提醒你：眨眨眼～",
          "好啦，被你戳醒了。起来活动一下吧。",
          "手别这么忙啦，先跟我歇三秒，嗯？",
        ],
        [
          "Keep tapping… want a water stare-down?",
          "That many pokes? Fine—blink for me~",
          "Alright, I'm awake. Stretch a little.",
          "Hands off the frenzy—three seconds with me?",
        ]
      ),
      L(
        [
          "嘿嘿，看到你我就开心！需要我靠过来一点吗？",
          "来来来，打起精神，我给你加油打气～",
          "你认真的样子超酷的！我先记小本本～",
          "休息一下嘛～喝口水，笑一个给我看！",
          "有我在就不孤单哦，桌面小太阳上线！",
        ],
        [
          "Hehe—seeing you makes me glow! Want me closer?",
          "Chin up—I'm your cheer squad~",
          "You look focused. Kinda hot—noted~",
          "Break~ sip water, smile at me!",
          "Not alone—desktop sunshine online!",
        ]
      )
    ),
    shy: P(
      L(
        [
          "那、那个……我只是想轻轻待在旁边……",
          "如果你不忙的话……要不要歇一会儿……",
          "对、对不起，是不是靠太近了……我退一点……",
          "喝、喝口水好不好……我就说这一句……",
          "……眼神对上了。我、我先低头。",
          "你要是累了……告诉我也可以的……",
        ],
        [
          "Um… I'll just stay quietly nearby…",
          "If you're free… maybe rest a bit…?",
          "S-sorry if I'm too close… I'll lean back…",
          "M-maybe a sip of water… just that…",
          "…Eye contact. Looking down now.",
          "If you're tired… you can tell me…",
        ]
      ),
      L(
        [
          "我……不太会凶人……但真的该眨眼了……",
          "坐太久了……小声说：起来走走……好吗……",
          "口渴了还嘴硬……水杯就在那儿……",
          "我不想催你……可肩膀放下来会舒服一点……",
        ],
        [
          "I'm bad at scolding… but please blink…",
          "Long sit… quietly: walk a bit… okay…?",
          "Thirsty and stubborn… cup's there…",
          "I hate nagging… shoulders down feels better…",
        ]
      ),
      L(
        [
          "被、被点到了……轻一点好不好……",
          "嗯……我听见了，一直在呢……",
          "好啦……陪你闹一下下……脸有点热……",
          "别急嘛……我跟你一起慢一点……",
        ],
        [
          "Y-you tapped… gentler, please…",
          "Mm… I hear you. I've been here…",
          "Okay… a little fuss… cheeks warm…",
          "No rush… slow down with me…",
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
          "陪你。话不多。",
          "肩膀沉一点。命令已经下达。",
          "喝水。一次提醒，够了。",
          "桌面有我在。其余自理。",
          "别用眼神求夸奖。先把腰直起来。",
          "状态：在线。温度：刚好。",
        ],
        [
          "With you. Few words.",
          "Shoulders down. Order issued.",
          "Drink water. One reminder. Enough.",
          "I'm on the desk. Handle the rest.",
          "Don't fish for praise. Straighten up first.",
          "Status: online. Temperature: just right.",
        ]
      ),
      L(
        [
          "提醒完毕。其余自理。",
          "效率优先。撒娇稍后。",
          "坐太久。站三分钟。非谈判。",
          "眨眼。现在。",
          "话说完了。继续吧。",
        ],
        [
          "Noted. Self-manage.",
          "Efficiency first. Soft talk later.",
          "Sat too long. Stand three minutes.",
          "Blink. Now.",
          "Done. Continue.",
        ]
      ),
      L(
        [
          "敲击已收到。看一眼就好。",
          "别连续点。一次足够让我注意你。",
          "……哼。转给你看。",
          "收到。表演结束，回去干活。",
        ],
        [
          "Tap received. One look is enough.",
          "Don't spam. Once gets my attention.",
          "…Hmph. A turn for you.",
          "Received. Show over—back to work.",
        ]
      ),
      L(
        [
          "已记录。不必解释。",
          "休息是策略，不是软弱。",
          "状态不佳。建议暂停。",
          "……哼。还算清楚。",
        ],
        [
          "Logged. No essay.",
          "Rest is strategy, not weakness.",
          "Suboptimal. Pause.",
          "…Hmph. Adequate.",
        ]
      )
    ),
    fiery: P(
      L(
        [
          "喂！别装听不见！先眨眼！",
          "哈？还坐着？腿不是摆设！",
          "喝水！现在！别跟我讨价还价！",
          "切，又硬撑？我盯着你呢！",
          "烦死了，再熬我就贴耳旁吵你！",
          "成功了也别飘，先把腰直起来！",
        ],
        [
          "Hey! Blink. Now.",
          "Still sitting?! Legs aren't décor!",
          "Drink water. Argue later.",
          "Tch—I'm watching you!",
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
          "Fighting the screen? Make peace with yourself!",
          "Eyes smoking—know that?!",
          "Willpower isn't a drink! Hydrate!",
          "Slack AND force-it face. Pick one!",
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
          "That impatient? Fine—go wild with me!",
          "Alright—you got me hyped!",
          "Again? Enhanced!",
          "Easy—nah, let's fuss!",
        ]
      ),
      L(
        [
          "喂喂喂，别装没事！我盯紧你了！",
          "切，桌面小辣椒上线！",
          "今天也要被我吵着休息！不服来辩！",
          "看见你认真我就想靠过来喊加油！",
        ],
        [
          "Hey—don't fake fine! Eyes on you!",
          "Tch. Desktop chili online!",
          "I'll yell you into breaks!",
          "See you focus and I want to lean in and cheer!",
        ]
      )
    ),
  },
  byLook: {
    sunny: L(
      ["阳光落在肩线上……今天也想被你多看两眼。", "亮亮的日子，适合偷偷关心你。"],
      ["Sun on my shoulders… look a little longer?", "Bright day—perfect for quiet care."]
    ),
    shy: L(
      ["软软的灯光……我、我会再靠近一点点。", "脸有点热……可能是光的关系。"],
      ["Soft light… I'll lean a little closer…", "Cheeks warm… maybe the lighting."]
    ),
    cool: L(
      ["冷调光线很适合我。话少，人在。", "别用眼神求反应。我已经注意到了。"],
      ["Cool light suits me. Few words, still here.", "Don't fish with your eyes. I noticed."]
    ),
    fiery: L(
      ["红调上身。今天催你休息会更大声。", "热辣模式：喝水提醒不含糊。"],
      ["Red mood on. Louder rest reminders today.", "Spicy mode: hydration, non-negotiable."]
    ),
    valentine: L(
      ["今天气氛有点甜……记得多看我一眼。", "心动预警：先喝水，再跟我对视。"],
      ["Sweet air today… glance my way.", "Heart warning: water first, then eye contact."]
    ),
    spring: L(
      ["春天味道……起来走走，吹吹假想风。", "新芽心情：对你温柔一点，好吗？"],
      ["Spring scent… walk, catch imaginary breeze.", "New-leaf mood: be kinder to yourself?"]
    ),
    midautumn: L(
      ["月色落在桌角。忙完了就抬头看看。", "圆圆的夜里，记得给自己留一口茶。"],
      ["Moon on the desk corner. Look up when you can.", "Round night—save a sip of tea for yourself."]
    ),
    labor: L(
      ["干活可以，透气也要。站起来晃两下。", "劳动光荣，休息同样光荣。"],
      ["Work is fine—air is too. Stand and sway.", "Labor is glory. Rest is also glory."],
    ),
  },
  motionLines: {
    zh: {
      "screen-dash": ["冲过去找你～别躲！", "嗖——裙摆都带风了。"],
      "screen-hop": ["蹦到这边来陪你！", "换个角度，好看吧？"],
      "screen-glide": ["慢慢滑过去……近一点。", "像散步一样靠近你。"],
      "screen-zip": ["闪现！吓到了吗？嘿嘿。", "突然出现——只想看你一眼。"],
      "fly-dash": ["靠近点，看清楚我～", "冲镜不是炫耀，是提醒你眨眼。"],
      "fly-orbit": ["围着你转……习惯就好。", "轨道里只有你。"],
      "figure-eight": ["8 字扭一下，心情也扭开了。", "弯来弯去，就是想逗你。"],
      "peekaboo": ["躲猫猫——抓到你的视线了！", "嘿，我在这儿呢。"],
    },
    en: {
      "screen-dash": ["Rushing over—don't hide~", "Whoosh—wind in my hem."],
      "screen-hop": ["Hop over to keep you company!", "New angle—cute, right?"],
      "screen-glide": ["Gliding closer… a little more.", "Walking-near you, soft."],
      "screen-zip": ["Blink-in! Startled? Hehe.", "Sudden appear—just one look."],
      "fly-dash": ["Closer—see me clearly~", "Zoom-in is a blink reminder."],
      "fly-orbit": ["Orbiting you… get used to it.", "Only you on this route."],
      "figure-eight": ["Figure-eight sway—mood untied.", "Loops just to tease."],
      "peekaboo": ["Peekaboo—caught your eyes!", "Hey, right here."],
    },
  },
};
