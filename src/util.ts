
import Config from './config';
import * as vscode from 'vscode';

const opn = require('opn');

/**
 * get standardized browser name
 * @param name String
 */
export const standardizedBrowserName = (name: string = ''): string => {
    let _name = name.toLowerCase();
    const browser = Config.browsers.find(function (item: any) {
        return item.acceptName.indexOf(_name) !== -1;
    });

    return browser ? browser.standardName : '';
};

/**
 * get default browser name
 */
export const defaultBrowser = (): string => {
    const config = vscode.workspace.getConfiguration(Config.app);
    return config ? config.default : '';
};

export const open = (path: string, browser: string = '') => {
    // const name = browser ? browser : standardizedBrowserName(defaultBrowser());
    // const name = standardizedBrowserName(browser);
    opn(path, { app: browser })
        .catch(function (_: any) {
            vscode.window.showErrorMessage(`Open browser failed!! Please check if you have installed the browser ${browser} correctly!`);
        });
};