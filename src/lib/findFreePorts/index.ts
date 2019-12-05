import findFreePort from '@/lib/findFreePorts/findFreePort';
import {getLogger} from '@/lib/logger';

const FIND_PORT_BEGIN_PORT_DEFAULT = 10000;
const FIND_PORT_END_PORT_DEFAULT = 12000;
const FIND_PORT_STEP = 2;

const config = {
    beginPort: FIND_PORT_BEGIN_PORT_DEFAULT,
    endPort: FIND_PORT_END_PORT_DEFAULT,
    host: '127.0.0.1',
    count: 2,
};

const logger = getLogger();

export async function findTwoFreePorts(): Promise<number[]> {
    logger.debug(`search free ports`, config);

    config.beginPort += FIND_PORT_STEP;

    logger.debug(
        `moving config.findFreePort.beginPort + ${FIND_PORT_STEP}`,
        config.beginPort,
    );

    if (config.beginPort > config.endPort) {
        logger.debug('reset config.findFreePort.beginPort to default', FIND_PORT_BEGIN_PORT_DEFAULT);
        config.beginPort = FIND_PORT_BEGIN_PORT_DEFAULT;
    }

    const beginPort = config.beginPort;
    const endPort = config.endPort;

    const ports = await findFreePort(
        beginPort,
        endPort,
        config.host,
        config.count,
    );

    logger.debug(`found free ports: ${ports}`);

    return ports;
}
