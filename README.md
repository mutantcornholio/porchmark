# porchmark
Simple tool to compare browser performance of several sites simultaneously.  
Based on puppeteer.  
It opens given pages at the same time, and grabs browser performance metrics. Until you'll get tired.  

![screencast.gif](https://s3.us-east-2.amazonaws.com/mcornholio-s3/porchmark-screencast-2.gif)

Installation:
```
npm install -g porchmark
```

Usage:
```

  Usage: porchmark <site 1> <site 2> ...

  Options:
    -V, --version         output the version number
    -i, --iterations <n>  stop after n iterations; defaults to 300
    -P, --parallel <n>    run checks in n workers; defaults to 1
    -m, --mobile          chrome mobile UA, iphone 6-like screen, touch events, etc.
    -k, --insecure        ignore HTTPS errors
    -h, --help            output usage information

```

e.g. `porchmark -P 5 https://stackoverflow.com https://github.com`
(-P 5 means to run five instances of chrome)

First website in arguments is treated as reference and every other is comared to it.
Thus, diff and p-value don't show on first site.
