# Organizing threads

Pin a thread from its context menu to keep it in the pinned section above your active work.
Pinned threads are shown independently of their project, including when you connect to more than
one environment.

Pinned threads still move to **Settled** when they become inactive. They also move when their pull
request merges if **Auto-settle merged threads** is enabled.

On web and desktop, drag a pinned thread to change its position. On mobile, open the thread's menu
and choose **Move up** or **Move down**. The order is stored by the server and appears on your
other connected devices.

If reordering is unavailable for one environment, update the T3 Code server running in that
environment. Older servers can still pin and unpin threads, but do not understand synced ordering;
their pinned threads keep the default newest-first order below the ones you have arranged.

## Arranging the sidebar

**Sidebar layout** in Settings under General controls where the sidebar's fixed entries live.
Drag entries between three areas: **Top** is fixed above the thread list, **Thread list** scrolls
with your threads, and **Bottom** is the row at the foot of the sidebar. Drop an entry on a
section's heading to file it into an empty section. The reset arrow next to the setting restores
the default arrangement.

The movable entries are **Pinned items**, **Settings**, **Pull Requests**, **Usage**, **GitHub**,
**Dashboard**, and **Profile**. Pinned items is the section your pinned threads render in: leave
it in the thread list to keep pinned cards above your active work, or move it to Top so they stay
visible while the list scrolls. Dashboard returns to the home screen, and Profile is your T3
Connect account button — it appears once you are signed in.

Mobile keeps its own layout. The original sidebar (Settings → Legacy features) follows the
Bottom row only.

## Starting a thread

On web and desktop, **New thread** sits directly under the project selector and follows it. With
a project selected, it starts a thread in that project straight away. With **All projects**
selected it behaves as it always has: it starts a thread in the project you are already in when
there is nothing to choose between, and otherwise asks which project to use.

Mobile and the original sidebar (Settings → Legacy features) keep their own layouts, and start
threads the way they always have.

## Environment artwork

Dev and Nightly environments can identify themselves with artwork at the top of the sidebar and in
the send button. Choose **Artwork**, **Version pill**, or **None** in Settings under environment
identification. Artwork is recolored to match each built-in theme. Custom themes use the **Version
pill** fallback because their colors are not controlled by T3 Code.

To generate a fresh title from the conversation, open a thread's context menu and choose
**Regenerate title**. While T3 Code is generating it, the action reads **Regenerating…** and cannot
be selected again. The option is hidden when the connected environment needs a server update.
