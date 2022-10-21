let chatByUser = {};

import "dotenv/config";

import fs, { link, readSync } from "fs";
import tmi from "tmi.js";
import fetch from "node-fetch";
import WebSocket from "ws";
import { setTimeout } from "timers/promises";
import stringSimilarity from "string-similarity";

import * as ROBLOX_FUNCTIONS from "./Functions/roblox.js";
import * as TWITCH_FUNCTIONS from "./Functions/twitch.js";
import * as RESPONSES from "./Functions/responses.js";

const RobloxId = 129152945

let targetId = process.env.TARGET_ID 

import { join } from "path";
import { setEngine, verify } from "crypto";
import { get, METHODS } from "http";
import { uptime } from "process";
import { match } from "assert";
import { platform } from "os";
import { time } from "console";
import { channel } from "diagnostics_channel";
import { resourceLimits } from "worker_threads";
import { MessageFlagsBitField } from "discord.js";

const COOKIE = process.env.COOKIE; // roblo sec token

const BOT_OAUTH = process.env.BOT_OAUTH; // bot oauth token for performing actions
const BOT_NAME = process.env.BOT_NAME; // bot username
const BOT_ID = process.env.BOT_ID; // bot uid

const WAIT_REGISTER = 5 * 60 * 1000; // number of milliseconds, to wait before starting to get stream information

const CHANNEL_NAME = process.env.CHANNEL_NAME; // name of the channel for the bot to be in
const CHANNEL_ID = process.env.CHANNEL_ID; // uid of CHANNEL_NAME

let SETTINGS = JSON.parse(fs.readFileSync("./SETTINGS.json"));

var commandsList = ["!roblox", "!link"];

const current = await ROBLOX_FUNCTIONS.monitorGetPresence(targetId).then((r) => { return r })

let gameArray = {
  oldGame: current.placeId,
  newGame: current.placeId,
  oldGameName: current.lastLocation,
  newGameName: current.lastLocation
}

const client = new tmi.Client({
    options: { debug: true },
    identity: {
      username: BOT_NAME,
      password: `OAuth:${BOT_OAUTH}`,
  },
  channels: [CHANNEL_NAME]
});
  
client.connect();

client.on("connected", async(channel, method) => {
    client.say(CHANNEL_NAME, `Joined channel ${CHANNEL_NAME} PagMan`);
});

async function ksHandler(client, lowerMessage, twitchUsername, userstate) {
    if (lowerMessage == "!ks.on") {
      if (SETTINGS.ks == true) {
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Killswitch is already on.`
        );
      } else if (SETTINGS.ks == false) {
        SETTINGS.ks = true;
        fs.writeFileSync("./SETTINGS.json", JSON.stringify(SETTINGS));
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Killswitch is on, the bot will not be actively moderating.`
        );
      }
    } else if (lowerMessage == "!ks.off") {
      if (SETTINGS.ks == false) {
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Killswitch is already off.`
        );
      } else if (SETTINGS.ks == true) {
        SETTINGS.ks = false;
        fs.writeFileSync("./SETTINGS.json", JSON.stringify(SETTINGS));
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Killswitch is off, the bot will be actively moderating.`
        );
      }
    }
}
async function customModFunctions(client, message, twitchUsername, userstate) {
    var messageArray = ([] = message.toLowerCase().split(" "));

    if (messageArray[0] == "!add") {
        if (messageArray[1] == null) {
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Please specify a user to add.`
          );
        }
    
        const isValidUser = await ROBLOX_FUNCTIONS.isValidRobloxUser(
          messageArray[1]
        );
    
        if (!isValidUser.isValidUser)
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Not a valid username.`
          );
    
        const friend = await ROBLOX_FUNCTIONS.sendFriendRequest(isValidUser.userId);
    
        if (friend == "already") {
          const friends = await ROBLOX_FUNCTIONS.getCurrentUserFriends(3511204536);
    
          let alreadyFriend = false;
    
          friends.forEach(function (friend) {
            if (friend.id == isValidUser.userId) {
              alreadyFriend = true;
            }
          });
    
          if (alreadyFriend)
            return client.raw(
              `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${messageArray[1]} is already added.`
            );
    
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Already sent ${messageArray[1]} a friend request.`
          );
        } else if (friend != "success") {
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : [Error: Unknown Error Ocurred]`
          );
        }
    
        client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Sent a friend request to ${messageArray[1]}.`
        );
    }
}

async function updateMode(client, message, twitchUsername, userstate) {
    var messageArray = ([] = message.toLowerCase().split(" "));
  
    if (!messageArray[0].includes("!")) return;
    if (!messageArray[0].includes(".on")) return;
  
    var isValidMode = SETTINGS.validModes.includes(messageArray[0]);
    var isIgnoreMode = SETTINGS.ignoreModes.includes(messageArray[0]);
    var isSpecialMode = SETTINGS.specialModes.includes(messageArray[0]);
    var isCustomMode = SETTINGS.customModes.includes(messageArray[0]);
  
    if (isIgnoreMode || isSpecialMode || isCustomMode) return;
  
    if (!isValidMode)
      return client.raw(
        `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :[🤖]: ${message} is not a valid mode. Valid Modes: !join.on | !link.on | !1v1.on`
      );
    if (SETTINGS.currentMode == messageArray[0])
      return client.raw(
        `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :[🤖]: ${messageArray[0]} mode is already on.`
      );
    //     fetch("https://gql.twitch.tv/gql", {
    //     "headers": {
    //       "authorization": "OAuth bt29j37avjsigokzr3jq6bt0gscxu7",
    //       "client-id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
    //     },
    //     "body": `[{"operationName":"EditBroadcastContext_ChannelTagsMutation","variables":{"input":{"contentID":"197407231","contentType":"USER","tagIDs":["6ea6bca4-4712-4ab9-a906-e3336a9d8039","ac763b17-7bea-4632-9eb4-d106689ff409","e90b5f6e-4c6e-4003-885b-4d0d5adeb580","8bbdb07d-df18-4f82-a928-04a9003e9a7e","64d9afa6-139a-48d5-ab4e-51d0a92b22de","52d7e4cc-633d-46f5-818c-bb59102d9549"],"authorID":"197407231"}},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"4dd3764af06e728e1b4082b4dc17947dd51ab1aabbd8371ff49c01e440dfdfb1"}}},{"operationName":"EditBroadcastContext_BroadcastSettingsMutation","variables":{"input":{"broadcasterLanguage":"en","game":"Roblox","status":"dasas","userID":"197407231"}},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"856e69184d9d3aa37529d1cec489a164807eff0c6264b20832d06b669ee80ea5"}}}]`,
    //     "method": "POST"
    //     })
  
    if (SETTINGS.currentMode == "!link.on") {
      SETTINGS.currentLink = null;
      // client.say(CHANNEL_NAME, "!delcom !link");
    }
    // if(SETTINGS.currentMode == '!ticket.on'){
    //   const result = await TWITCH_FUNCTIONS.pauseTicketRedemption(true)
    //   if(result){
    //     client.say(CHANNEL_NAME, `@${CHANNEL_NAME}, successfully paused ticket redemption.`)
    //   }else{
    //     client.say(CHANNEL_NAME, `@${CHANNEL_NAME}, error ocurred when trying to pause ticket redemption`)
    //   }
    // }
    // if(messageArray[0] == '!ticket.on'){
    //   const result = await TWITCH_FUNCTIONS.pauseTicketRedemption(false)
    //     client.say(CHANNEL_NAME, `@${twitchUsername}, ${result}`)
    //   if(result){
    //     client.say(CHANNEL_NAME, `@${CHANNEL_NAME}, successfully unpaused ticket redemption.`)
    //   }else{
    //     client.say(CHANNEL_NAME, `@${CHANNEL_NAME}, error ocurred when trying to unpause ticket redemption`)
    //   }
    // }
  
    client.raw(
      `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :[🤖]: @${CHANNEL_NAME}, ${messageArray[0]} mode is now on.`
    );
    SETTINGS.currentMode = messageArray[0];
  
    fs.writeFileSync("./SETTINGS.json", JSON.stringify(SETTINGS));
  
    SETTINGS = JSON.parse(fs.readFileSync("./SETTINGS.json"));
}

let shouldMonitor = false

setInterval(async () => {
  const location = await ROBLOX_FUNCTIONS.getPresence(RobloxId).then((r)=>{return r.lastLocation});
  const onlineStatus = await ROBLOX_FUNCTIONS.getLastOnline(RobloxId).then((r)=>{return r.diffTimeMinutes})
    ROBLOX_FUNCTIONS.monitorGetPresenceSync(targetId, function (presence) {
      const placeId = presence.placeId
      const universeId = presence.universeId   

      gameArray['oldGame'] = gameArray['newGame']
      gameArray['newGame'] = placeId
      gameArray['oldGameName'] = gameArray['newGameName']
      gameArray['newGameName'] = presence.lastLocation

      if (SETTINGS.ks == false) {
        if (gameArray['oldGame'] != gameArray['newGame']) {
          if (gameArray['newGame'] == null) {
            console.log('target left game with placeid = ' + gameArray['oldGame'])
            client.say(
              CHANNEL_NAME, 
              `${CHANNEL_NAME} left the game.`
            );
  
        } else if (gameArray['oldGame'] != gameArray['newGame']) {
          console.log('target joined new game with placeid = ' + gameArray['newGame'])
          client.say(
            CHANNEL_NAME, 
            `${CHANNEL_NAME} is now playing ${gameArray['newGameName']}.`
          );
        }
      }
    }
  })
}, 4000);

client.on("message", async (
    channel,
    userstate,
    message,
    self,
    viewers,
    target
    ) => {
      if (self) return;
      SETTINGS = JSON.parse(fs.readFileSync("./SETTINGS.json"));
      const isFirstMessage = userstate["first-msg"];
      const twitchUserId = userstate["user-id"];
      const twitchUsername = userstate["username"];
      const isSubscriber = userstate["subscriber"];
      const subscriberMonths = (() => {
          if (isSubscriber) {
            return userstate["badge-info"].subscriber;
          } else {
            return null;
          }
        })();
  
      const isBroadcaster = 
      twitchUsername == CHANNEL_NAME;
      const isAdmin =
      twitchUserId == BOT_ID;
      const isMod = userstate["mod"];
      const hexNameColor = userstate.color;
      const ModOrBroadcaster = isMod || isBroadcaster;
      const lowerMessage = message.toLowerCase();
      const isVip = (() => {
          if (userstate["badges"] && userstate["badges"].vip == 1) {
            return true;
          } else {
            return false;
          }
        })();
  
  
        const robloxGame = await ROBLOX_FUNCTIONS.getPresence(RobloxId).then((r)=>{return r.lastLocation});
        const locationId = await ROBLOX_FUNCTIONS.getPresence(RobloxId).then((r)=>{return r.placeId});
        const onlineStatus = await ROBLOX_FUNCTIONS.getLastOnline(RobloxId).then((r)=>{return r.diffTimeMinutes});
        const playtime = await ROBLOX_FUNCTIONS.getLastOnline(RobloxId).then((r)=>{return r.timeString})
  
        if (SETTINGS.ks == false) {
          if (message.toLowerCase() == "!game" || message.toLowerCase() == "1game") {      
        
              if (onlineStatus > 30) {
                return client.raw(
                  `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is not playing anything right now.`);
              }
              console.log(robloxGame)
              if (robloxGame != 'Website') {
               client.raw(
                `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently playing ${robloxGame}.`); 
              return
              }
          
              return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently switching games.`); 
              }
              if (message.toLowerCase() == "!gamelink") {
                if (locationId == '8343259840') {
                  return client.raw(
                    `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Current game link -> roblox.com/games/4588604953`)};
                if (locationId == '6839171747') {
                  return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Current game link -> roblox.com/games/6516141723`)};
          
                // if (SETTINGS.currentMode == "!link.on") {
                //   if (SETTINGS.currentLink != null) {
                //     return client.raw(
                //       `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Current game link -> ${SETTINGS.currentLink}`
                //     );
                //   }
                // }
                if (onlineStatus > 30) {
                  return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currenly offline so there is no game link.`
                  );
                }
                if (robloxGame != 'Website') {
                  client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Current game link -> roblox.com/games/${locationId}`
                  );
                  return
                }
                return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently switching games.`);
              }
              if (message.toLowerCase() == "!playtime" || message.toLowerCase() == "!gametime") {
                if (onlineStatus > 30) {
                  return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is not playing anything right now.`);
                }
          
                console.log(playtime)
                if (robloxGame != 'Website') {
                  client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} has been playing ${robloxGame} for ${playtime}.`);
                  return
                }
                
                return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently switching games.`);
              }
              if (message.toLowerCase() == "!rstats" || message.toLowerCase() )
              if (SETTINGS.keywords == true) {
                const msg = message.toLowerCase();
                // const kwrd = message.toLowerCase().includes;
                const linkAllowed = isVip || ModOrBroadcaster || isAdmin
                // if (!isMod || !isBroadcaster || !isAdmin) {
                //   if (
                //       message.toLowerCase().includes("what game is this") ||
                //       message.toLowerCase().includes("what game r u") ||
                //       message.toLowerCase().includes("what game is that") ||
                //       message.toLowerCase().includes("game called") ||
                //       message.toLowerCase().includes("game name") ||
                //       message.toLowerCase().includes("what is this game")
                //   ) {
              
                //       if (onlineStatus > 30) {
                //           return client.raw(
                //             `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is not playing anything right now.`);
                //         }
                //         console.log(robloxGame)
                //         if (robloxGame != 'Website') {
                //          client.raw(
                //           `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently playing ${robloxGame}.`); 
                //         return
                //         }
                    
                //         return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently switching games.`);            
                //   }
                // }
              }
          }
        if (message.toLowerCase() == "!namecolor") {
          client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Your username hex code is ${hexNameColor}.`);
        }
        if (
          message.toLowerCase() == "!commands" ||
          message.toLowerCase() == "!cmds" ||
          message.toLowerCase() == "!coms"
          ) {
              client.raw(
                `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Click here for commands: cmds.mrcheeezz.com`
              );
          }
        if (message.toLowerCase() == "!github") {
          client.say(CHANNEL_NAME, `@${twitchUsername} The bots github -> github.com/mr-cheeezz/twitchbot`);
        }
        if (message.toLowerCase() == "!tf") {
          client.say(
            CHANNEL_NAME,
            `/me  Click here to get Jebaited -> tf.mr${CHANNEL_NAME}.com`
          );
        }
         if (message.toLowerCase() == "!rstats" || message.toLowerCase() == "!robloxstatus") {
          if (onlineStatus > 30) {
            client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently offline, he has been offline for ${playtime}`);
          }
          if (robloxGame == 'Website') {
            client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently on the website.`);
          }
          if (robloxGame != 'Website') {
            client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : ${CHANNEL_NAME} is currently in game, he is playing ${robloxGame}.`);
          }
        }
    //   if (SETTINGS.ks == false) {
    //       newUserHandler(client, message, twitchUsername, isFirstMessage, userstate);
    //       customUserFunctions(client, message, twitchUsername, twitchUserId, userstate);
    //   }
      if (isBroadcaster || isMod || isAdmin) {
          ksHandler(client, lowerMessage, twitchUsername, userstate);
          updateMode(client, message, twitchUsername, userstate);
          // timerHandler(client, lowerMessage, twitchUsername, userstate);
          // keywordHandler(client, lowerMessage, twitchUsername, userstate);
          customModFunctions(client, message, twitchUsername, userstate);
          // newLinkHandler(client, message, twitchUsername, userstate);
      }
      if (isMod || isBroadcaster || isAdmin) {
          if (SETTINGS.ks == false) {
              if (message.toLowerCase() == "!currentmode") {
                  SETTINGS = JSON.parse(fs.readFileSync("./SETTINGS.json"));
                  var currentMode = SETTINGS.currentMode.replace(".on", "");
                  currentMode = currentMode.replace("!", "");
  
                  if (SETTINGS.currentMode == "!join.on") {
                      return client.raw(
                          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :The bot is currently in join mode.`
                      );
                  }
                  if (SETTINGS.currentMode == "!link.on") {
                      return client.raw(
                          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :The bot is currently in link mode.`
                      );
                  }
                  client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :The bot is currently in ${SETTINGS.currentMode} mode.`);
                  return
              }
              if (message.toLowerCase() == "!validmodes") {
                client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} : Valid Modes: !join.on | !link.on | !1v1.on`);
              }
              if (lowerMessage == "!settings") {
                SETTINGS = JSON.parse(fs.readFileSync("./SETTINGS.json"));
          
                if (SETTINGS.ks == false && SETTINGS.timers == true && SETTINGS.keywords == true) {
                  client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :Current Settings: Killswitch - Off | Timers - On | Keywords - On`);
                } else if (SETTINGS.ks == false && SETTINGS.timers == false && SETTINGS.keywords == true) {
                  client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :Current Settings: Killswitch - Off | Timers - Off | Keywords - On`);
                } else if (SETTINGS.ks == false && SETTINGS.timers == false && SETTINGS.keywords == false) {
                  client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :Current Settings: Killswitch - Off | Timers - Off | Keywords - Off`);
                } else if (SETTINGS.ks == false && SETTINGS.timers == false && SETTINGS.keywords == false) {
                  client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG #${CHANNEL_NAME} :Current Settings: Killswitch - Off | Timers - Off | Keywords - Off`);
                }
            }
        }
    }
});