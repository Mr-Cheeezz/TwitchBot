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

const CHANNEL_NAME = process.env.CHANNEL_NAME.toLowerCase(); // name of the channel for the bot to be in
const CHANNEL_NAME_DISPLAY = process.env.CHANNEL_NAME; // display name of channel
const CHANNEL_ID = process.env.CHANNEL_ID; // uid of CHANNEL_NAME
const CHANNEL_NAME_RAW = '#' + CHANNEL_NAME.toLowerCase(); // raw name of channel

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
  channels: [CHANNEL_NAME, BOT_NAME]
});
  
console.log(client.connect(CHANNEL_NAME));

client.on("connected", async(channel, method) => {
  client.action(CHANNEL_NAME, `Joined channel ${CHANNEL_NAME_DISPLAY} PagMan`);
  client.action(BOT_NAME, `Bot is online in ${CHANNEL_NAME_DISPLAY}'s chat. FeelsGoodMan`)
});

async function ksHandler(client, lowerMessage, twitchUsername, userstate) {
    if (lowerMessage == "!ks.on") {
      if (SETTINGS.ks == true) {
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Killswitch is already on.`
        );
      } else if (SETTINGS.ks == false) {
        SETTINGS.ks = true;
        fs.writeFileSync("./SETTINGS.json", JSON.stringify(SETTINGS));
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Killswitch is on, the bot will not be actively moderating.`
        );
      }
    } else if (lowerMessage == "!ks.off") {
      if (SETTINGS.ks == false) {
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Killswitch is already off.`
        );
      } else if (SETTINGS.ks == true) {
        SETTINGS.ks = false;
        fs.writeFileSync("./SETTINGS.json", JSON.stringify(SETTINGS));
        return client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Killswitch is off, the bot will be actively moderating.`
        );
      }
    }
}
async function customModFunctions(client, message, twitchUsername, userstate) {
    var messageArray = ([] = message.toLowerCase().split(" "));

    if (messageArray[0] == "!friend") {
        if (messageArray[1] == null) {
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Please specify a user to add.`
          );
        }
    
        const isValidUser = await ROBLOX_FUNCTIONS.isValidRobloxUser(
          messageArray[1]
        );
    
        if (!isValidUser.isValidUser)
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Not a valid username.`
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
              `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${messageArray[1]} is already added.`
            );
    
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Already sent ${messageArray[1]} a friend request.`
          );
        } else if (friend != "success") {
          return client.raw(
            `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : [Error: Unknown Error Ocurred]`
          );
        }
    
        client.raw(
          `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Sent a friend request to ${messageArray[1]}.`
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
        `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${message} is not a valid mode. Valid Modes: !join.on | !link.on | !1v1.on`
      );
    if (SETTINGS.currentMode == messageArray[0])
      return client.raw(
        `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${messageArray[0]} mode is already on.`
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
      `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${messageArray[0]} mode is now on.`
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
            client.action(
              CHANNEL_NAME, 
              `${CHANNEL_NAME_DISPLAY} left the game.`
            );
  
        } else if (gameArray['oldGame'] != gameArray['newGame']) {
          console.log('target joined new game with placeid = ' + gameArray['newGame'])
          client.action(
            CHANNEL_NAME, 
            `${CHANNEL_NAME_DISPLAY} is now playing ${gameArray['newGameName']}.`
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
                `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${CHANNEL_NAME_DISPLAY} is not playing anything right now.`);
            }
            console.log(robloxGame)
            if (robloxGame != 'Website') {
             client.raw(
              `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${CHANNEL_NAME_DISPLAY} is currently playing ${robloxGame}.`); 
            return
            }
        
            return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${CHANNEL_NAME_DISPLAY} is currently switching games.`); 
            }
            if (message.toLowerCase() == "!gamelink") {
              if (locationId == '8343259840') {
                return client.raw(
                  `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Current game link -> roblox.com/games/4588604953`)};
              if (locationId == '6839171747') {
                return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Current game link -> roblox.com/games/6516141723`)};
        

              if (onlineStatus > 30) {
                return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${CHANNEL_NAME_DISPLAY} is currenly offline so there is no game link.`
                );
              }
              if (robloxGame != 'Website') {
                client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Current game link -> roblox.com/games/${locationId}`
                );
                return
              }
              return client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : ${CHANNEL_NAME} is currently switching games.`);
            }
          }
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
                      `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} :The bot is currently in join mode.`
                  );
              }
              if (SETTINGS.currentMode == "!link.on") {
                  return client.raw(
                      `@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} :The bot is currently in link mode.`
                  );
              }
              client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} :The bot is currently in ${SETTINGS.currentMode} mode.`);
              return
              }
              if (message.toLowerCase() == "!validmodes") {
                client.raw(`@client-nonce=${userstate['client-nonce']};reply-parent-msg-id=${userstate['id']} PRIVMSG ${CHANNEL_NAME_RAW} : Valid Modes: !join.on | !link.on | !1v1.on`);
              }
            } 
      }
      
});

async function liveDownHandler() {
  if (await TWITCH_FUNCTIONS.isLive()) {
    await setTimeout(WAIT_REGISTER / 100);
    client.say(
      `${CHANNEL_NAME}`,
      `${CHANNEL_NAME} is now offline.`
    );
  }
}

var pubsub;
const myname = CHANNEL_NAME;

var ping = {};
ping.pinger = false;
ping.start = function () {
  if (ping.pinger) {
    clearInterval(ping.pinger);
  }
  ping.sendPing();

  ping.pinger = setInterval(function () {
    setTimeout(function () {
      ping.sendPing();
    }, Math.floor(Math.random() * 1000 + 1));
  }, 4 * 60 * 1000);
};
ping.sendPing = function () {
  try {
    pubsub.send(
      JSON.stringify({
        type: "PING",
      })
    );
    ping.awaitPong();
  } catch (e) {
    console.log(e);

    pubsub.close();
    StartListener();
  }
};
ping.awaitPong = function () {
  ping.pingtimeout = setTimeout(function () {
    console.log("WS Pong Timeout");
    pubsub.close();
    StartListener();
  }, 10000);
};

ping.gotPong = function () {
  clearTimeout(ping.pingtimeout);
};

var requestListen = function (topics, token) {
  let pck = {};
  pck.type = "LISTEN";
  pck.nonce = myname + "-" + new Date().getTime();

  pck.data = {};
  pck.data.topics = topics;
  if (token) {
    pck.data.auth_token = token;
  }

  pubsub.send(JSON.stringify(pck));
};

var StartListener = function () {
  pubsub = new WebSocket("wss://pubsub-edge.twitch.tv");
  pubsub
    .on("close", function () {
      console.log("Disconnected");
      StartListener();
    })
    .on("open", function () {
      ping.start();
      runAuth();
    });
  pubsub.on("message", async function (raw_data, flags) {
    SETTINGS = JSON.parse(fs.readFileSync("./SETTINGS.json"));
    var PData = JSON.parse(raw_data);
    if (PData.type == "RECONNECT") {
      console.log("Reconnect");
      pubsub.close();
    } else if (PData.type == "PONG") {
      ping.gotPong();
    } else if (PData.type == "RESPONSE") {
      console.log(PData);
      console.log("RESPONSE: " + (PData.error ? PData.error : "OK"));
    } else if (PData.type == "MESSAGE") {
      PData = PData.data;
      const pubTopic = PData.topic;
      const pubMessage = PData.message;
      const serverTime = pubMessage.server_time;
      const type = JSON.parse(pubMessage).type;
      if (type == "stream-down") {
        client.say(CHANNEL_NAME, `/followers`);
        liveDownHandler();
      } else if (type == "AD_POLL_CREATE") {
        TWITCH_FUNCTIONS.onMultiplayerAdStart();
      } else if (type == "AD_POLL_COMPLETE") {
        var adData = pubMessage.data.poll;
        TWITCH_FUNCTIONS.onMultiplayerAdEnd(adData);
      } else if (type == "moderation_action") {
        const followData = JSON.parse(pubMessage).data;
        const followChange = followData.moderation_action;

        if (JSON.parse(pubMessage).data.moderation_action == "untimeout") {
          const untimedoutUser = JSON.parse(pubMessage).data.target_user_login;
          FILTER_FUNCTIONS.onUntimedOut(untimedoutUser);
        }
      } else if (pubTopic == `stream-chat-room-v1.${CHANNEL_ID}`) {
        // if(pubMessage.data.room.modes.followers_)
        var modeData = JSON.parse(pubMessage).data.room.modes
        if (modeData.emote_only_mode_enabled == true) {
          console.log('emote only enabled')
        } else if (modeData.subscribers_only_mode_enabled == true) {
          console.log('sub only mode enabled')
        }
      } else if (pubTopic == `ads.${CHANNEL_ID}`) {
        if (SETTINGS.ks == false) {
          client.say(
            CHANNEL_NAME,
            `An ad has been ran, subscribe with prime for free and enjoy watching with 0 ads all month for free, !prime for more info EZY PogU .`
          );
        }
      } else if (pubTopic == `community-moments-channel-v1.${CHANNEL_ID}`) {
        if (SETTINGS.ks == false) {
          client.say(
            CHANNEL_NAME,
            `.announce A new moment PagMan everyone claim it while you can PogU PagBounce .`
          )
        }
      } else if (pubTopic == `community-points-channel-v1.${CHANNEL_ID}`) {
        if (type == "reward-redeemed") {
          const timeout = "98d977f3-b56b-4fdf-9b14-c3915f15b13b";

          const redemptionId = JSON.parse(pubMessage).data.redemption.reward.id;

          const twitchUsername =
          JSON.parse(pubMessage).data.redemption.user.login;

          if (redemptionId == timeout) {
            client.timeout(
              CHANNEL_NAME,
              
            );
          }
        }
      }
    }
  });
};

var runAuth = function () {
  requestListen(
    [
      // `activity-feed-alerts-v2.${CHANNEL_ID}`,
      `ads.${CHANNEL_ID}`,
      // `ads-manager.${CHANNEL_ID}`,
      // `channel-ad-poll-update-events.${CHANNEL_ID}`,
      // `ad-property-refresh.${CHANNEL_ID}`,
      // `automod-levels-modification.${CHANNEL_ID}`,
      // `automod-queue.${CHANNEL_ID}`,
      `leaderboard-events-v1.${CHANNEL_ID}`,
      // `bits-campaigns-v1.${CHANNEL_ID}`,
      // `campaign-events.${CHANNEL_ID}`,
      // `user-campaign-events.${CHANNEL_ID}`,
      // `celebration-events-v1.${CHANNEL_ID}`,
      // `channel-bits-events-v1.${CHANNEL_ID}`,
      // `channel-bit-events-public.${CHANNEL_ID}`,
      // `channel-event-updates.${CHANNEL_ID}`,
      // `channel-squad-invites.${CHANNEL_ID}`,
      // `channel-squad-updates.${CHANNEL_ID}`,
      // `channel-subscribe-events-v1.${CHANNEL_ID}`,
      // `channel-cheer-events-public-v1.${CHANNEL_ID}`,
      // `broadcast-settings-update.${CHANNEL_ID}`,
      // `channel-drop-events.${CHANNEL_ID}`,
      // `channel-bounty-board-events.cta.${CHANNEL_ID}`,
      // `chatrooms-user-v1.505216805`,
      // `community-boost-events-v1.${CHANNEL_ID}`,
      `community-moments-channel-v1.${CHANNEL_ID}`,
      // `community-moments-user-v1.${CHANNEL_ID}`,
      // `community-points-broadcaster-v1.${CHANNEL_ID}`,
      `community-points-channel-v1.${CHANNEL_ID}`,
      // `community-points-user-v1.${CHANNEL_ID}`,
      `predictions-channel-v1.${CHANNEL_ID}`,
      // `predictions-user-v1.${CHANNEL_ID}`,
      // `creator-goals-events-v1.${CHANNEL_ID}`,
      // `dashboard-activity-feed.${CHANNEL_ID}`,
      // `dashboard-alert-status.${CHANNEL_ID}`,
      // `dashboard-multiplayer-ads-events.${CHANNEL_ID}`,
      // `emote-uploads.${CHANNEL_ID}`,
      // `emote-animations.${CHANNEL_ID}`,
      // `extension-control.upload.${CHANNEL_ID}`,
      // `follows.${CHANNEL_ID}`,
      // `friendship.${CHANNEL_ID}`,
      // `hype-train-events-v1.${CHANNEL_ID}`,
      // `user-image-update.${CHANNEL_ID}`,
      // `low-trust-users.${CHANNEL_ID}`,
      // `midnight-squid-recipient-v1.${CHANNEL_ID}`,
      // //`chat_moderator_actions.${CHANNEL_ID}`
      `chat_moderator_actions.${BOT_ID}.${CHANNEL_ID}`,
      // `moderator-actions.${CHANNEL_ID}`,
      // `multiview-chanlet-update.${CHANNEL_ID}`,
      // `channel-sub-gifts-v1.${CHANNEL_ID}`,
      // `onsite-notifications.${CHANNEL_ID}`,
      // `payout-onboarding-events.${CHANNEL_ID}`,
      `polls.${CHANNEL_ID}`,
      // `presence.${CHANNEL_ID}`,
      // `prime-gaming-offer.${CHANNEL_ID}`,
      // `channel-prime-gifting-status.${CHANNEL_ID}`,
      // `pv-watch-party-events.${CHANNEL_ID}`,
      // `private-callout.${CHANNEL_ID}`,
      // `purchase-fulfillment-events.${CHANNEL_ID}`,
      // `raid.${CHANNEL_ID}`,
      // `radio-events-v1.${CHANNEL_ID}`,
      // `rocket-boost-channel-v1.${CHANNEL_ID}`,
      // `squad-updates.${CHANNEL_ID}`,
      // `stream-change-v1.${CHANNEL_ID}`,
      // `stream-change-by-channel.${CHANNEL_ID}`,
      `stream-chat-room-v1.${CHANNEL_ID}`,
      // `subscribers-csv-v1.${CHANNEL_ID}`,
      `channel-unban-requests.${BOT_ID}.${CHANNEL_ID}`,
      // `user-unban-requests.${CHANNEL_ID}`,
      `upload.${CHANNEL_ID}`,
      // `user-bits-updates-v1.${CHANNEL_ID}`,
      // `user-commerce-events.${CHANNEL_ID}`,
      // `user-crate-events-v1.${CHANNEL_ID}`,
      // `user-drop-events.${CHANNEL_ID}`,
      // `user-moderation-notifications.${CHANNEL_ID}`,
      // `user-preferences-update-v1.${CHANNEL_ID}`,
      // `user-properties-update.${CHANNEL_ID}`,
      // `user-subscribe-events-v1.${CHANNEL_ID}`,
      `video-playback.${CHANNEL_ID}`,
      `video-playback-by-id.${CHANNEL_ID}`,
      // `video-thumbnail-processing.${CHANNEL_ID}`,
      `whispers.${BOT_ID}`,
    ],
    BOT_OAUTH
  );
};
//TIBB_TOKEN
StartListener();