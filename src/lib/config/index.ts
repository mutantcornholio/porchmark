export * from './types';
export * from './commanderArgv';

import joi from '@hapi/joi';
import fs from 'fs-extra';
import {defaultsDeep} from 'lodash';

import {IConfig} from '@/lib/config/types';
import {Logger} from '@/lib/logger';

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

const getConfigFilepath = (workdir: string): string => `${workdir}/porchmark.config.json`;

const saveConfig = async (logger: Logger, config: IConfig): Promise<void> => {
    const data = JSON.stringify(config, undefined, 2);

    let configFilepath = getConfigFilepath(config.workDir);

    const configExists = await fs.pathExists(configFilepath);

    if (configExists) {
        const newConfigFilepath = `${configFilepath}-${Date.now()}`;
        logger.warn(`config ${configFilepath} already exists, save config to ${newConfigFilepath}`);
        configFilepath = newConfigFilepath;
    }

    await fs.writeFile(configFilepath, data);
};

export {
    getDefaultConfig,
    schema,
    mergeWithDefaults,
    validateConfig,
    getConfigFilepath,
    saveConfig,
};
