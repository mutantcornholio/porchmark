import joi = require('@hapi/joi');

import {NETWORK_PRESETS} from "@/classes/Puppeteer";

const schema = joi.object().required().keys({
    workDir: joi.string().required(),
    options: joi.object().required().keys({
        headless: joi.boolean().default(true),
        warmIterations: joi.number().integer().min(0).default(1),
        iterations: joi.number().integer().min(1).default(11),
        mobile: joi.boolean().default(false),
        useWpr: joi.boolean().default(true),
        silent: joi.boolean().default(false),
        recordCount: joi.number().integer().min(1).default(10),
        cycleCount: joi.number().integer().min(1).default(1),
        cacheEnabled: joi.boolean().default(true),
        cpuThrottling: joi.object().keys({
            rate: joi.number().integer().min(0),
        }),
        networkThrottling: joi.string().valid(...Object.keys(NETWORK_PRESETS)),
        selectWprMethod: joi.string().valid(...['bestPairsQuantiles', 'bestPairsCloser']).default('bestPairsQuantiles'),
        singleProcess: joi.boolean().default(false),
    }),
    hosts: joi.array().required().items(joi.object().required().keys({
        name: joi.string().required(),
        host: joi.string().required().uri({scheme: ['http', 'https']})
    })),
    urls: joi.array().required().items(joi.object().required().keys({
        name: joi.string().required(),
        url: joi.string().required(),
    })),
    stages: joi.object().required().keys({
        recordWpr: joi.boolean().default(true),
        compareMetrics: joi.boolean().default(true)
    })
});

export default schema;
