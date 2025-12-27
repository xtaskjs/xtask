export interface ManagedInstance<T = any> {
    instance: T;
    preDestroy?: ()=> void;
}