import joi = require('@hapi/joi');

// Network throttling presets
const NETWORK_PRESETS = ['GPRS', 'Regular2G', 'Good2G', 'Regular3G', 'Good3G', 'Regular4G', 'DSL', 'WiFi'];

// select wpr pairs methods
// select wpr pairs after recordWpr stage
const SELECT_WPR_METHODS = [
    'WprSizeCloser',           // select more closer WPRs by size diff in absolute value
    'WprSizeQuantiles25to75',  // select wpr pairs from 25 quantile to 75 quantile by wpr sizes
    'HtmlSizeCloser',          // select WPR pairs with most closer html size from backend in absolute value
    'HtmlScriptSizeCloser',    // select WPR pairs with most closer script size in backend html in absolute value
];

const AGGREGATIONS = [
    'count',  // count metric values
    'q50',    // percentiles
    'q80',
    'q95',
    'stdev',  // metric standard deviation
];

const schema = joi.object().required().keys({
    workDir: joi.string().required(), // ---------------------------------- workDir for WPRs, logs, screenshots, reports
    options: joi.object().required().keys({ // ----------------------------
        headless: joi.boolean().default(true), // ------------------------- start headless chromium
        warmIterations: joi.number().integer().min(0).default(1), // ------ how many warm iterations before compare
        iterations: joi.number().integer().min(1).default(11), // --------- how many iterations on compare
        mobile: joi.boolean().default(false), // -------------------------- mobile useragent and viewport size
        useWpr: joi.boolean().default(true), // --------------------------- use WPR or realtime compare
        recordWprCount: joi.number().integer().min(1).default(10), // -------- how many WPR archives collect
        selectWprCount: joi.number().integer().min(1).default(1), // ---------- how many WPR pairs select from recorded
                                                              //            using options.selectWprMethod
        selectWprMethod: joi.string().valid(...SELECT_WPR_METHODS) // ----- how select WPR pairs, see SELECT_WPR_METHODS
            .default('HtmlSizeCloser'),                            //       for details
        cacheEnabled: joi.boolean().default(true), // --------------------- browser cache enabled on comparison
        cpuThrottling: joi.object().keys({ // ----------------------------- CPU throttling options
            rate: joi.number().integer().min(0), // ----------------------- CPU throttling rate
        }),
        networkThrottling: joi.string().valid(...NETWORK_PRESETS), // ----- Network throttling, see NETWORK_PRESETS

        singleProcess: joi.boolean().default(false), // ------------------- compare with single browser
        imagesEnabled: joi.boolean().default(true), // -------------------- images enabled
        javascriptEnabled: joi.boolean().default(true), // ---------------- javascript enabled
        cssFilesEnabled: joi.boolean().default(true), // ------------------ css files enabled,
                                                      //                    ! slow down comparison speed
                                                      //                    because use puppeteer request interception
    }),
    comparisons: joi.array().required().items().items( // ----------------- named comparisons with site urls
        joi.object().required().keys({                 //                   see config.example.js
            name: joi.string().required(),
            sites: joi.array().required().min(2).max(2)
                .items(joi.object().required().keys({
                    name: joi.string().required(),
                    url: joi.string().required(),
                })),
        })
    ),
    stages: joi.object().required().keys({ // ---------------------------- enable/disable compare stages
        recordWpr: joi.boolean().default(true), //
        compareMetrics: joi.boolean().default(true), // ------------------ compare performance metrics
        compareLighthouse: joi.boolean().default(false), // -------------- compare lighthouse scores and metrics
    }),
    metrics: joi.array().min(1).items( // -------------------------------- page performance and custom metrics
                                       //  see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming,
                                       //  https://developer.mozilla.org/en-US/docs/Web/API/PerformancePaintTiming
                                       //  and hooks onCollectMetrics
        joi.object().keys({
            name: joi.string().required(), // metric name, domContentLoadedEventEnd for example
            title: joi.string(),           // metric title for table view, DCL for example
        })
    ),
    metricAggregations: joi.array().min(1).items(  // metric aggregations, applied for every metric
                                                   // you can include or exclude metrics from aggregation
        joi.object().keys({
            name: joi.string().required()          // see AGGREGATIONS
                .valid(...AGGREGATIONS),

            includeMetrics: joi.array().items(joi.string()),
            excludeMetrics: joi.array().items(joi.string())
        })
    ),
    hooks: joi.object().keys({                      // hooks

        onVerifyWpr: joi.func(),                    // onVerifyWpr: (logger, page: Puppeteer.Page) => Promise<void>
                                                    // called after WPR was collected
                                                    // here you can check page loaded correctly or not,
                                                    // throw error if page incorrect -- WPR record will be retried once
                                                    // see config.example.js

        onCollectMetrics: joi.func(),            // onCollectMetrics: (logger, page: Puppeteer.Page) => Promise<object>
                                                 // called after page loaded in comparison
                                                 // return object with custom metrics
                                                 // see config.example.js

        onPageStructureSizesNode: joi.func(),    // onPageStructureSizesNode: (sizes, node) => void
                                                 // called after WPR recorded and backend html parsed
                                                 // called on every parsed node
                                                 // TODO need more docs

        onPageStructureSizesComplete: joi.func(), // onPageStructureSizesComplete: (sizes, html, getSizeInBytes) => void
                                                  // called after all nodes iterated
                                                  // TODO need more docs
    }),
});

export default schema;
