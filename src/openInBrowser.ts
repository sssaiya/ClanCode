import { open, defaultBrowser, standardizedBrowserName } from './util';

/** 
 * open default browser
 * if you have specified browser in configuration file, 
 * the browser you specified will work.
 * else the system default browser will work.
 */
export const openDefault = (path: any): void => {
  let uri;
  if (path) {
    uri = path.fsPath;
  } else {
    const _path = "https://www.google.com";
    // uri = _path && _path.fsPath;
    uri = _path
  }
  const browser = standardizedBrowserName(defaultBrowser());
  open(uri, browser);
};