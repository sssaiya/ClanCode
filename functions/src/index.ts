import * as functions from 'firebase-functions';
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const database = admin.database();
const express = require("express");
const app = express();

type clanMember = { id: String, value: any };


async function getClanMembersData(clanTag: any) {
  const uid: Array<String> = [];
  await database
    .ref("/clans/" + clanTag + "/members")
    .once("value")
    .then(function (snapshot: any) {
      // const uid: Array<String> = [];
      snapshot.forEach(function (childSnapshot: any) {
        const memberUID: string = childSnapshot.val();
        uid.push(memberUID);
      });


    })
    .catch(function (error: any) {
      //TODO error handling
    });

  const clanName: string = await database
    .ref("/clans/" + clanTag + "/name")
    .once("value")
    .then(function (snapshot: any) {
      return snapshot.val();
    })
    .catch(function (error: any) {
      //TODO error handling
    });

  const clanMembers: Array<clanMember> = [];
  for (let i = 0; i < uid.length; i++) {
    await database
      .ref("/status/" + uid[i])
      .once("value")
      .then(function (snapshot: any) {
        const member: clanMember = { 'id': uid[i], 'value': snapshot.val() };
        clanMembers.push(member)
      })
      .catch(function (error: any) {
        //TODO error handling
      });
  }

  return { uid, clanName, clanMembers };

}
function clanNameHtml(clanName: string) {
  return `<div class="vintage__container">
    <h1 class="vintage vintage__top">`+ clanName + `</h1>
    <h1 class="vintage vintage__bot">`+ clanName + `</h1>
  </div>`
}

function getLeaderboard(clanMembers: Array<clanMember>) {
  let leaderBoardStr: string = `<div class="leaderboard" id="leaderboard">
  <span class="intro">Leaderboard</span>
  <ol>`;
  for (let i = 0; i < clanMembers.length; i++) {
    const member = clanMembers[i];
    const entryStr = `<li>
    <mark>`+ member.value.user_name + `</mark>
    <small>`+ member.value.score + `</small>
  </li>`
    leaderBoardStr = leaderBoardStr + entryStr;
  }

  leaderBoardStr = leaderBoardStr + `</ol></div>`
  return leaderBoardStr
}

app.get("/", async function (req: any, res: any) {
  let clanTag = req.query.clanTag;
  if (clanTag === undefined) {
    clanTag = "JQ9HHD";
  }

  const clanMembersData = await getClanMembersData(clanTag);
  console.log(clanMembersData);

  res.status(200).send(`<!doctype html>

    <head>
    <link rel="stylesheet" href="https://teamcode-dff02.web.app/clash.css">
      <title>`+ clanMembersData.clanName + `</title>
    </head>
    <body>
      `+ clanNameHtml(clanMembersData.clanName) + `
      <div>
      `+ getLeaderboard(clanMembersData.clanMembers) + `
    </body>

    </html>`);
});

exports.app = functions.https.onRequest(app);