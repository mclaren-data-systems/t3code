import { Fragment, useCallback, type ComponentType } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  ChartNoAxesColumnIcon,
  CircleUserRoundIcon,
  GitPullRequestIcon,
  GripVerticalIcon,
  LayoutDashboardIcon,
  PinIcon,
  SettingsIcon,
} from "lucide-react";
import {
  SIDEBAR_LAYOUT_SECTION_IDS,
  type SidebarLayoutItemId,
  type SidebarLayoutSectionId,
} from "@t3tools/contracts/settings";

import { useSidebarLayout, useUpdateClientSettings } from "../../hooks/useSettings";
import { cn } from "../../lib/utils";
import { GitHubIcon } from "../Icons";
import {
  moveSidebarLayoutItem,
  SIDEBAR_LAYOUT_ITEM_LABELS,
  SIDEBAR_LAYOUT_SECTION_HINTS,
  SIDEBAR_LAYOUT_SECTION_LABELS,
  sidebarLayoutSectionDropId,
} from "./sidebarLayoutEditor.logic";

const SIDEBAR_LAYOUT_ITEM_ICONS: Readonly<
  Record<SidebarLayoutItemId, ComponentType<{ className?: string }>>
> = {
  "pinned-items": PinIcon,
  settings: SettingsIcon,
  "pull-requests": GitPullRequestIcon,
  usage: ChartNoAxesColumnIcon,
  github: GitHubIcon,
  dashboard: LayoutDashboardIcon,
  profile: CircleUserRoundIcon,
};

// A header is a drop target (the only way into an empty section), never a
// draggable: sections are fixed markers the items sort around.
function SectionHeaderRow({ section }: { section: SidebarLayoutSectionId }) {
  const { setNodeRef, isOver } = useDroppable({ id: sidebarLayoutSectionDropId(section) });
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex list-none items-baseline gap-2 rounded-md px-1 pb-1 pt-3 first:pt-1",
        isOver && "bg-accent/60",
      )}
    >
      <span className="text-xs font-semibold text-foreground">
        {SIDEBAR_LAYOUT_SECTION_LABELS[section]}
      </span>
      <span className="text-[11px] text-muted-foreground/70">
        {SIDEBAR_LAYOUT_SECTION_HINTS[section]}
      </span>
    </li>
  );
}

function SortableItemRow({ id }: { id: SidebarLayoutItemId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const Icon = SIDEBAR_LAYOUT_ITEM_ICONS[id];
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex cursor-grab list-none select-none items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm text-foreground",
        isDragging && "relative z-10 cursor-grabbing border-border shadow-md",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{SIDEBAR_LAYOUT_ITEM_LABELS[id]}</span>
    </li>
  );
}

/**
 * Drag-to-arrange editor for the sidebar layout (Settings → General). One
 * flat sortable list whose three section headers are fixed markers: dropping
 * on an item takes its place, dropping on a header files the item at the
 * head of that section.
 */
export function SidebarLayoutEditor() {
  const layout = useSidebarLayout();
  const updateClientSettings = useUpdateClientSettings();
  // Keyboard too, not just pointer: rows are focusable, so space picks one
  // up and the arrow keys walk it through the flat list (headers included,
  // which is how an empty section stays reachable without a pointer).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.over === null) return;
      const next = moveSidebarLayoutItem({
        layout,
        itemId: event.active.id as SidebarLayoutItemId,
        overId: String(event.over.id),
      });
      if (next !== null) {
        updateClientSettings({ sidebarLayout: next });
      }
    },
    [layout, updateClientSettings],
  );
  const sortableIds = [...layout.top, ...layout.list, ...layout.bottom];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <ul aria-label="Sidebar layout" className="flex max-w-md flex-col gap-1 pb-2">
          {SIDEBAR_LAYOUT_SECTION_IDS.map((section) => (
            <Fragment key={section}>
              <SectionHeaderRow section={section} />
              {layout[section].map((id) => (
                <SortableItemRow key={id} id={id} />
              ))}
            </Fragment>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
