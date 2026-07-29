import type { PetChatPersona } from "./types";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function localPetChatReply(
  persona: PetChatPersona,
  userText: string
): string {
  const name = persona.petName || (persona.lang === "en" ? "Pet" : "桌宠");
  const zh = persona.lang === "zh";
  const snarky = persona.tone === "snarky";
  const t = userText.trim();

  const byPersonality = (cute: string[], roast: string[]): string =>
    pick(snarky ? roast : cute);

  if (/^(hi|hello|hey|yo)\b|你好|您好|嗨|哈喽|早|晚安/i.test(t)) {
    return byPersonality(
      zh
        ? [`嗨～我是${name}！`, `${name}在呢，想聊点什么？`, `来啦，我听着呢～`]
        : [`Hi! I'm ${name}.`, `${name} here — what's up?`, `Hey! I'm all ears.`],
      zh
        ? [`哦，是你啊。`, `${name}在。有话快说。`, `嗯，我听着。`]
        : [`Oh. It's you.`, `${name} here. Spit it out.`, `Yeah, I'm listening.`]
    );
  }

  if (/你是谁|叫什么|名字|who are you|your name|介绍/i.test(t)) {
    return byPersonality(
      zh
        ? [
            `我是${name}呀，就在桌面上陪着你。`,
            `嗯，我叫${name}，你的小桌宠～`,
            `${name}报到！专陪你摸鱼的那种。`,
          ]
        : [
            `I'm ${name}, your desktop buddy.`,
            `Call me ${name} — I live on your screen.`,
            `${name}, reporting for cuddle duty.`,
          ],
      zh
        ? [
            `${name}。桌宠。别问太多。`,
            `我是${name}。看名字就懂了吧。`,
            `${name}。还用介绍？`,
          ]
        : [
            `${name}. Desktop pet. Next question.`,
            `I'm ${name}. The name's the resume.`,
            `${name}. Obvious, no?`,
          ]
    );
  }

  if (/累|困|烦|难过|伤心|tired|sad|stress|忙/i.test(t)) {
    return byPersonality(
      zh
        ? [
            `辛苦啦…先喝口水，我在这儿陪你。`,
            `嗯嗯，累了就歇一小下，我等你。`,
            `抱抱。事情一件件来，好吗？`,
          ]
        : [
            `Rough day? Water first — I'm right here.`,
            `Rest a minute. I'll wait.`,
            `Hey… one thing at a time, okay?`,
          ],
      zh
        ? [`累就停一下。硬撑很蠢。`, `行了，先休息。我看着。`, `别硬刚。歇会儿。`]
        : [
            `Stop pushing. Rest.`,
            `Fine — break time. I'll watch.`,
            `Don't grind yourself down.`,
          ]
    );
  }

  if (/谢谢|thank/i.test(t)) {
    return byPersonality(
      zh
        ? [`嘿嘿，小事～`, `被你夸到啦。`, `不客气呀。`]
        : [`Anytime~`, `You're welcome!`, `Aw, thanks.`],
      zh
        ? [`嗯。`, `知道了。`, `行。`]
        : [`Mm.`, `Noted.`, `Sure.`]
    );
  }

  switch (persona.personality) {
    case "shy":
      return byPersonality(
        zh
          ? [`嗯…我听到了。`, `那、那个…我陪你想想？`, `好、好的…我在呢。`]
          : [`Mm… I heard you.`, `I-I can sit with you…`, `Okay… I'm here.`],
        zh
          ? [`……嗯。`, `知道了。`, `我听着。`]
          : [`…Okay.`, `Got it.`, `I'm listening.`]
      );
    case "cool":
      return byPersonality(
        zh
          ? [`收到。`, `嗯，继续说。`, `可以。`]
          : [`Got it.`, `Go on.`, `Alright.`],
        zh
          ? [`哼。`, `然后呢？`, `说重点。`]
          : [`Hmph.`, `And?`, `Point?`]
      );
    case "fiery":
      return byPersonality(
        zh
          ? [`哈！有意思！`, `行啊，接着说！`, `冲！我听着呢！`]
          : [`Ha! Nice!`, `Okay, keep going!`, `Let's go — I'm in!`],
        zh
          ? [`切，就这？`, `快点说！`, `行行行，我听着！`]
          : [`Tch, that all?`, `Spit it faster!`, `Fine, I'm listening!`]
      );
    default:
      return byPersonality(
        zh
          ? [`嗯嗯，我记住啦～`, `有道理！再跟我说说？`, `好呀，我陪你聊。`]
          : [
              `Got it~ tell me more?`,
              `Nice! What else?`,
              `Sure — I'm chatting with you.`,
            ],
        zh
          ? [`哦。`, `行吧。`, `继续。`]
          : [`Oh.`, `Fine.`, `Continue.`]
      );
  }
}
