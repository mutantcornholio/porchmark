import {IWprConfig, IWprProcess} from './types';
import WprAbstract from './WprAbstract';

export default class WprRecord extends WprAbstract implements IWprProcess {
    protected _name: string = 'WprRecord';

    protected _buildCmd = (wprConfig: IWprConfig, outputWprFilepath: string) => {
        return {
            command: wprConfig.bin,
            args: [
                'record',
                '--https_cert_file', wprConfig.certFile,
                '--https_key_file', wprConfig.keyFile,
                '--http_port', String(wprConfig.httpPort),
                '--https_port', String(wprConfig.httpsPort),
                '--inject_scripts', wprConfig.injectScripts,
                outputWprFilepath,
            ],
        };
    }
}
