'use-strict';
const admin = require('firebase-admin')

admin.initializeApp({
  credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
})
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
