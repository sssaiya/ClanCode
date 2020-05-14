import { USER_NOT_FOUND, INCORRECT_PASSWORD } from "./constants";
import { window } from "vscode";
import * as firebase from "firebase";

export async function loginFunction() {
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
}
