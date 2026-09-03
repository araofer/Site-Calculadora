// Configuração e inicialização do Firebase
// SDK modular via CDN (não requer build/bundler)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
