import { h } from "vue";
import { Modal } from "ant-design-vue";
import type { ModalFuncProps } from "ant-design-vue";

const LOG_STYLE =
  "margin:0;padding:0;list-style:none;font-size:12px;line-height:1.65;max-height:260px;overflow:auto;text-align:left;";

type MaintModal = {
  destroy: () => void;
  update: (config: ModalFuncProps) => void;
};

type LogLine = {
  text: string;
  kind: "run" | "ok" | "err";
};

/** 维护进度：与确认框同位置的居中 Modal，每步先「正在」再改成「完成」 */
export function createMaintenanceLog(options: {
  title: string;
  /** 每步完成后的停顿，默认约 0.2s */
  paceMs?: number;
}) {
  const lines: LogLine[] = [];
  const paceMs = options.paceMs ?? 200;
  let modal: MaintModal | null = null;
  let closeTimer: number | null = null;

  function lineStyle(kind: LogLine["kind"]) {
    if (kind === "ok") return "margin:0;padding:0;color:rgba(82,196,26,0.95);";
    if (kind === "err") return "margin:0;padding:0;color:rgba(255,77,79,0.95);";
    return "margin:0;padding:0;opacity:0.75;";
  }

  function renderLog() {
    return h(
      "ul",
      { style: LOG_STYLE },
      lines.map((line) => h("li", { style: lineStyle(line.kind) }, line.text))
    );
  }

  function paint(phase: "run" | "ok" | "err", title = options.title) {
    if (closeTimer != null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    const config: ModalFuncProps = {
      title,
      content: renderLog(),
      centered: true,
      width: 416,
      keyboard: phase !== "run",
      maskClosable: phase !== "run",
      closable: phase !== "run",
      footer: null,
    };

    if (!modal) {
      modal = Modal.info(config) as MaintModal;
    } else {
      modal.update(config);
    }

    if (phase === "ok" || phase === "err") {
      closeTimer = window.setTimeout(() => {
        modal?.destroy();
        modal = null;
        closeTimer = null;
      }, 3000);
    }
  }

  function open() {
    paint("run");
  }

  function pace() {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, paceMs);
    });
  }

  /** 先显示进行中，跑完再取完成文案（done 可为工厂，便于按 run 结果分支） */
  async function step(
    running: string,
    done: string | (() => string),
    work?: () => void | Promise<void>
  ) {
    lines.push({ text: running, kind: "run" });
    paint("run");
    const resolveDone = () => (typeof done === "function" ? done() : done);
    try {
      if (work) await work();
      lines[lines.length - 1] = { text: resolveDone(), kind: "ok" };
      paint("run");
      await pace();
    } catch (err) {
      lines[lines.length - 1] = { text: resolveDone(), kind: "err" };
      paint("run");
      throw err;
    }
  }

  function done(title: string) {
    paint("ok", title);
  }

  function fail(title: string) {
    paint("err", title);
  }

  return { open, step, done, fail };
}
