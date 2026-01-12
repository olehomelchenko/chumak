---
description: Review the code that is not currently committed
---

Review the code that is currently not committed (either staded or unstaged).

Focus on the following aspects:

- number of lines of code should correspond to the complexity of the task
- code should be readable and maintainable
- code should not contain workarounds or suboptimal ways to solve the task
- determine whether there is some leftover code that is no longer used and can be deleted

You are not limited by only changed lines of code; if you need to read other parts of the codebase for better context - feel free to do so.

The number of lines of code can be quite large; do not try to read all diffs at once, but first assess the size of changes via git diff summary, and then proceed with reading changes by chunks if needed.

Upon analysis, respond with a brief analysis summary, but importantly - do not change or fix anything unless explicitly asked.
