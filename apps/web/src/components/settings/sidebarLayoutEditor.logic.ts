import {
  DEFAULT_SIDEBAR_LAYOUT,
  SIDEBAR_LAYOUT_SECTION_IDS,
  type NormalizedSidebarLayout,
  type SidebarLayoutItemId,
  type SidebarLayoutSectionId,
} from "@t3tools/contracts/settings";

export const SIDEBAR_LAYOUT_ITEM_LABELS: Readonly<Record<SidebarLayoutItemId, string>> = {
  "pinned-items": "Pinned items",
  settings: "Settings",
  "pull-requests": "Pull Requests",
  usage: "Usage",
  github: "GitHub",
  dashboard: "Dashboard",
  profile: "Profile",
};

export const SIDEBAR_LAYOUT_SECTION_LABELS: Readonly<Record<SidebarLayoutSectionId, string>> = {
  top: "Top",
  list: "Thread list",
  bottom: "Bottom",
};

export const SIDEBAR_LAYOUT_SECTION_HINTS: Readonly<Record<SidebarLayoutSectionId, string>> = {
  top: "Fixed above the thread list",
  list: "Scrolls with your threads",
  bottom: "The row at the foot of the sidebar",
};

/** Droppable id for a section header, so an empty section can still receive items. */
export function sidebarLayoutSectionDropId(section: SidebarLayoutSectionId): string {
  return `section:${section}`;
}

export function isSameSidebarLayout(
  a: NormalizedSidebarLayout,
  b: NormalizedSidebarLayout,
): boolean {
  return SIDEBAR_LAYOUT_SECTION_IDS.every(
    (section) =>
      a[section].length === b[section].length &&
      a[section].every((id, index) => id === b[section][index]),
  );
}

export function isDefaultSidebarLayout(layout: NormalizedSidebarLayout): boolean {
  return isSameSidebarLayout(layout, DEFAULT_SIDEBAR_LAYOUT);
}

type FlatEntry =
  | { readonly kind: "section"; readonly section: SidebarLayoutSectionId }
  | { readonly kind: "item"; readonly id: SidebarLayoutItemId };

/**
 * Applies one drop in the settings editor. The editor is one flat sortable
 * list with the three section headers as fixed markers between the items, so
 * `overId` is either another item — the moved item takes its place, standard
 * `arrayMove` semantics — or a section header's drop id (see
 * `sidebarLayoutSectionDropId`), which files the item at the head of that
 * section; that is the only way into an empty section. Returns null when the
 * drop changes nothing.
 */
export function moveSidebarLayoutItem(input: {
  readonly layout: NormalizedSidebarLayout;
  readonly itemId: SidebarLayoutItemId;
  readonly overId: string;
}): NormalizedSidebarLayout | null {
  const { layout, itemId, overId } = input;
  const flat: FlatEntry[] = [];
  for (const section of SIDEBAR_LAYOUT_SECTION_IDS) {
    flat.push({ kind: "section", section });
    for (const id of layout[section]) {
      flat.push({ kind: "item", id });
    }
  }
  const fromIndex = flat.findIndex((entry) => entry.kind === "item" && entry.id === itemId);
  if (fromIndex === -1) return null;

  const overSection = SIDEBAR_LAYOUT_SECTION_IDS.find(
    (section) => sidebarLayoutSectionDropId(section) === overId,
  );
  let next: FlatEntry[];
  if (overSection !== undefined) {
    next = flat.filter((_, index) => index !== fromIndex);
    const headerIndex = next.findIndex(
      (entry) => entry.kind === "section" && entry.section === overSection,
    );
    next.splice(headerIndex + 1, 0, { kind: "item", id: itemId });
  } else {
    const toIndex = flat.findIndex((entry) => entry.kind === "item" && entry.id === overId);
    if (toIndex === -1 || toIndex === fromIndex) return null;
    next = [...flat];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved!);
  }

  const result: Record<SidebarLayoutSectionId, SidebarLayoutItemId[]> = {
    top: [],
    list: [],
    bottom: [],
  };
  let current: SidebarLayoutSectionId = "top";
  for (const entry of next) {
    if (entry.kind === "section") {
      current = entry.section;
      continue;
    }
    result[current].push(entry.id);
  }
  return isSameSidebarLayout(result, layout) ? null : result;
}
