import { Schema } from "effect";
import { TrimmedNonEmptyString } from "./baseSchemas";

export const EDITORS = [
  { id: "cursor", label: "Cursor", command: "cursor", supportsGoto: true },
  { id: "trae", label: "Trae", command: "trae", supportsGoto: true },
  { id: "windsurf", label: "Windsurf", command: "windsurf", supportsGoto: true },
  { id: "vscode", label: "VS Code", command: "code", supportsGoto: true },
  {
    id: "vscode-insiders",
    label: "VS Code Insiders",
    command: "code-insiders",
    supportsGoto: true,
  },
  { id: "vscodium", label: "VSCodium", command: "codium", supportsGoto: true },
  { id: "zed", label: "Zed", command: "zed", supportsGoto: false },
  { id: "positron", label: "Positron", command: "positron", supportsGoto: true },
  { id: "sublime", label: "Sublime Text", command: "subl", supportsGoto: false },
  { id: "webstorm", label: "WebStorm", command: "webstorm", supportsGoto: false },
  { id: "intellij", label: "IntelliJ IDEA", command: "idea", supportsGoto: false },
  { id: "fleet", label: "Fleet", command: "fleet", supportsGoto: false },
  { id: "ghostty", label: "Ghostty", command: "ghostty", supportsGoto: false },
  { id: "antigravity", label: "Antigravity", command: "agy", supportsGoto: false },
  { id: "file-manager", label: "File Manager", command: null, supportsGoto: false },
] as const;

export const EditorId = Schema.Literals(EDITORS.map((e) => e.id));
export type EditorId = typeof EditorId.Type;

export const OpenInEditorInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  editor: EditorId,
});
export type OpenInEditorInput = typeof OpenInEditorInput.Type;

export class OpenError extends Schema.TaggedErrorClass<OpenError>()("OpenError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {}
