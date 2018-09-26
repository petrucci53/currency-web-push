let applicationServerPublicKey = null;
const socket = io.connect('https://furkangencer.me/');

socket.on('connect', function() {
    console.log('Connected to server');
});

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});

socket.on('publicKey', function(msg) {
    applicationServerPublicKey = msg;
});

const pushButton = document.querySelector('.js-push-btn');
const showPushViaServerButton = document.querySelector('.show-push-server-btn');
const showPushViaBrowserButton = document.querySelector('.show-push-browser-btn');

let isSubscribed = false;
let swRegistration = null;

function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function initializeUI() {
    pushButton.addEventListener('click', () => {
        pushButton.disabled = true;
        if (isSubscribed) {
            unsubscribeUser();
        } else {
            subscribeUser();
        }
    });

    showPushViaServerButton.addEventListener('click', () => {
        var options = {
            title: "deneme",
            body: 'Here is a notification body!',
            icon: 'images/example.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1,
                url: 'https://www.google.com',
                firstButton: 'https://www.apple.com',
                secondButton: 'https://www.tesla.com',
            },
            actions: [
                {action: 'firstButton',title: 'Apple',
                    icon: 'images/checkmark.png'},
                {action: 'secondButton', title: 'Tesla',
                    icon: 'images/xmark.png'},
            ]
        };
        displayNotificationViaServer(options);
    });

    showPushViaBrowserButton.addEventListener('click', () => {
        displayNotification();
    });

    // Set the initial subscription value
    swRegistration.pushManager.getSubscription()
        .then((subscription) => {
            isSubscribed = !(subscription === null);

            updateSubscriptionOnServer(subscription);

            if (isSubscribed) {
                console.log('User IS subscribed.', subscription);
            } else {
                console.log('User is NOT subscribed.');
            }

            updateBtn();
        });
}

function updateBtn() {
    if (Notification.permission === 'denied') {
        pushButton.textContent = 'Push Messaging Blocked.';
        pushButton.disabled = true;
        updateSubscriptionOnServer(null);
        return;
    }

    if (isSubscribed) {
        pushButton.textContent = 'Disable Push Messaging';
    } else {
        pushButton.textContent = 'Enable Push Messaging';
    }

    pushButton.disabled = false;
}

function subscribeUser() {
    const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
    swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
    })
        .then((subscription) => {
            console.log('User is subscribed.');

            updateSubscriptionOnServer(subscription);

            isSubscribed = true;

            updateBtn();
        })
        .catch((err) => {
            console.log('Failed to subscribe the user: ', err);
            updateBtn();
        });
}

function unsubscribeUser() {
    swRegistration.pushManager.getSubscription()
        .then((subscription) => {
            if (subscription) {
                // TODO: Tell application server to delete subscription
                return subscription.unsubscribe();
            }
        })
        .catch((error) => {
            console.log('Error unsubscribing', error);
        })
        .then(() => {
            updateSubscriptionOnServer(null);

            console.log('User is unsubscribed.');
            isSubscribed = false;

            updateBtn();
        });
}

function updateSubscriptionOnServer(subscription) {

    const subscriptionJson = document.querySelector('.js-subscription-json');
    const subscriptionDetails =
        document.querySelector('.js-subscription-details');

    if (subscription) {
        socket.emit('subscribe', subscription, function () {
            console.log("User has subscribed");
        });
        subscriptionJson.textContent = JSON.stringify(subscription);
        subscriptionDetails.classList.remove('is-invisible');
    } else {
        subscriptionDetails.classList.add('is-invisible');
    }
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');

    navigator.serviceWorker.register('sw.js')
        .then((swReg) => {
            console.log('Service Worker is registered', swReg);

            swRegistration = swReg;
            initializeUI();
        })
        .catch((error) => {
            console.error('Service Worker Registration Error', error);
        });
} else {
    console.warn('Push messaging is not supported');
    pushButton.textContent = 'Push Not Supported';
}

function displayNotification() {
    if (Notification.permission === 'granted') {
        if(swRegistration){
            var options = {
                body: 'Here is a notification body!',
                icon: 'images/example.png',
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: 1,
                    url: 'https://www.google.com',
                    firstButton: 'https://www.apple.com',
                    secondButton: 'https://www.tesla.com',
                },
                actions: [
                    {action: 'firstButton',title: 'Apple',
                        icon: 'images/checkmark.png'},
                    {action: 'secondButton', title: 'Tesla',
                        icon: 'images/xmark.png'},
                ]
            };
            swRegistration.showNotification('Hello world!', options);
            //Notice the showNotification method is called on the service worker registration object.
            // This creates the notification on the active service worker, so that events triggered by interactions with the notification are heard by the service worker.
        }
    } else if (Notification.permission === "denied") {
        console.log("The user has previously denied push. Can't reprompt.");
    } else {
        console.log("Permission is not granted.");
    }
}

function displayNotificationViaServer(payload="Test") {
    swRegistration.pushManager.getSubscription().then((subscription) => {
        if(subscription){
            socket.emit('triggerPush', { subscription, payload }, function () {
                console.log("Push triggered");
            })
        }
    });
}