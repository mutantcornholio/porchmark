import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

export function createSvg() {
    const doc = Doc.getDocument();
    const domSvg = doc.createElementNS("http://www.w3.org/2000/svg", "svg")
    const svg = d3.select(domSvg);

    Doc.clear();

    return svg;
}

export class Doc {
    private static dom: JSDOM;

    private static checkDom() {
        if (!Doc.dom) {
            Doc.dom = new JSDOM()
        }    
    }

    static getWindow() {
        Doc.checkDom();

        return Doc.dom.window;
    }

    static getDocument() {
        return Doc.getWindow().document;
    }

    static getBody() {
        return Doc.getDocument().body;
    }

    static clear() {
        Doc.dom.window.document.write();
    }
}
