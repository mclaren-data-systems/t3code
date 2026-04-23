# TODO

## John's TODO (Only work on these)

- Change: Threads that are complete have a "completed" tag on them in the sidebar with a green dot, when they are opened that goes away. Make it so the green dot stays but the "completed" tag still goes away. Make it so the thread is considered read only after it's been visible to the user for 3 seconds.
- When a thread is complete and changes were made it shows a message with what files changed. This message includes files that changed outside of this thread. Detect which files were changed related to this thread and make it so it only shows those. Provide a commit button within the "Changed files" box that will display the commit modal but only have our changed files for this thread selected/checked (display the checkboxes automatically in this scenario) (the regular commit button still selects all files).
- Make the commit modal movable and resizable.
- Feature: After starting a new thread, if you don't finish your message and click away, the message is saved but the thread is not created. I want the new thread to be created if the message has text when the user clicks away. It should be given an appropriate status like draft in the thread list.
- Fix: Terminal does not capture ctrl+c or possibly other key commands when in focus, make it so it does.
- Maintain a history of messages in each thread if it isn't already. When a users cursor is in the message input box and they use the up arrow key it should populate the input with the last message they sent in that thread, pressing it multiple times goes further back in their message history. If they use the down arrow key it should go forward in the message history. This is similar to how terminal input works. If the input box has multiple lines of text, this should only happen when the cursor is on the first line and the up arrow is pressed or the last line and the down arrow is pressed, otherwise it should just move the cursor up and down as normal.

## John's TODID

- Fix: Building on windows failed because of spaces in file paths
- Fix: Copilot CLI provider not working or fully implemented
- Fix: Gemini CLI provider not looking in the right path on Windows and not fully implemented
- Feature: Make it so time stamps in chat messages show the full date when hovering over them
- Change: Always show the new thread button on sidebar projects, not just on hover

## Small things

- [ ] Submitting new messages should scroll to bottom
- [ ] Only show last 10 threads for a given project
- [ ] Thread archiving
- [ ] New projects should go on top
- [ ] Projects should be sorted by latest thread update

## Bigger things

- [ ] Queueing messages
