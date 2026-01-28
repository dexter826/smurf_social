importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCNmxniAL5vcKcVJN-PaywlD9uPRRj4DHo",
    authDomain: "smurf-social.firebaseapp.com",
    projectId: "smurf-social",
    storageBucket: "smurf-social.firebasestorage.app",
    messagingSenderId: "517846344524",
    appId: "1:517846344524:web:7ee2038e9ab9d24a41a5e9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
