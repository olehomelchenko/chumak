## Backlog for the project

This document contains a list of features and tasks that need to be completed to enhance the project functionality and improve user experience.

### Potentially major changes

- the steps names seems to be stored outside of the json list of steps, I'd expect the JSON should be self-contained and the names should be stored within the JSON.

### Enhancements

Style:

(no issues here currently)

Toolbar:

- some of the buttons should vary in size depending on how crucial are they. e.g. "Derive" button can be kept the same size, but the "regexp extract" and "regexp match" could be smaller and put on top on one another, with small icon on the left and name on the right.
- the "Text" icon in "Transform Values" should also be split into several smaller icons with clear functions (upper / lower / trim / etc.)

Derive modal:

- the quick documentation seems off in both how it looks and content
- the formula window could be improved by auto-suggesting the functions, column names etc. (this needs additional brainstorming to implement)

Rename modal:

- currently, shows separate inputs for each column. Should add alternative option to transform into a single input with list of the columns. Upon editing the column name in each mode, the preview should be not a table, but a list of the changes to be made.
- also, review the possibility of merging the Rename and Select columns - they have lots of overlapping functionality (keep the available functionality from the "Select" such as pattern matching)
- also, the "reorder" function can be merged into the same modal window - implement ability to reorder the columns via drag and drop, or react to the change in the list in the "single input" mode.

Aggregate data modal:

- the summarize/rollup list of options should be reordered: first dropdown would show the column selector, second - aggregation method, third - the column name.
- minor naming issue: the button is called "group by" but the model is "aggregate data" and the step name auto-generated is also "Aggregate: "
- similarly, the name of the step should be generated " Aggregaty: by X columns to make it shorter

Pivot data modal:

- the style is not consistent with the rest of the modals: three blocks (rows / columns / values) are aligned horizontally, would use space better if were aligned vertically one below another.

Other:

- in general, the preview should be calculated over the entire dataset unless it is too large, in which case it should be calculated over first 1000 rows. It would be optimal to be able to specify this number in settings.

### Bugs

- after removing a column, the table is updated but the column that replaces the removed one, is styled as if the values are null. This seems to be a recurring issue as several similar bugs were fixed previously that are related to rendering the table after removal of columns. Possibly some more profound refactoring is needed.
  (upd later: similar problem is right after applying the "group by" model - the table is not properly rendered; going back and forth over the steps in the left sidebar fixes the issue)

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
