## Backlog for the project

This document contains a list of features and tasks that need to be completed to enhance the project functionality and improve user experience.

### Potentially major changes

- the steps names seems to be stored outside of the json list of steps, I'd expect the JSON should be self-contained and the names should be stored within the JSON.

### Enhancements

Toolbar:

- some of the buttons should vary in size depending on how crucial are they. e.g. "Derive" button can be kept the same size, but the "regexp extract" and "regexp match" could be smaller and put on top on one another, with small icon on the left and name on the right.
- the "Text" icon in "Transform Values" should also be split into several smaller icons with clear functions (upper / lower / trim / etc.)

Derive modal:

- the quick documentation seems off in both how it looks and content
- the formula window could be improved by auto-suggesting the functions, column names etc. (this needs additional brainstorming to implement)

### Bugs

- the pivot transformation failed when I tried to aggregate sum of the column "count" (maybe a problem with name of the column, if I rename it to cnt and try same calculation, it works. Also, in any case the preview seems to also work regardless of column name)

```
chumak-app.ts:4442 Error applying step 6: Error: Invalid column reference: "d["count"]"
    at error_default (arquero.js?v=0126fff4:1690:9)
    at Object.error (arquero.js?v=0126fff4:9025:7)
    at checkColumn (arquero.js?v=0126fff4:8932:9)
    at spliceMember (arquero.js?v=0126fff4:8833:3)
    at MemberExpression (arquero.js?v=0126fff4:8808:14)
    at walk (arquero.js?v=0126fff4:2713:17)
    at arquero.js?v=0126fff4:8892:7
    at Array.forEach (<anonymous>)
    at parseOperator (arquero.js?v=0126fff4:8890:8)
    at CallExpression (arquero.js?v=0126fff4:8787:28)
```
