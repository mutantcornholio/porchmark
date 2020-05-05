
import createTemplate from "./template";

export default function createHtml(window: Window) {
    const template = createTemplate(window);
    const {document} = window;

    return template(function (string: string) {
        var template = document.createElement("template");
        template.innerHTML = string.trim();
        return document.importNode(template.content, true);
    }, function () {
        return document.createElement("span");
    })
};
