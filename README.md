https://www.youtube.com/watch?v=YZz3XlxyXaU

有時候遇到大家訂飲料 要找 menu / 大家填單 的 小麻煩
開發了 一個 開DIN 訂飲料 聊天機械人
https://www.youtube.com/watch?v=YZz3XlxyXaU

- mono-js(https://mono.js.org/#/?id=mono) 做 rest api server 
- 串 LINE SDK nodejs <> bot 
- witai(https://wit.ai/) 處理已歸類的字 / 飲料 / 飲料店
- Airtable(https://airtable.com) 做 DB > 飲料 / 飲料店 / 單

![demo](static/din.gif)
[![Video Demo](https://img.youtube.com/vi/YZz3XlxyXaU/0.jpg)](https://www.youtube.com/watch?v=YZz3XlxyXaU)

[![加 開DIN 好友](https://scdn.line-apps.com/n/line_add_friends/btn/zh-Hant.png)](https://line.me/R/ti/p/%40lnl7301g)
![QRcode](./static/din.png)

Github: https://github.com/kelvin2go/monojs-line-bot


# monojs-line-bot

Monojs with line bot

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

API server will listen on [http://localhost:8000](http://localhost:8000) & watch for changes to restart.

## Production

```bash
npm start
```

## Tests

The tests are made with [AVA](https://github.com/avajs/ava), [nyc](https://github.com/istanbuljs/nyc) and [mono-test-utils](https://github.com/terrajs/mono-test-utils) in `test/`:

```bash
npm test
```
