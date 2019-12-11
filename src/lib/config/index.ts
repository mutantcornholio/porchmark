export * from './types';
export * from './commanderArgv';

import joi from '@hapi/joi';
import {defaultsDeep} from 'lodash';

import {IConfig, IPartialConfig} from '@/lib/config/types';

import getDefaultConfig from './default';
import schema from './schema';

const mergeWithDefaults = (rawConfig: IPartialConfig): IConfig => {
    return defaultsDeep({}, rawConfig, getDefaultConfig());
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
