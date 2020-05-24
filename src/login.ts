import { USER_NOT_FOUND, INCORRECT_PASSWORD } from "./constants";
import { window, ExtensionContext } from "vscode";
import * as firebase from "firebase";

export async function loginFunction(context: ExtensionContext) {
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

  // context.globalState.update("email", email);
  // context.globalState.update("password", password); // This is a BAD idea but this password is eh... TODO
  // Note - Cant use Login with popup or redirect functionality from firebase auth Documentation
  // as VSCode lacks some support for hhtp storage etc, have to use GitHub OAuth 2.0 endpoints To integrate
  // sign in flow manually
}
