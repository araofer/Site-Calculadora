// Configuração e inicialização do Firebase
// SDK modular via CDN (não requer build/bundler)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  connectAuthEmulator,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  connectFirestoreEmulator,
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAXjJbAqvPwnqJg65FXXOjRm8k3_GG-8s",
  authDomain: "calculadora-master-2f96a.firebaseapp.com",
  projectId: "calculadora-master-2f96a",
  storageBucket: "calculadora-master-2f96a.firebasestorage.app",
  messagingSenderId: "776684426011",
  appId: "1:776684426011:web:f9223a6f3d317d3b8939be",
  measurementId: "G-KRDLTF5GBP"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Emuladores apenas no ambiente local.
// Em produção, o site continua usando o Firebase real.
const usarEmuladores = [
  "localhost",
  "127.0.0.1",
  "::1"
].includes(window.location.hostname);

if (usarEmuladores) {
  connectAuthEmulator(
    auth,
    "http://127.0.0.1:9099",
    { disableWarnings: true }
  );

  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
