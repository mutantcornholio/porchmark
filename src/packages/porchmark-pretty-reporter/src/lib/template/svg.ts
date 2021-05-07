
import createTemplate from "./template";

export default function createSvg(window: Window) {
    const template = createTemplate(window);
    const {document} = window;

    return template(function (string: string) {
        var root = document.createElementNS("http://www.w3.org/2000/svg", "g");
        root.innerHTML = string.trim();
        return root;
    }, function () {
        return document.createElementNS("http://www.w3.org/2000/svg", "g");
    });
}