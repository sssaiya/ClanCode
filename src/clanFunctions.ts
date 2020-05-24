import { window } from "vscode";
import * as firebase from "firebase";
import { user } from "./extension";

export async function createClan() {
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
    .set(user);
}

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

export async function joinClan() {
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
    .set(user);
}
