const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// Store all users retrieved from the API.
let allUsers = [];

// Remember whether users have been loaded successfully.
let usersLoaded = false;

// Display a list of users on the page.
function renderUsers(list) {
  usersList.innerHTML = "";

  if (list.length === 0) {
    if (usersLoaded) {
      statusText.textContent = "No users match your filter.";
    }

    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");

    const name = document.createElement("h2");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    li.appendChild(name);
    li.appendChild(email);
    li.appendChild(city);
    li.appendChild(company);

    usersList.appendChild(li);
  });
}

// Fetch users from the API.
async function loadUsers() {
  statusText.textContent = "Loading users...";
  loadButton.disabled = true;
  usersLoaded = false;

  usersList.innerHTML = "";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const users = await response.json();

    // Save the users so filtering does not require another request.
    allUsers = users;
    usersLoaded = true;

    // Display all users initially.
    renderUsers(allUsers);

    statusText.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    statusText.textContent =
      "Could not load users. Please try again.";

    console.error("Error loading users:", error);
  } finally {
    loadButton.disabled = false;
  }
}

// Load users when the button is clicked.
loadButton.addEventListener("click", loadUsers);

// Filter the stored users whenever the input changes.
filterInput.addEventListener("input", () => {
  const searchText = filterInput.value.trim().toLowerCase();

  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchText)
  );

  renderUsers(filteredUsers);
});

// Load users automatically when the page opens.
loadUsers();