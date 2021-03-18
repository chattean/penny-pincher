// create variable to hold db connection
let db;
// establish a connection to IndexedDB database called 'penny_pincher' and set it to version 1
const request = indexedDB.open("penny_pincher", 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;
  // create an object store (table) called 'offlineObject', set it to have an auto incrementing primary key of sorts
  db.createObjectStore("offlineObject", { autoIncrement: true });
};

// upon a successful
request.onsuccess = function (event) {
  // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run uploadPizza() function to send all local db data to api
  if (navigator.onLine) {
    checkDatabase();
  }
};

request.onerror = function (event) {
  // log error here
  console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new transaction and there's no internet connection
function saveRecord(record) {
  // open a new transaction with the database with read and write permissions
  const transaction = db.transaction(["offlineObject"], "readwrite");

  // access the object store for `offlineObject`
  const memory = transaction.objectStore("offlineObject");

  // add record to your store with add method
  memory.add(record);
}

function checkDatabase() {
  // open a transaction on your db
  const transaction = db.transaction(["offlineObject"], "readwrite");

  // access your object store
  const memory = transaction.objectStore("offlineObject");

  // get all records from store and set to a variable
  const getAll = memory.getAll();

  // upon a successful .getAll() execution, run this function
  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(["offlineObject"], "readwrite");
          // access the offlineObject object store
          const memory = transaction.objectStore("offlineObject");
          // clear all items in your store
          memory.clear();
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener("online", checkDatabase);