
import { log, LogLevel } from './auxiliaries';
import { validate } from './properties';



/** Namespace that comprises various utils (also cleans up documentation). */
namespace fetch {

    const failed = (url: string, request: XMLHttpRequest) =>
        `fetching '${url}' failed (${request.status}): ${request.statusText}`;

    export interface FetchTransform<T> { (data: any): T | undefined; }


    /**
     * Creates a promise for an asynchronous xml/http request on a given URL. If an URL is fetched successfully, the
     * promise is resolved with a transform to the typed object. An error code and message can be caught otherwise.
     * @param url - Uniform resource locator string referencing a file.
     * @param type - Request response type.
     * @param transform - Callback to a function that transforms the fetched data into an instance of targeted type.
     * @returns - A promise that resolves on a parsed object if successful.
     */
    export function fetchAsync<T>(url: string, type: XMLHttpRequestResponseType,
        transform: FetchTransform<T>): Promise<T> {

        const response = new Promise<T>((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = type;

            request.onload = () => {
                if (request.status < 200 || request.status >= 300) {
                    reject(failed(url, request));
                    return;
                }

                const data = request.response;
                const object = transform(data);
                if (object === undefined) {
                    reject(`fetching '${url}' failed (TransformError): transforming the object failed.`);
                    return;
                }
                resolve(object);
            };

            request.onerror = () => reject(failed(url, request));
            request.ontimeout = () => reject(failed(url, request));

            request.send();
        });
        return response;
    }


    /**
     * Creates a promise for an asynchronous xml/http request on a given URL. If an URL is fetched successfully, the
     * promise is resolved with a parsed JSON object. An error code and message can be caught otherwise.
     * @param url - Uniform resource locator string referencing a JSON file.
     * @param transform - Callback to a function that transforms the fetched data into an instance of targeted type.
     * @param schema - Optional schema, that if specified, is used to validate the fetched json data.
     * @returns - A promise that resolves on a parsed JSON object if successful.
     */
    export function fetchJsonAsync<T>(url: string, transform: FetchTransform<T>, schema?: any): Promise<T> {

        const response = new Promise<T>((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', url, true);

            request.onload = () => {
                if (request.status < 200 || request.status >= 300) {
                    reject(failed(url, request));
                    return;
                }

                const json = request.responseText;
                if (schema !== undefined && !validate(json, schema)) {
                    return;
                }

                let data: any;
                try {
                    data = JSON.parse(json);
                } catch (error) {
                    reject(`fetching '${url}' failed (${error.name}): ${error.message}`);
                    return;
                }

                const object = transform(data);
                if (object === undefined) {
                    reject(`fetching '${url}' failed (TransformError): transforming the object failed.`);
                    return;
                }
                resolve(object);
            };

            request.onerror = () => reject(failed(url, request));
            request.ontimeout = () => reject(failed(url, request));

            request.send();
        });
        return response;
    }


    /**
     * Allows to wait synchronously on one or multiple promises
     * @param promises - A single or an array of promises to wait for.
     */
    export function wait<T>(promises: PromiseLike<T> | Array<PromiseLike<T>>,
        reject?: { (reason: any): void }): void {
        // tslint:disable-next-line:space-before-function-paren
        (async () => {
            if (Array.isArray(promises)) {
                await Promise.all(promises).catch(reject);
            } else {
                await promises.then(undefined, reject);
            }
        })();
    }

}

export = fetch;
