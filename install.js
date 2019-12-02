'use strict';

const os = require('os');
const https = require('https');
const {execSync} = require('child_process');
const fs = require('fs-extra');
const tracer = require('tracer');
const logger = tracer.console({format: "{{timestamp}} <{{title}}> {{message}}"});

const baseUrl = 'https://github.com/alekzonder/catapult/releases/download';
const release = 'wpr-build%2F2019.12.02-1';
const file = `wpr-${os.platform()}.tgz`;

const downloadUrl = `${baseUrl}/${release}/${file}`;

logger.info(`download wpr binaries: ${downloadUrl}`);

const targetDir = `${__dirname}/wpr`;
const archiveFilepath = `${__dirname}/wpr.tgz`;
const archiveStream = fs.createWriteStream(archiveFilepath);

if (fs.existsSync(targetDir)) {
    logger.info(`remove ${targetDir}`);
    fs.removeSync(targetDir);
}

https.get(downloadUrl, (firstRes) => {
    // github redirect to amazonaws
    if (firstRes.statusCode === 302) {
        logger.info(`got redirect to: ${firstRes.headers.location}`);

        https.get(firstRes.headers.location, (redirectedRes) => {
            logger.info(`download ${redirectedRes.headers['content-length']} bytes`);
            redirectedRes.pipe(archiveStream);
        });

    } else {
        throw new Error(`cant download WPR binaries, download and unpack manually: ${downloadUrl}`);
    }
});

archiveStream.on('finish', () => {
    logger.info(`downloaded, untar to ${targetDir}`);
    const cmd = `tar xzf ${archiveFilepath}`;
    execSync(cmd);

    logger.info(`cleanup, remove ${archiveFilepath}`);
    fs.removeSync(archiveFilepath);

    logger.info('done');
});
