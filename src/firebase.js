import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCfrhv9C4wotZflOwHyMlvJ20xHo8ou1aY",
  authDomain: "trade-journal-26.firebaseapp.com",
  projectId: "trade-journal-26",
  storageBucket: "trade-journal-26.firebasestorage.app",
  messagingSenderId: "357267871578",
  appId: "1:357267871578:web:a665dc7f744de943fa8563",
  measurementId: "G-3TCEWB35Q6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;