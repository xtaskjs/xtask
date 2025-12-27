import { Component, ComponentOptions } from "./component";  

export const Service = (options: Omit<ComponentOptions, "type"> = {}) =>
    Component({ ...options, type: "service" });

export const Controller = (options: Omit<ComponentOptions, "type"> = {}) =>
    Component({ ...options, type: "controller" });

export const Repository = (options: Omit<ComponentOptions, "type"> = {}) =>
    Component({ ...options, type: "repository" });
