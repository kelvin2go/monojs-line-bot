'use-strict';
const admin = require('firebase-admin')

let serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (process.env.NODE_ENV === "development") {
  serviceAccount = require('../../.fb_key.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://kelvinho-bb7a9.firebaseio.com'
  })
} else {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
    databaseURL: 'https://kelvinho-bb7a9.firebaseio.com'
  })
}
const settings = {
  timestampsInSnapshots: true
}

const db = admin.firestore()
db.settings(settings)
let usersCollectionRef = db.collection('users')

const FIREBASE = {
  getAllUser: async () => {
    return await usersCollectionRef.get()
  },
  getUser: async (userid) => {
    if (!userid) return 
    return await usersCollectionRef.doc(userid).get()
  },
  updateUser: async (userid) => {
    console.log(userid)
    // array.indexOf(newItem) === -1 ? array.push(newItem)
    // return await 
  },
  addUser: (profile) => {
    if (!profile) return null
    return usersCollectionRef.doc(profile.userId).set(profile);
  }
}

module.exports = FIREBASE
