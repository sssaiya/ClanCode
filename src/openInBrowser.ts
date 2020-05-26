import { open, defaultBrowser, standardizedBrowserName } from './util';
/** 
 * open default browser
 * if you have specified browser in configuration file, 
 * the browser you specified will work.
 * else the system default browser will work.
 */
export const openDefault = (clanTag: any): void => {
  let uri;
  console.log("clanTag - "+clanTag);
  if (clanTag) {
    uri = "https://teamcode-dff02.web.app/?clanTag="+clanTag;
  } else {
    const _path = "https://us-central1-teamcode-dff02.cloudfunctions.net/";
    // uri = _path && _path.fsPath;
    uri = _path
  }
  const browser = standardizedBrowserName(defaultBrowser());
  open(uri, browser);
};