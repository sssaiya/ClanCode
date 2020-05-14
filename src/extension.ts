// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// import * as vscode from "vscode";
import { ExtensionContext, commands, window, StatusBarAlignment } from "vscode";
import { myTreeDataProvider } from "./treeDataProvider";
import { firebaseConfig } from "./config";
import { INVALID_EMAIL, INCORRECT_PASSWORD, USER_NOT_FOUND } from "./constants";
import * as firebase from "firebase";

class userData {
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
interface UserStatus {
  username: string;
  lastOnline: number;
  status: string;
}
interface indexedArray {
  [key: string]: UserStatus;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  let user: userData;
  var clanStatus: indexedArray = {};
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "ClanCode" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  firebase.initializeApp(firebaseConfig);

  firebase.auth().onAuthStateChanged(async function (firebaseUser) {
    console.log("IN AUTH STATE CHANGE");
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
        let treeView = window.createTreeView("clanCode", {
          treeDataProvider: new myTreeDataProvider(),
        });
        treeView.title = user.clanName || undefined;
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
        clanStatus[username] = userStatus;

        //Update array in global storage
        context.workspaceState.update("clanMembersStatus", clanStatus);
        //TODO Refresh tree view
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
    async function () {
      const email = await window.showInputBox({
        placeHolder: "Eg. superstar@clancode.com",
        prompt: "Enter your email to Sign up with ClanCode",
      });
      const userName = await window.showInputBox({
        placeHolder: "",
        prompt:
          "Enter your Username (This is how your clan mates will see you !)",
      });
      const password = await window.showInputBox({
        placeHolder: "",
        prompt: "Enter your desired password",
        password: true,
      });
      const password2 = await window.showInputBox({
        placeHolder: "",
        prompt: "Re-Enter your password",
        password: true,
      });

      if (password != password2) {
        window.showInformationMessage(
          "Password Didn't Match! Please try again"
        );
        return;
      }

      if (
        email == undefined ||
        password == undefined ||
        userName == undefined
      ) {
        // TODO add error handling
        return;
      }
      await firebase
        .auth()
        .createUserWithEmailAndPassword(email, password)
        .catch(function (error) {
          console.log(errorMessage);
          // Handle Errors here.
          if ((error.code = INVALID_EMAIL)) {
            window.showInformationMessage(
              "The email - " + email + "is Invalid"
            );
          }
          var errorMessage = error.message;
          console.log(error.code);
          // ...
        });

      // if(userCred == null);
      let currentUser = firebase.auth().currentUser;
      if (currentUser == null) return;
      user.uid = currentUser.uid;

      user.username = userName;
      user.useremail = email;

      //Add user metaData
      firebase
        .database()
        .ref("/users/" + user.uid)
        .set(userData);

      window.showInformationMessage("Registering " + email);
    }
  );

  let logIn = commands.registerCommand("ClanCode.LogIn", async function () {
    const email = await window.showInputBox({
      placeHolder: "superstar@clancode.com",
      prompt: "Enter your email to log into ClanCode",
    });
    const password = await window.showInputBox({
      placeHolder: "",
      prompt: "Enter your password to log into ClanCode",
      password: true,
    });

    if (email == undefined || password == undefined) return;

    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .catch(function (error) {
        console.log(error.code);
        if (error.code == USER_NOT_FOUND) {
          window.showInformationMessage(
            "User - " +
              email +
              " not found, Please check of you mistyped it, else Register email First using command " +
              "ClanCode: Register your account!"
          );
        }
        if ((error.code = INCORRECT_PASSWORD)) {
          window.showInformationMessage("Invalid Password ! Try again ");
        }
      });

    // Note - Cant use Login with popup or redirect functionality from firebase auth Documentation
    // as VSCode lacks some support for hhtp storage etc, have to use GitHub OAuth 2.0 endpoints To integrate
    // sign in flow manually
  });
  let createClanMenu = commands.registerCommand(
    "ClanCode.createClan",
    async function createClan() {
      // const checkButton = QuickInputButtons;
      // Note, Buttons need Typescript, learn it soon
      // const button = vscode.QuickInputButton().;
      const clanName = await window.showInputBox({
        placeHolder: "Eg. StarHackers",
        prompt: "Enter Clan Name",
      });

      if (clanName == undefined) return;
      const clanTag = GetUniqueClanTag(6);
      window.showInformationMessage(clanTag);

      //https://stackoverflow.com/questions/9543715/generating-human-readable-usable-short-but-unique-ids

      //Create the clann in DB
      var newClanDatabaseRef = firebase.database().ref("/clans/" + clanTag);
      newClanDatabaseRef
        .set({
          name: clanName,
          created: firebase.database.ServerValue.TIMESTAMP,
        })
        .catch(function (error) {
          console.log("Create Clan Error -");
          console.log(error);
        });

      //Add Creator to the Clan
      var clanMembersDatabaseRef = firebase
        .database()
        .ref("/clans/" + clanTag + "/members");
      clanMembersDatabaseRef.push(user.uid);

      window.showInformationMessage(
        "Created Clan - " + clanName + " And Clan Tag - " + clanTag
      );

      user.isInClan = true;
      user.clanTag = clanTag;
      user.clanName = clanName;

      //Add user metaData
      firebase
        .database()
        .ref("/users/" + user.uid)
        .set(userData);
    }
  );

  let joinClanMenu = commands.registerCommand(
    "ClanCode.joinClan",
    async function joinClan() {
      const clanTagLowerCase = await window.showInputBox({
        placeHolder: "Eg. ******",
        prompt: "Join a Clan via its ClanTag",
      });

      if (clanTagLowerCase == undefined) return;
      const clanTag = clanTagLowerCase.toUpperCase(); //Configured to be case insensitive in DB :)

      var clanName = null;
      await firebase
        .database()
        .ref("clans/" + clanTag)
        .once("value", function (snapshot) {
          if (snapshot.val() != null) {
            clanName = snapshot.val().name;
          } else {
            console.log("ERROR WRONG CLAN TAG");
          }
        });

      if (clanName == null) {
        window.showInformationMessage(
          "Clan with Tag -" +
            clanTag +
            " doesn't exist, create or join via Clan Tag"
        );
        return;
      }

      console.log("Attempting to join clan" + clanName);

      //Add to the Clan
      var clanMembersDatabaseRef = firebase
        .database()
        .ref("/clans/" + clanTag + "/members");
      clanMembersDatabaseRef.push(user.uid);

      user.clanTag = clanTag;
      user.isInClan = true;
      user.clanName = clanName;

      firebase
        .database()
        .ref("/users/" + user.uid)
        .set(userData);
    }
  );

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

//https:stackoverflow.com/questions/9543715/generating-human-readable-usable-short-but-unique-ids
function GetUniqueClanTag(length: number) {
  const _base62chars =
    "123456789BCDFGHJKLMNPQRSTVWXYZabcdefghijklmnopqrstuvwxyz";
  // Removed I as confused with 1
  // Removed O and 0
  // function random = Math.random()
  // Remove Remaninig vowels(U, E, A) to prevent bad word generation
  var tagBuilder = "";

  for (var i = 0; i < length; i++) {
    const keyIndex = Math.floor(Math.random() * 27); // Changed 33 to 27 as removed 6 characters
    tagBuilder = tagBuilder + _base62chars.charAt(keyIndex);
  }
  return tagBuilder;
}

function padWithSpaces(name: string, length: number) {
  const toPad = length - name.length;
  var newString = name;
  for (var i = 0; i < toPad; i++) {
    if (i % 2 != 0) newString = newString + " ";
    else newString = " " + newString;
  }
  return newString;
}
