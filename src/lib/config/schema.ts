import joi = require('@hapi/joi');

// Network throttling presets
const NETWORK_PRESETS = ['GPRS', 'Regular2G', 'Good2G', 'Regular3G', 'Good3G', 'Regular4G', 'DSL', 'WiFi'];

// select wpr pairs methods
// select wpr pairs after recordWpr stage
const SELECT_WPR_METHODS = [
    'simple',                        // select pairs as recorded by wprArchiveId
    'closestByWprSize',              // select more closer WPRs by size diff in absolute value
    'closestByHtmlSize',             // select WPR pairs with most closer html size from backend in absolute value
    'closestByScriptSize',           // select WPR pairs with most closer script size in backend html in absolute value
];

const AGGREGATIONS = [
    'count',  // count metric values
    'q50',    // percentiles
    'q80',
    'q95',
    'stdev',  // metric standard deviation
];

const schema = joi.object().required().keys({
    logLevel: joi.string().default('info')
        .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal'),
    workDir: joi.string().required(), // ---------------------------------- workDir for WPRs, logs, screenshots, reports
    mode: joi.string().required().valid('puppeteer', 'webdriver'),
    iterations: joi.number().integer().min(1), // --------- how many iterations on compare
    workers: joi.number().integer().min(1),
    pageTimeout: joi.number().integer().min(0),
    withoutUi: joi.boolean().default(false),
    puppeteerOptions: joi.object().required().keys({ // ----------------------------
        headless: joi.boolean().default(true), // ------------------------- start headless chromium
        ignoreHTTPSErrors: joi.boolean().default(false),
        useWpr: joi.boolean().default(true), // --------------------------- use WPR or realtime compare
        recordWprCount: joi.number().integer().min(1).default(10), // -------- how many WPR archives collect
        selectWprCount: joi.number().integer().min(1).default(1), // ---------- how many WPR pairs select from recorded
                                                              //            using options.selectWprMethod
        selectWprMethod: joi.string().valid(...SELECT_WPR_METHODS) // ----- how select WPR pairs, see SELECT_WPR_METHODS
            .default('HtmlSizeCloser'),                            //       for details
        cacheEnabled: joi.boolean().default(true), // --------------------- browser cache enabled on comparison
        cpuThrottling: joi.object().allow(null).keys({ // ----------------------------- CPU throttling options
            rate: joi.number().integer().min(0), // ----------------------- CPU throttling rate
        }),

        // Network throttling, see NETWORK_PRESETS
        networkThrottling: joi.string().valid(...NETWORK_PRESETS).allow(null),

        singleProcess: joi.boolean().default(false), // ------------------- compare with single browser
        imagesEnabled: joi.boolean().default(true), // -------------------- images enabled
        javascriptEnabled: joi.boolean().default(true), // ---------------- javascript enabled
        cssFilesEnabled: joi.boolean().default(true), // ------------------ css files enabled,
                                                      //                    ! slow down comparison speed
                                                      //                    because use puppeteer request interception
        pageNavigationTimeout: joi.number().integer().min(0).default(60000),

        // puppeteer waitUntil option for page.open
        waitUntil: joi.string().required().valid('load', 'domcontentloaded', 'networkidle0', 'networkidle2'),
        retryCount: joi.number().integer().min(0).default(10),

        warmIterations: joi.number().integer().min(0).default(1),
    }),
    webdriverOptions: joi.object().keys({
        host: joi.string().required(),
        port: joi.number().integer().min(0).required(),
        user: joi.string().allow(''),
        key: joi.string().allow(''),
        desiredCapabilities: joi.object().keys({
            browserName: joi.string(),
            version: joi.string(),
        }),
    }),
    browserProfile: joi.object().keys({
        mobile: joi.boolean().default(false), // -------------------------- use default mobile userAgent and viewport
        userAgent: joi.string().allow(null),
        height: joi.number().integer().min(0).allow(null),
        width: joi.number().integer().min(0).allow(null),
    }),
    comparisons: joi.array().required().min(1).items( // ----------------- named comparisons with site urls
        joi.object().required().keys({                 //                   see config.example.js
            name: joi.string().required(),
            sites: joi.array().required().min(1)
                .items(joi.object().required().keys({
                    name: joi.string().required(),
                    url: joi.string().required(),
                })),
        }),
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
            showInTable: joi.boolean(),
        }),
    ),
    metricAggregations: joi.array().min(1).items(  // metric aggregations, applied for every metric
                                                   // you can include or exclude metrics from aggregation
        joi.object().keys({
            name: joi.string().required()          // see AGGREGATIONS
                .valid(...AGGREGATIONS),

            includeMetrics: joi.array().items(joi.string()),
            excludeMetrics: joi.array().items(joi.string()),
        }),
    ),
    hooks: joi.object().keys({                      // hooks

        onVerifyWpr: joi.func(),                    // onVerifyWpr: ({
                                                    //     logger: Logger,
                                                    //     page: Puppeteer.Page,
                                                    //     comparison: IComparison,
                                                    //     site: ISite
                                                    // }) => Promise<void>
                                                    // called after WPR was collected
                                                    // here you can check page loaded correctly or not,
                                                    // throw error if page incorrect -- WPR record will be retried once
                                                    // see config.example.js

        onCollectMetrics: joi.func(),            // onCollectMetrics: ({
                                                 //     logger: Logger,
                                                 //     page: Puppeteer.Page,
                                                 //     comparison: IComparison,
                                                 //     site: ISite
                                                 // ) => Promise<object>
                                                 // called after page loaded in comparison
                                                 // return object with custom metrics
                                                 // see config.example.js
    }),
});

export default schema;
