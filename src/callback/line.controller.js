"use strict";
const line = require('@line/bot-sdk');
const weather = require('../weather/weather.controller.js')

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
console.log(config)
console.log(process.env)
// base URL for webhook server
const baseURL = process.env.BASE_URL;

// create LINE SDK client
const client = new line.Client(config);

const LINE = {
  middleware: () => {
    return line.middleware(config)
  },
  // simple reply function
  replyText: (token, texts) => {
    texts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
      token,
      texts.map((text) => ({ type: 'text', text }))
    );
  },
  handleText: async (message, replyToken, source) => {
    const buttonsImageURL = `${baseURL}/static/buttons/1040.jpg`;
    switch (message.text) {
      case 'weather': {
        if (source.userId) {
          const weatherInfo = await weather.getWeather()
          const weatherStr = weather.toString(weatherInfo)
          console.log(weatherStr)
          return LINE.replyText(
            replyToken,
            [
              `天氣注意:\n${weatherStr.warning}`,
              `最近地震:\n${weatherStr.earthquake}`
            ]
          )
        } else {
          return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
        }
      }
      case 'profile':
        if (source.userId) {
          return client.getProfile(source.userId)
          .then((profile) => LINE.replyText(
            replyToken,
            [
              `Display name: ${profile.displayName}`,
              `Status message: ${profile.statusMessage}`,
            ]
          ));
        } else {
          return LINE.replyText(replyToken, 'Bot can\'t use profile API without user ID');
        }
      case 'buttons':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Buttons alt text',
            template: {
              type: 'buttons',
              thumbnailImageUrl: buttonsImageURL,
              title: 'My button sample',
              text: 'Hello, my button',
              actions: [
                { label: 'Go to line.me', type: 'uri', uri: 'https://line.me' },
                { label: 'Say hello1', type: 'postback', data: 'hello こんにちは' },
                { label: '言 hello2', type: 'postback', data: 'hello こんにちは', text: 'hello こんにちは' },
                { label: 'Say message', type: 'message', text: 'Rice=米' },
              ],
            },
          }
        );
      case 'confirm':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Confirm alt text',
            template: {
              type: 'confirm',
              text: 'Do it?',
              actions: [
                { label: 'Yes', type: 'message', text: 'Yes!' },
                { label: 'No', type: 'message', text: 'No!' },
              ],
            },
          }
        )
      case 'carousel':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Carousel alt text',
            template: {
              type: 'carousel',
              columns: [
                {
                  thumbnailImageUrl: buttonsImageURL,
                  title: 'hoge',
                  text: 'fuga',
                  actions: [
                    { label: 'Go to line.me', type: 'uri', uri: 'https://line.me' },
                    { label: 'Say hello1', type: 'postback', data: 'hello こんにちは' },
                  ],
                },
                {
                  thumbnailImageUrl: buttonsImageURL,
                  title: 'hoge',
                  text: 'fuga',
                  actions: [
                    { label: '言 hello2', type: 'postback', data: 'hello こんにちは', text: 'hello こんにちは' },
                    { label: 'Say message', type: 'message', text: 'Rice=米' },
                  ],
                },
              ],
            },
          }
        );
      case 'image carousel':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Image carousel alt text',
            template: {
              type: 'image_carousel',
              columns: [
                {
                  imageUrl: buttonsImageURL,
                  action: { label: 'Go to LINE', type: 'uri', uri: 'https://line.me' },
                },
                {
                  imageUrl: buttonsImageURL,
                  action: { label: 'Say hello1', type: 'postback', data: 'hello こんにちは' },
                },
                {
                  imageUrl: buttonsImageURL,
                  action: { label: 'Say message', type: 'message', text: 'Rice=米' },
                },
                {
                  imageUrl: buttonsImageURL,
                  action: {
                    label: 'datetime',
                    type: 'datetimepicker',
                    data: 'DATETIME',
                    mode: 'datetime',
                  },
                },
              ]
            },
          }
        );
      case 'datetime':
        return client.replyMessage(
          replyToken,
          {
            type: 'template',
            altText: 'Datetime pickers alt text',
            template: {
              type: 'buttons',
              text: 'Select date / time !',
              actions: [
                { type: 'datetimepicker', label: 'date', data: 'DATE', mode: 'date' },
                { type: 'datetimepicker', label: 'time', data: 'TIME', mode: 'time' },
                { type: 'datetimepicker', label: 'datetime', data: 'DATETIME', mode: 'datetime' },
              ],
            },
          }
        );
      case 'imagemap':
        return client.replyMessage(
          replyToken,
          {
            type: 'imagemap',
            baseUrl: `${baseURL}/static/rich`,
            altText: 'Imagemap alt text',
            baseSize: { width: 1040, height: 1040 },
            actions: [
              { area: { x: 0, y: 0, width: 520, height: 520 }, type: 'uri', linkUri: 'https://store.line.me/family/manga/en' },
              { area: { x: 520, y: 0, width: 520, height: 520 }, type: 'uri', linkUri: 'https://store.line.me/family/music/en' },
              { area: { x: 0, y: 520, width: 520, height: 520 }, type: 'uri', linkUri: 'https://store.line.me/family/play/en' },
              { area: { x: 520, y: 520, width: 520, height: 520 }, type: 'message', text: 'URANAI!' },
            ],
          }
        );
      case 'bye': {
        switch (source.type) {
          case 'user':
            return LINE.replyText(replyToken, 'Bot can\'t leave from 1:1 chat');
          case 'group':
            return LINE.replyText(replyToken, 'Leaving group')
              .then(() => client.leaveGroup(source.groupId));
          case 'room':
            return LINE.replyText(replyToken, 'Leaving room')
              .then(() => client.leaveRoom(source.roomId));
        }
      }
      break;
      default: {
        console.log(`Echo message to ${replyToken}: ${message.text}`);
        return LINE.replyText(replyToken, message.text);
      }
    }
  },

  handleEvent: (event) => {
    switch (event.type) {
      case 'message': {
        const message = event.message
        switch (message.type) {
          case 'text':
            return LINE.handleText(message, event.replyToken, event.source);
          // case 'image':
          //   return handleImage(message, event.replyToken);
          // case 'video':
          //   return handleVideo(message, event.replyToken);
          // case 'audio':
          //   return handleAudio(message, event.replyToken);
          // case 'location':
          //   return handleLocation(message, event.replyToken);
          // case 'sticker':
          //   return handleSticker(message, event.replyToken);
          default:
            throw new Error(`Unknown message: ${JSON.stringify(message)}`);
        }
      }
      case 'follow': {
        return LINE.replyText(event.replyToken, 'Got followed event');
      }

      case 'unfollow': {
        return console.log(`Unfollowed this bot: ${JSON.stringify(event)}`);
      }
      case 'join': {
        return LINE.replyText(event.replyToken, `Joined ${event.source.type}`);
      }
      case 'leave': {
        return console.log(`Left: ${JSON.stringify(event)}`);
      }
      case 'postback': {
        let data = event.postback.data;
        if (data === 'DATE' || data === 'TIME' || data === 'DATETIME') {
          data += `(${JSON.stringify(event.postback.params)})`;
        }
        return LINE.replyText(event.replyToken, `Got postback: ${data}`);
      }
      case 'beacon': {
        return LINE.replyText(event.replyToken, `Got beacon: ${event.beacon.hwid}`);
      }
      default: {
        throw new Error(`Unknown event: ${JSON.stringify(event)}`);
      }
    }
  }
}

module.exports = LINE
