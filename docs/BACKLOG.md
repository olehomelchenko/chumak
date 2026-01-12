## Backlog for the project

This document contains a list of features and tasks that need to be completed to enhance the project functionality and improve user experience.

### Potentially major changes

- the steps names seems to be stored outside of the json list of steps, I'd expect the JSON should be self-contained and the names should be stored within the JSON.

### Enhancements

Style:

- ~~the icon for the time data type is the same as for the date, should be `carbon:time` from iconify.~~ DONE
- ~~in the table headers, the column name is not aligned vertically on the center - it is located to the bottom of its parent (it's neighboring .type-indicator is bigger in size)~~ DONE
- ~~the modals .type-menu, .floating-toolbar, when opened on the column that is far on the right, are cut off by the right edge of the screen - they should be able to overflow the screen to the right.~~ DONE (type-menu now clamps to viewport)
- ~~each div in the.tree-view should have a horizontal line separating end of the models in one source from the start of the next source~~ DONE
- ~~the "keep rows" actually can both keep and remove rows, should update the name accordingly (the json has a name "sliceRows" which is a good candidate)~~ DONE (renamed to "Slice Rows")

Toolbar:

- some of the buttons should vary in size depending on how crucial are they. e.g. "Derive" button can be kept the same size, but the "regexp extract" and "regexp match" could be smaller and put on top on one another, with small icon on the left and name on the right.
- the "Text" icon in "Transform Values" should also be split into several smaller icons with clear functions (upper / lower / trim / etc.)

Filter modal:

- the preview table should not filter out the values, but show them but mark as "removed" with some styles. Ideally, in the preview window itself there should be a toggle to decide how the preview should behave

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

Fold data modal:

- the multi-select only works when i hold CMD button, should work just on click here. Also, should be two modes of the operation: "columns to fold" and "columns to keep as index" (and fold every other column).

Other:

- ~~The "Full Reference" button in modals is rather small and can be easily missed. It should be made more visible.~~ DONE

- in general, the preview should be calculated over the entire dataset unless it is too large, in which case it should be calculated over first 1000 rows. It would be optimal to be able to specify this number in settings.

- implement len(text_column) function to get the number of characters in a string. Should provide options to account for multi-byte characters and collation if it is easily accessible via arquero or typescript.

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
