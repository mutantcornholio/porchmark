import puppeteer from 'puppeteer';
// @ts-ignore TODO types
import rehypeParse = require('rehype-parse');
import traverse = require('traverse');
import unified = require('unified');

import {IPageStructureSizes} from '@/lib/puppeteer/types';

const getHTML = (page: puppeteer.Page): Promise<string> => {
    return page.evaluate(() => {
        return document.documentElement.outerHTML;
    });
};

const getNodeSizeInBytes = (html: string, node: any) => {
    return Buffer.byteLength(html.substring(node.position.start.offset, node.position.end.offset), 'utf8');
};

// TODO hooks
// const getSizeInBytes = (html: string, start: number, end: number) => {
//     return Buffer.byteLength(html.substring(start, end), 'utf8');
// };

const traverseHtml = (html: string) => {
    const tree = unified()
        .use(rehypeParse)
        .parse(html);

    let incrementId = 1;

    // TODO types
    const elements: {[index: string]: any} = {};

    traverse(tree).forEach(function(node) {
        if (node && typeof node.type !== 'undefined' && typeof node.position !== 'undefined') {
            const id = incrementId;
            incrementId++;

            let parentId = null;

            if (this.parent) {
                if (Array.isArray(this.parent.node) && this.parent.parent) {
                    parentId = this.parent.parent.node.id;
                } else {
                    parentId = this.parent.node.id;
                }
            }

            const updatedNode = {
                id,
                parentId,
                ...node,
            };

            this.update(updatedNode);

            elements[id] = updatedNode;
        }
    });

    return {tree, elements};
};

const calcPageStructureSizes = (html: string, elements: {[index: string]: any}) => {
    const sizes: IPageStructureSizes = {
        root: getNodeSizeInBytes(html, elements[1]),
        script: 0,
        style: 0,
        scripts: {},
    };

    Object.keys(elements).forEach((id) => {
        const node = elements[id];

        // TODO hooks
        // if (hooks && hooks.onPageStructureSizesNode) {
        //     hooks.onPageStructureSizesNode(sizes, node);
        // }

        if (node.tagName === 'script') {
            const size = getNodeSizeInBytes(html, node);
            sizes.script += size;

            const scriptType = node.properties && node.properties.type;

            if (!sizes.scripts[scriptType]) {
                sizes.scripts[scriptType] = 0;
            }

            sizes.scripts[scriptType] += size;
        }

        if (node.tagName === 'style') {
            const size = getNodeSizeInBytes(html, node);
            sizes.style += size;
        }
    });

    // TODO hooks
    // if (hooks && hooks.onPageStructureSizesComplete) {
    //     hooks.onPageStructureSizesComplete(sizes, html, getSizeInBytes);
    // }

    return sizes;
};

export const getPageStructureSizes = async (page: puppeteer.Page): Promise<IPageStructureSizes> => {
    const html = await getHTML(page);

    const {elements} = await traverseHtml(html);

    return calcPageStructureSizes(html, elements);
};
