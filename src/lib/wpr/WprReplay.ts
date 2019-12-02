import {IWprConfig, IWprProcess} from './types';
import WprAbstract from './WprAbstract';

export default class WprReplay extends WprAbstract implements IWprProcess {
    protected _name: string = 'WprReplay';

    protected _buildCmd = (wprConfig: IWprConfig, inputWprFilepath: string) => {
        return {
            command: wprConfig.bin,
            args: [
                'replay',
                '--https_cert_file', wprConfig.certFile,
                '--https_key_file', wprConfig.keyFile,
                '--http_port', String(wprConfig.httpPort),
                '--https_port', String(wprConfig.httpsPort),
                '--inject_scripts', wprConfig.injectScripts,
                inputWprFilepath,
            ],
        };
    }
}
