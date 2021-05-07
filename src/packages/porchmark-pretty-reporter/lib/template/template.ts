type Render<T extends Node> = (str: string) => T;
type Wrapper = () => Element;
type Other = Array<Node | string | number | null | boolean | undefined
| Array<Node | string | number | null | undefined | boolean>>;

export default function makeTemplate(window: Window) {
    // @ts-ignore
    const {document, Node, NodeFilter} = window;

    return function template<T extends Node>(render: Render<T>, wrapper: Wrapper) {
        return function(strings: TemplateStringsArray, ..._: Other): Element {
            let str = strings[0];
            const parts = [];
            let part;
            let root = null;
            let node; let nodes;
            let walker;
            let i;
            let n;
            let j;
            let m;
            let k = -1;

            // Concatenate the text using comments as placeholders.
            for (i = 1, n = arguments.length; i < n; ++i) {
                part = arguments[i];
                if (part instanceof Node) {
                    parts[++k] = part;
                    str += '<!--o:' + k + '-->';
                } else if (Array.isArray(part)) {
                    for (j = 0, m = part.length; j < m; ++j) {
                        node = part[j];
                        if (node instanceof Node) {
                            if (root === null) {
                                parts[++k] = root = document.createDocumentFragment();
                                str += '<!--o:' + k + '-->';
                            }
                            root.appendChild(node);
                        } else {
                            root = null;
                            str += node;
                        }
                    }
                    root = null;
                } else {
                    str += part;
                }
                str += strings[i];
            }

            // Render the text.
            root = render(str);

            // Walk the rendered content to replace comment placeholders.
            if (++k > 0) {
                nodes = new Array(k);
                walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null, false);
                while (walker.nextNode()) {
                    node = walker.currentNode;
                    if (/^o:/.test(node.nodeValue as string)) {
                        nodes[+(node.nodeValue as string).slice(2)] = node;
                    }
                }
                for (i = 0; i < k; ++i) {
                    node = nodes[i];
                    if (node) {
                        node.parentNode.replaceChild(parts[i], node);
                    }
                }
            }

            // Is the rendered content
            // … a parent of a single child? Detach and return the child.
            // … a document fragment? Replace the fragment with an element.
            // … some other node? Return it.
            return (
                root.childNodes.length === 1 ? root.removeChild(root.firstChild as Element)
                : root.nodeType === 11 ? ((node = wrapper()).appendChild(root), node)
                    : root
            ) as Element;
        };
    };
}
