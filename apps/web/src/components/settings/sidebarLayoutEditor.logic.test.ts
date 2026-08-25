import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_SIDEBAR_LAYOUT } from "@t3tools/contracts/settings";

import {
  isDefaultSidebarLayout,
  moveSidebarLayoutItem,
  sidebarLayoutSectionDropId,
} from "./sidebarLayoutEditor.logic";

describe("moveSidebarLayoutItem", () => {
  it("reorders within a section when dropped on a sibling", () => {
    const next = moveSidebarLayoutItem({
      layout: DEFAULT_SIDEBAR_LAYOUT,
      itemId: "usage",
      overId: "settings",
    });
    expect(next).toEqual({
      top: [],
      list: ["pinned-items"],
      bottom: ["usage", "settings", "pull-requests", "github", "dashboard", "profile"],
    });
  });

  it("moves an item into another section when dropped on one of its items", () => {
    const next = moveSidebarLayoutItem({
      layout: DEFAULT_SIDEBAR_LAYOUT,
      itemId: "profile",
      overId: "pinned-items",
    });
    expect(next).toEqual({
      top: [],
      list: ["profile", "pinned-items"],
      bottom: ["settings", "pull-requests", "usage", "github", "dashboard"],
    });
  });

  it("files an item at the head of an empty section dropped on its header", () => {
    const next = moveSidebarLayoutItem({
      layout: DEFAULT_SIDEBAR_LAYOUT,
      itemId: "profile",
      overId: sidebarLayoutSectionDropId("top"),
    });
    expect(next).toEqual({
      top: ["profile"],
      list: ["pinned-items"],
      bottom: ["settings", "pull-requests", "usage", "github", "dashboard"],
    });
  });

  it("moves the pinned block out of the thread list", () => {
    const next = moveSidebarLayoutItem({
      layout: DEFAULT_SIDEBAR_LAYOUT,
      itemId: "pinned-items",
      overId: sidebarLayoutSectionDropId("top"),
    });
    expect(next).toEqual({
      top: ["pinned-items"],
      list: [],
      bottom: DEFAULT_SIDEBAR_LAYOUT.bottom,
    });
  });

  it("returns null when the drop changes nothing", () => {
    expect(
      moveSidebarLayoutItem({
        layout: DEFAULT_SIDEBAR_LAYOUT,
        itemId: "settings",
        overId: "settings",
      }),
    ).toBeNull();
    expect(
      moveSidebarLayoutItem({
        layout: DEFAULT_SIDEBAR_LAYOUT,
        itemId: "pinned-items",
        overId: sidebarLayoutSectionDropId("list"),
      }),
    ).toBeNull();
    expect(
      moveSidebarLayoutItem({
        layout: DEFAULT_SIDEBAR_LAYOUT,
        itemId: "settings",
        overId: "not-a-drop-target",
      }),
    ).toBeNull();
  });
});

describe("isDefaultSidebarLayout", () => {
  it("recognizes the default and any deviation from it", () => {
    expect(isDefaultSidebarLayout(DEFAULT_SIDEBAR_LAYOUT)).toBe(true);
    expect(
      isDefaultSidebarLayout({
        top: ["profile"],
        list: ["pinned-items"],
        bottom: ["settings", "pull-requests", "usage", "github", "dashboard"],
      }),
    ).toBe(false);
  });
});
