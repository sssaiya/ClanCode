import { window } from "vscode";
import { MIN_PASSWORD_LENGTH, INVALID_EMAIL } from "./constants";
import * as firebase from "firebase";
import { user } from "./extension";

export async function registerFunction() {
  const email = await window.showInputBox({
    placeHolder: "Eg. superstar@clancode.com",
    prompt: "Enter your email to Sign up with ClanCode",
  });

  if (email == undefined) {
    return;
  }
  const userName = await window.showInputBox({
    placeHolder: "",
    prompt: "Enter your Username (This is how your clan mates will see you !)",
  });
  if (userName == undefined) {
    window.showInformationMessage("No username");
    return;
  }
  const password = await window.showInputBox({
    placeHolder: "",
    prompt: "Enter your desired password",
    password: true,
  });
  if (password == undefined || password.length < MIN_PASSWORD_LENGTH) {
    window.showInformationMessage(
      "Please enter a password thats atleast 8 characters"
    );
    return;
  }
  const password2 = await window.showInputBox({
    placeHolder: "",
    prompt: "Re-Enter your password",
    password: true,
  });
  if (password2 == undefined) {
    window.showInformationMessage("Password Didn't Match! Please try again");
    return;
  }

  if (password != password2) {
    window.showInformationMessage("Password Didn't Match! Please try again");
    return;
  }

  if (email == undefined || password == undefined || userName == undefined) {
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
        window.showInformationMessage("The email - " + email + "is Invalid");
      }
      var errorMessage = error.message;
      console.log(error.code);
      // ...
    });

  let currentUser = firebase.auth().currentUser;
  if (currentUser == null) return;
  user.uid = currentUser.uid;

  user.username = userName;
  user.useremail = email;

  //Add user metaData
  firebase
    .database()
    .ref("/users/" + user.uid)
    .set(user);

  window.showInformationMessage("Registering " + email);
}
