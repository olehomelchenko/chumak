Example of a histogram:

```
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "url": "https://vega.github.io/vega-datasets/data/movies.json"
  },
  "width": "container",
  "height": 60,
  "encoding": {
    "x": {
      "field": "IMDB Rating",
      "type": "quantitative",
      "bin": {
        "maxbins": 100
      },
      "axis": null
    },
    "y": {
      "aggregate": "count",
      "type": "quantitative",
      "axis": null
    }
  },
  "layer": [
    {
      "params": [
        {
          "name": "brush",
          "select": {
            "type": "interval",
            "encodings": [
              "x"
            ]
          }
        }
      ],
      "mark": {
        "type": "bar",
        "color": "#eeeeee"
      }
    },
    {
      "transform": [
        {
          "filter": {
            "param": "brush"
          }
        }
      ],
      "mark": {
        "type": "bar",
        "color": "goldenrod"
      }
    }
  ],
  "config": {
    "view": {
      "stroke": null
    }
  }
}

```
