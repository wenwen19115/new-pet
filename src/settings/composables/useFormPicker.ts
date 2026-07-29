import {
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type Ref,
} from "vue";

export function useFormPicker(options: {
  modelKind: Ref<string>;
  enabled: Ref<boolean>;
  settingsTab: Ref<string>;
}) {
  const { modelKind, enabled, settingsTab } = options;

  const formPickerRef = ref<HTMLElement | null>(null);
  const formThumbStyle = ref<Record<string, string>>({
    opacity: "0",
    transform: "translateX(0)",
    width: "0px",
  });

  let formPickerRo: ResizeObserver | null = null;

  function setThumbTransitionEnabled(on: boolean) {
    const thumb = formPickerRef.value?.querySelector(
      ".form-picker-thumb"
    ) as HTMLElement | null;
    if (!thumb) return;
    thumb.style.transition = on ? "" : "none";
  }

  function syncFormThumb(animate: boolean) {
    const root = formPickerRef.value;
    if (!root) return;
    const active = root.querySelector(
      ".form-picker-item.is-active"
    ) as HTMLElement | null;
    if (!active) {
      setThumbTransitionEnabled(false);
      formThumbStyle.value = {
        opacity: "0",
        transform: "translateX(0)",
        width: "0px",
      };
      return;
    }

    if (!animate) {
      setThumbTransitionEnabled(false);
    }

    formThumbStyle.value = {
      opacity: "1",
      width: `${active.offsetWidth}px`,
      transform: `translateX(${active.offsetLeft}px)`,
    };

    if (!animate) {
      void root.offsetWidth;
      setThumbTransitionEnabled(true);
    }
  }

  function bindFormPickerRo() {
    formPickerRo?.disconnect();
    formPickerRo = null;
    const root = formPickerRef.value;
    if (!root || typeof ResizeObserver === "undefined") return;
    formPickerRo = new ResizeObserver(() => syncFormThumb(true));
    formPickerRo.observe(root);
  }

  function disposeFormPicker() {
    formPickerRo?.disconnect();
    formPickerRo = null;
  }

  watch(modelKind, async () => {
    await nextTick();
    syncFormThumb(true);
  });

  watch(formPickerRef, async (el) => {
    if (!el) {
      disposeFormPicker();
      return;
    }
    await nextTick();
    syncFormThumb(false);
    bindFormPickerRo();
  });

  watch(enabled, async (on) => {
    if (!on) {
      disposeFormPicker();
      return;
    }
    if (settingsTab.value !== "buddy") return;
    await nextTick();
    syncFormThumb(false);
    bindFormPickerRo();
  });

  watch(settingsTab, async (tab) => {
    if (tab !== "buddy" || !enabled.value) return;
    await nextTick();
    syncFormThumb(false);
    bindFormPickerRo();
  });

  onBeforeUnmount(disposeFormPicker);

  return {
    formPickerRef,
    formThumbStyle,
    syncFormThumb,
    bindFormPickerRo,
    disposeFormPicker,
  };
}
