// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// import * as vscode from "vscode";
import {
  ExtensionContext,
  commands,
  window,
  StatusBarAlignment,
  workspace,
  TextDocumentChangeEvent,
  SourceControlResourceState,
  SourceControlResourceGroup,
} from "vscode";
import * as vscode from "vscode";
import { myTreeDataProvider } from "./treeDataProvider";
import { firebaseConfig } from "./config";
import * as firebase from "firebase";
import { registerFunction } from "./register";
import { loginFunction } from "./login";
import { createClan, joinClan } from "./clanFunctions";
import { openDefault } from "./openInBrowser";

let openRepo: IRepository;

// import { SourceControlResourceGroup, SourceControlResourceState } from "vscode"

export interface IGitResourceGroup extends SourceControlResourceGroup {
  resourceStates: SourceControlResourceState[];
}

interface IRepository {
  diffWithHEAD(path: string): Promise<string>;
  workingTreeGroup: IGitResourceGroup;
  indexGroup: IGitResourceGroup;
  mergeGroup: IGitResourceGroup;
}
export class userData {
  uid: string;
  username: string | null;
  useremail: string | null;
  isInClan: boolean;
  clanTag: string | null;
  clanName: string | null;
  score: number;

  constructor(uid: string) {
    this.uid = uid;
    this.username = null;
    this.useremail = null;
    this.isInClan = false;
    this.clanTag = null;
    this.clanName = null;
    this.score = 0;
  }
}
export interface UserStatus {
  username: string;
  lastOnline: number;
  status: string;
  score: number;
  intensityScore: number;
}
let indexedArray: Map<string, UserStatus>;
let codeScore = 0;
let typedCount = 0;
let intensityScore = 0;
let sessionTime = 0;

export let user: userData;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  // languages.registerHoverProvider('*', {
  //   provideHover(document, position, token) {
  //     let markdownString = new vscode.MarkdownString('![IMGEE](https://thejournal.com/-/media/EDU/THEJournal/Images/2015/02/20150224test644.jpg)');
  //     return new Hover(markdownString);
  //   }
  // });
  //let markdownString = new vscode.MarkdownString('![IMGEE](https://thejournal.com/-/media/EDU/THEJournal/Images/2015/02/20150224test644.jpg)');
  //* in case you wanted to hover*

  indexedArray = new Map<string, UserStatus>();
  console.log('Congratulations, your extension "ClanCode" is now active!');

  firebase.initializeApp(firebaseConfig);

  const gitExtension = vscode.extensions.getExtension("vscode.git");

  let alignment = 10;
  let barItem1 = window.createStatusBarItem(StatusBarAlignment.Left, alignment);
  barItem1.color = "#00AA00";
  let barItem2 = window.createStatusBarItem(StatusBarAlignment.Left, alignment - 0.1);
  barItem2.color = "#00AA00";
  if(!gitExtension){
    setImmediate(activate,500); // try again in 5 ms
    return;
  }

  if (gitExtension) {
    const extension = await gitExtension.activate();
    const startTime = Math.round(new Date().getTime() / 1000); // MS Epoch to Seconds
    window.showInformationMessage("CodeBar Extension Activated");
    const gitModel = extension.model || extension._model;
    if (!gitModel.openRepositories[0]) return;
    openRepo = gitModel.openRepositories[0].repository;
    if (openRepo) {
      //initCodeBar(openRepo);
      setInterval(updateIntensityBar, 5000);
      setInterval(getCodeBar, 5000);
      workspace.onDidChangeTextDocument(handleChange);
      // TODO figure out why change handler gets called twice for each document change ?
      function handleChange(event: TextDocumentChangeEvent) {
        getIntensityBar(event);
      }
    } else {
      window.showInformationMessage("Download Git Extension first !");
    }
  }

  firebase.auth().onAuthStateChanged(async function (firebaseUser) {
    if (firebaseUser) {
      user = new userData(firebaseUser.uid);
      // Get userdata from firebase
      await firebase
        .database()
        .ref("/users/" + user.uid)
        .once("value")
        .then(function (snapshot) {
          user.isInClan = snapshot.val()._isInClan;
          user.username = snapshot.val()._username;
          user.useremail = snapshot.val()._useremail;
          user.clanTag = snapshot.val()._clanTag;
          user.clanName = snapshot.val()._clanName;
          // userData = snapshot.val();
        });

      user.score = 0;

      var displayString = "Hello - " + user.username;

      if (user.isInClan) {
        displayString = displayString + ", member of clan - " + user.clanTag;
      } else {
        displayString =
          displayString +
          ", Create or Join a clan via its Clan Tag to get started !";
      }
      window.showInformationMessage(displayString);

      getClan(); // Might have to call this from somewhere else as well.

      //Change sidebar menu name to clan name
      if (user.isInClan) {
        const treeDataProvider: myTreeDataProvider = new myTreeDataProvider(
          indexedArray
        );
        let treeView = window.createTreeView("clanCode", {
          treeDataProvider: treeDataProvider,
        });
        treeView.title = user.clanName || undefined;
        // treeView.message = user.clanTag || undefined;

        let refresh = commands.registerCommand("ClanCode.refresh", () =>
          treeDataProvider.refresh()
        );
      }
      // * START PERSISTENCE WITH FIRESTORE *//
      // Create a reference to this user's specific status node.
      // This is where we will store data about being online/offline.
      var userStatusDatabaseRef = firebase
        .database()
        .ref("/status/" + user.uid);
      // firebase.database().
      var isOfflineForDatabase = {
        state: "offline",
        last_changed: firebase.database.ServerValue.TIMESTAMP,
        user_name: user.username,
        score: codeScore,
        intensity: intensityScore
      };
      var isOnlineForDatabase = {
        state: "online",
        last_changed: firebase.database.ServerValue.TIMESTAMP,
        user_name: user.username,
        score: codeScore,
        intensity: intensityScore
      };
      firebase
        .database()
        .ref(".info/connected")
        .on("value", function (snapshot) {
          // If we're not currently connected, don't do anything.
          if (snapshot.val() == false) {
            return;
          }

          userStatusDatabaseRef
            .onDisconnect()
            .set(isOfflineForDatabase)
            .then(function () {
              userStatusDatabaseRef.set(isOnlineForDatabase);
            })
            .catch(function (error) {
              console.log(error);
            });
        });
    } else {
      console.log("Not Signed in yet");
      // No user is signed in.
    }
  });

  function getClan() {
    if (user != undefined && user.isInClan) {
      console.log("HERE, getting clan");
      firebase
        .database()
        .ref("/clans/" + user.clanTag + "/members")
        .once("value")
        .then(function (snapshot) {
          snapshot.forEach(function (childSnapshot) {
            const memberUID: string = childSnapshot.val();
            getStatus(memberUID);
          });
        })
        .catch(function (error) {
          //TODO error handling
        });
    }
  }

  function getStatus(uid: string) {
    console.log(uid);
    firebase
      .database()
      .ref("/status/" + uid) // on value makes this function listen and fire for every change on this route
      .on("value", function (snapshot) {
        const username = snapshot.val().user_name;
        const userStatus: UserStatus = {
          username: snapshot.val().user_name,
          lastOnline: snapshot.val().last_changed,
          status: snapshot.val().state,
          score: snapshot.val().score,
          intensityScore: snapshot.val().intensity
        };
        indexedArray.set(username, userStatus);

        user.score = snapshot.val().score;
        // Refresh Tree view
        commands.executeCommand("ClanCode.refresh");
      });
  }


  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = commands.registerCommand("ClanCode.onClick", function () {
    if (user == undefined)
      window.showInformationMessage("Sign in using command Clancode: Sign in");
    else {
      //Load Team on click here
      if (user.isInClan) {
        //buildTeamMenu();
      } else {
        window.showInformationMessage("Create or Join a Clan first !");
        commands.executeCommand("ClanCode.CodeGame");
      }
    }
  });

  let goOnline = commands.registerCommand("ClanCode.Online", function () {
    var userStatusDatabaseRef = firebase.database().ref("/status/" + user.uid);
    // firebase.database().
    var isActiveForDatabase = {
      state: "online",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
      user_name: user.username,
      score: codeScore,
      intensity: intensityScore
    };
    if (user != undefined) {
      firebase
        .database()
        .ref(".info/connected")
        .on("value", function (snapshot) {
          // If we're not currently connected, don't do anything.
          if (snapshot.val() == false) {
            return;
          }

          userStatusDatabaseRef.set(isActiveForDatabase);
        });
    }
  });
  let goOffline = commands.registerCommand("ClanCode.Offline", function () {
    window.showInformationMessage("OFFLINE");
    // onlineIcon.hide();
    // offlineIcon.show();
    var userStatusDatabaseRef = firebase.database().ref("/status/" + user.uid);
    // firebase.database().
    var isAwayForDatabase = {
      state: "away",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
      user_name: user.username,
      score: codeScore,
      intensity: intensityScore
    };
    if (user != undefined) {
      console.log("Going Away");
      firebase
        .database()
        .ref(".info/connected")
        .on("value", function (snapshot) {
          // If we're not currently connected, don't do anything.
          if (snapshot.val() == false) {
            return;
          }

          userStatusDatabaseRef.set(isAwayForDatabase);
        });
    }
  });

  let register = commands.registerCommand(
    "ClanCode.Register",
    registerFunction
  );

  let logIn = commands.registerCommand("ClanCode.LogIn", loginFunction);

  let createClanMenu = commands.registerCommand(
    "ClanCode.createClan",
    createClan
  );

  let joinClanMenu = commands.registerCommand("ClanCode.joinClan", joinClan);

  // let clanPageFunction = function () { window.showInformationMessage("HERE !!")};
  let clanPage = vscode.commands.registerCommand('ClanCode.clanPage', (path) => {
    openDefault(path); // finds Default browser and everything !! :D
});

  // Make one command opening this menu to execute the other commands :)
  let CodeGameMenu = commands.registerCommand(
    "ClanCode.CodeGame",
    async function showQuickPick() {
      var options = [];
      if (user == undefined) {
        options.push("Register");
        options.push("Sign in");
      } else {
        // Is Signed in/ Authenticated
        if (!user.isInClan) {
          options.push("Create Clan");
          options.push("Join Clan");
        }
      }

      const result = await window.showQuickPick(options, {
        placeHolder: "Welcome To ClanCode",
        onDidSelectItem: (item) => {
          if (item == "Create Clan" || item == "Join Clan") {
            if (user == undefined) {
              window.showInformationMessage(
                `Please Sign in before trying to ${item}`
              );
            }
          }
          if (item == "Sign in" || item == "Register") {
            if (user != undefined) {
              window.showInformationMessage("Signed in as " + user.username);
            }
          }
        },
      });
      // window.showInformationMessage(`Got: ${result}`);
      if (result == "Create Clan") {
        commands.executeCommand("ClanCode.createClan");
      }
      if (result == "Join Clan") {
        commands.executeCommand("ClanCode.joinClan");
      }
      if (result == "Sign in") {
        commands.executeCommand("ClanCode.LogIn");
      }
      if (result == "Register") {
        commands.executeCommand("ClanCode.Register");
      }
    }
  );

  // Generates Clan tags qunique and not Case Sensitive
  // async function initCodeBar(repo: IRepository) {
  //   console.log("Init code bar");
  //   codeScore = await getCodeScore(repo);
  //   barItem1.text = getCodeBarString(codeScore);
  //   barItem1.color = getColorFromScore(codeScore);
  //   barItem1.show();
  // }

  //GIven a repository gets diff line count
  async function getCodeBar() {
    // let codeScore: number = 0;
    console.log("In Get code bar");
    codeScore = await getCodeScore(openRepo);

    barItem1.text = getCodeBarString(codeScore);
    barItem1.color = getColorFromScore(codeScore);
    barItem1.show(); // update codebar

    commands.executeCommand("ClanCode.Online")
    //Only change UI if needed (Increments of 10), or if its fire time

  }

  async function getIntensityBar(
    event: TextDocumentChangeEvent
  ) {
    updateTypeCount(event);
  }

  function updateIntensityBar() {

    sessionTime = sessionTime + 5;
    // console.log("HERE in " + sessionTime + "s SCORE - " + typedCount);
    const mins = sessionTime / 60;
    const wc = Math.floor(typedCount / 5);
    intensityScore = Math.floor(wc / mins);
    const intensityBarText = getThermometer(intensityScore);
    barItem2.text = intensityBarText;
    barItem2.show();

    //commands.executeCommand("ClanCode.Online");
  }



  context.subscriptions.push(
    disposable,
    // barItem,
    goOnline,
    // onlineIcon,
    // offlineIcon,
    goOffline,
    logIn,
    register,
    CodeGameMenu,
    createClanMenu,
    joinClanMenu,
    clanPage
  );
}

export function getCodeBarString(score: number) {
  const shield: string = "🛡";
  const emptyBar: string = "▢";
  const filledBar: string = "▣";
  const shieldScore = 100 - score;
  let thermometerText = shield + "(" + shieldScore + ") ";
  for (let i = 1; i <= 10; i++) {
    if (shieldScore >= i * 10) {
      thermometerText = thermometerText + filledBar;
    } else {
      thermometerText = thermometerText + emptyBar;
    }
  }
  return thermometerText;
}
export function getThermometer(score: number) {
  const sword: string = "🗡";
  const emptyBar: string = "▢";
  const filledBar: string = "▣";
  let thermometerText = sword + "(" + score + ") ";
  for (let i = 1; i <= 10; i++) {
    if (score >= i * 10) {
      thermometerText = thermometerText + filledBar;
    } else {
      thermometerText = thermometerText + emptyBar;
    }
  }
  return thermometerText;
}

export function getColorFromScore(score: number) {
  // window.showInformationMessage("Score - "+score);
  const colorIndex = Math.floor(score / 10);
  switch (colorIndex) {
    case 0:
      return "#66FF66"; // Screamin' Green
    case 1:
      return "#A7F432"; //Green Lizard
    case 2:
      return "#2243B6"; //Denim Blue
    case 3:
      return "#5DADEC"; //Blue Jeans	
    case 4:
      return "#34eb56"; // TODO add appropriate colors
    case 5:
      return "#6eeb34";
    case 6:
      return "#c6eb34";
    case 7:
      return "#ebbd34";
    case 8:
      return "#eb8334";
    case 9:
      return "#eb3434";
    default:
      return "#eb3434";
  }
}
function updateTypeCount(event: TextDocumentChangeEvent) {
  const change = event.contentChanges;

  // If length is 1 then its a key stroke
  if (change.length != 1) return;
  const text: string = change[0].text;

  if (text == "") {
    const trimmed = text.trim();
    if (trimmed.length != 0) {
      // console.log("Copied" + trimmed.length)
    } else console.log("Backspace")
  }
  if (text == " ") { console.log("spacebar") }
  else {
    console.log('Added - ' + text.trim().length);
    const change = text.trim().length;
    typedCount = typedCount + change
  }
}

//TODO FIX bug where initially score increases by a much higher number
async function getCodeScore(repo: IRepository) {
  const startTime = (new Date().getTime()); // MS Epoch to Seconds
  let newScore = 0;
  const changes = repo.workingTreeGroup;
  for (let i = 0; i < changes.resourceStates.length; i++) {
    const diffStr: string = await repo.diffWithHEAD(
      changes.resourceStates[i].resourceUri.fsPath
    );
    // Each chunk is prepended by a header inclosed within @@ symbols.
    const reg: RegExp = new RegExp(/@@(.*?)@@/);
    const reg2: RegExp = new RegExp(/@@ \-(.*?),(.*?) \+(.*?),(.*?) @@/);
    const diff = diffStr.split("\n");
    for (let i = 0; i < diff.length; i++) {
      const curr = diff[i];
      const matched = reg.exec(curr);
      if (!matched) continue;
      // console.log(matched[0]);
      const data = reg2.exec(matched[0]);
      if (data == null) continue;
      const subtractedFromLineNum: number = parseInt(data[1]);
      const subtractedLineChanges: number = parseInt(data[2]);
      const addedFromLineNum: number = parseInt(data[3]);
      const addedLineChanges: number = parseInt(data[4]);

      //subtracted lines are from subtractedFromLineNum + subtractedLineChanges
      let affectedLines = [];
      for (
        let i = subtractedFromLineNum;
        i < subtractedFromLineNum + subtractedLineChanges;
        i++
      ) {
        affectedLines.push(i);
      }
      for (
        let i = addedFromLineNum;
        i < addedFromLineNum + addedLineChanges;
        i++
      ) {
        if (!affectedLines.includes(i)) affectedLines.push(i);
      }
      newScore = newScore + affectedLines.length;
    }
    // if (codeScore != 0) window.showInformationMessage("Score - " + codeScore);

    // window.showInformationMessage(matched[0]);
  }
  const endTime = (new Date().getTime()); // MS Epoch to Seconds
  console.log("Update Codebar took " + (endTime - startTime) + "ms to run");
  return newScore;
}
// this method is called when your extension is deactivated
export function deactivate() { }
