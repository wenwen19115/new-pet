# Desktop Pet — architecture

## Layers

```
src/settings/     # module registry + usePetSettingsPage + panels
src/pet/
  characters/     # CharacterDef packages (+ view.Model / bind* / runtime)
    lines/        # per-character idle/tap/motion line pools
    motionRemap.ts
  domain/         # extensions, motionPlayer (no Vue)
  runtime/        # usePetSpeech, usePetIdleLoop
  models/         # skin Vue components (mounted via CharacterDef.view)
  skins/          # look (形象) registry + form copy data
  lines.ts        # shared CARE + pick helpers (reads character.lines)
  motions.ts      # motion id catalog + timing (remap via characters)
```

## Naming

| Term | Meaning |
| --- | --- |
| **形象 look** | Pet appearance (`lookId`, swatches, fig art) |
| **UI theme** | Settings chrome day/night (`uiTheme`) |
| **性格 personality** | Dialogue flavor (sunny / shy / cool / fiery) |

## Character package (`characters/<id>.ts`)

Owns:

- `capabilities` — feature menu (UI/runtime gates; not `model ===`)
- `demoMotions` / `idleMotions` / `resolveMotion`
- `defaults` — lookId, demoMotion, optional `buildExtensions`
- `lookIds` — which looks from `skins/looks.ts` this character can use
- `size` / `previewHintKey` / `appearance`
- `lines` — idle + tap + optional `motionLines`
- `runtime` — gaze / screenFlight / tickLeds / tapFallbackMotion
- `view` — `shell` / `previewPad` / `Model` / `bindRuntime` / `bindPreview`

Registry (`characters/index.ts`) is the only list of model kinds. `PetModelKind` is open `string`; validate with `isPetModelKind`.

## Feature menu (check when adding a character)

| Capability / field | Effect |
| --- | --- |
| `custom-lines` | LookPanel custom dialogue editor |
| `motion-toggle` | MotionPanel built-in motion switches |
| `look-swatches` | CompanionPanel look (形象) chips |
| `preview-orbit` | Settings preview auto-orbit |
| `vrm-upload` / `vrm-bone-editor` | VRM file + bone editor |
| `pixel-fx` | Toon trail / pixel FX path |
| `lookIds` | Allowed look ids (empty = no swatches, e.g. VRM) |
| `runtime.screenFlight` | `fly` \| `wormhole` \| `none` |
| `runtime.tickLeds` | Pin LED chase (chip) |
| `runtime.gaze` | Cursor follow strength |
| `lines.motionLines` | Per-motion speak lines |
| `appearance.attachToonDecor` | Trail prefers decor palette |

## Extend

| Goal | Where |
| --- | --- |
| New settings tab | `registerSettingsModule` |
| One character | `characters/<id>.ts` + `lines/<id>.ts` + Model Vue + register + feature menu |
| New look for a character | Add def in `skins/looks.ts`, append id to that character's `lookIds` |
| All characters | `PetModelProfile` + Look / runtime |

## Storage

- Canonical key: `desktop-pet-settings`
- Profile field: `lookId`
- Legacy `wheat-esp-pet-*` is **read-once migrate**, never written back
