import createTemplate from './template';

export default function createSvg(window: Window) {
    const template = createTemplate(window);
    const {document} = window;

    return template(function(str: string) {
        const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        root.innerHTML = str.trim();
        return root;
    }, function() {
        return document.createElementNS('http://www.w3.org/2000/svg', 'g');
    });
}
