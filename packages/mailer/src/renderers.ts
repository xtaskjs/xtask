import ejs from "ejs";
import Handlebars from "handlebars";
import { readFile } from "fs/promises";
import { join, isAbsolute } from "path";
import { registerMailerTemplateRenderer } from "./configuration";
import {
  MailerEjsRendererOptions,
  MailerHandlebarsRendererOptions,
  MailerTemplateRenderer,
} from "./types";

const DEFAULT_EJS_RENDERER_NAME = "ejs-file";
const DEFAULT_EJS_EXTENSION = ".ejs";
const DEFAULT_HANDLEBARS_RENDERER_NAME = "handlebars-file";
const DEFAULT_HANDLEBARS_EXTENSION = ".hbs";

const resolveTemplateFile = (viewsDir: string, template: string, extension: string): string => {
  const templatePath = template.endsWith(extension) ? template : `${template}${extension}`;
  return isAbsolute(templatePath) ? templatePath : join(viewsDir, templatePath);
};

export const registerEjsTemplateRenderer = (
  options: MailerEjsRendererOptions
): MailerTemplateRenderer => {
  const rendererName = options.name || DEFAULT_EJS_RENDERER_NAME;
  const extension = options.extension || DEFAULT_EJS_EXTENSION;

  return registerMailerTemplateRenderer(rendererName, async ({ template, locals }) => {
    const filePath = resolveTemplateFile(options.viewsDir, template, extension);
    return ejs.renderFile(filePath, locals, options.renderOptions);
  });
};

export const registerHandlebarsTemplateRenderer = (
  options: MailerHandlebarsRendererOptions
): MailerTemplateRenderer => {
  const rendererName = options.name || DEFAULT_HANDLEBARS_RENDERER_NAME;
  const extension = options.extension || DEFAULT_HANDLEBARS_EXTENSION;
  const engine = Handlebars.create();

  Object.entries(options.helpers || {}).forEach(([name, helper]) => {
    engine.registerHelper(name, helper);
  });

  Object.entries(options.partials || {}).forEach(([name, partial]) => {
    engine.registerPartial(name, partial);
  });

  return registerMailerTemplateRenderer(rendererName, async ({ template, locals }) => {
    const filePath = resolveTemplateFile(options.viewsDir, template, extension);
    const source = await readFile(filePath, "utf-8");
    return engine.compile(source)(locals);
  });
};