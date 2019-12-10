export * from './types';
export * from './commanderArgv';

import joi from '@hapi/joi';
import {defaultsDeep} from 'lodash';

import {IConfig} from '@/lib/config/types';

import getDefaultConfig from './default';
import schema from './schema';

const mergeWithDefaults = (rawConfig: IConfig): IConfig => {
    const merged: IConfig = defaultsDeep({}, rawConfig, getDefaultConfig());

    if (typeof rawConfig.metrics !== 'undefined') {
        merged.metrics = rawConfig.metrics;
    }

    if (typeof rawConfig.metricAggregations !== 'undefined') {
        merged.metricAggregations = rawConfig.metricAggregations;
    }

    return merged;
};

const validateConfig = (rawConfig: any): Promise<IConfig> => {
    const options: joi.ValidationOptions = {
        abortEarly: false,
        convert: true,
    };

    return schema.validateAsync(rawConfig, options);
};

export {
    getDefaultConfig,
    schema,
    mergeWithDefaults,
    validateConfig,
};
