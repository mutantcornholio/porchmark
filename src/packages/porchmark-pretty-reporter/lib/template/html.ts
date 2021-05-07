
import createTemplate from './template';

export default function createHtml(window: Window) {
    const template = createTemplate(window);
    const {document} = window;

    return template(function(str: string) {
        const tmp = document.createElement('template');
        tmp.innerHTML = str.trim();
        return document.importNode(tmp.content, true);
    }, function() {
        return document.createElement('span');
    });
}
