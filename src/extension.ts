// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// import * as vscode from "vscode";
import { ExtensionContext, commands, window, StatusBarAlignment } from "vscode";
import { myTreeDataProvider } from "./treeDataProvider";
import { firebaseConfig } from "./config";
import {
  INVALID_EMAIL,
  INCORRECT_PASSWORD,
  USER_NOT_FOUND,
  MIN_PASSWORD_LENGTH,
} from "./constants";
import * as firebase from "firebase";
import { registerFunction } from "./register";
import { loginFunction } from "./login";
import { createClan, joinClan } from "./clanFunctions";

export class userData {
  uid: string;
  username: string | null;
  useremail: string | null;
  isInClan: boolean;
  clanTag: string | null;
  clanName: string | null;

  constructor(uid: string) {
    this.uid = uid;
    this.username = null;
    this.useremail = null;
    this.isInClan = false;
    this.clanTag = null;
    this.clanName = null;
  }
}
export interface UserStatus {
  username: string;
  lastOnline: number;
  status: string;
}
let indexedArray: Map<string, UserStatus>;

export let user: userData;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  indexedArray = new Map<string, UserStatus>();
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "ClanCode" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  firebase.initializeApp(firebaseConfig);

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

        commands.registerCommand("ClanCode.refresh", () =>
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
      };
      var isOnlineForDatabase = {
        state: "online",
        last_changed: firebase.database.ServerValue.TIMESTAMP,
        user_name: user.username,
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

  async function getStatus(uid: string) {
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
        };
        indexedArray.set(username, userStatus);

        // Refresh Tree view
        commands.executeCommand("ClanCode.refresh");
      });
  }

  let alignment = 10;

  let barItem = window.createStatusBarItem(StatusBarAlignment.Left, alignment);
  let onlineIcon = window.createStatusBarItem(
    StatusBarAlignment.Left,
    alignment - 0.1
  );
  let offlineIcon = window.createStatusBarItem(
    StatusBarAlignment.Left,
    alignment - 0.1
  );
  barItem.command = "ClanCode.onClick";
  barItem.text = "ClanCode";
  barItem.show();

  offlineIcon.command = "ClanCode.Online";
  offlineIcon.text = "$(debug-hint)";

  onlineIcon.command = "ClanCode.Offline";
  onlineIcon.text = "$(circle-filled)";
  // onlineIcon.text.fontcolor TODO MAKE THIS GREEN / make custom icons
  onlineIcon.show();

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
    window.showInformationMessage("ONLINE");
    offlineIcon.hide();
    onlineIcon.show();
    var userStatusDatabaseRef = firebase.database().ref("/status/" + user.uid);
    // firebase.database().
    var isActiveForDatabase = {
      state: "Active",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
      user_name: user.username,
    };
    if (user != undefined) {
      console.log("Going Active");
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
    onlineIcon.hide();
    offlineIcon.show();
    var userStatusDatabaseRef = firebase.database().ref("/status/" + user.uid);
    // firebase.database().
    var isAwayForDatabase = {
      state: "away",
      last_changed: firebase.database.ServerValue.TIMESTAMP,
      user_name: user.username,
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

  context.subscriptions.push(
    disposable,
    barItem,
    goOnline,
    onlineIcon,
    offlineIcon,
    goOffline,
    logIn,
    register,
    CodeGameMenu,
    createClanMenu,
    joinClanMenu
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

// function padWithSpaces(name: string, length: number) {
//   const toPad = length - name.length;
//   var newString = name;
//   for (var i = 0; i < toPad; i++) {
//     if (i % 2 != 0) newString = newString + " ";
//     else newString = " " + newString;
//   }
//   return newString;
// }
