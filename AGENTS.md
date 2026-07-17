<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent workflow

- At the end of each completed work item, automatically `git commit` and `git push` to the current branch.
- Use a concise commit message focused on why the change was made.
- Do not commit secrets, `.env*`, or junk folders like `agent-tools/`.
- Skip commit/push only when there is nothing to commit (already clean) or the user explicitly asks not to.
