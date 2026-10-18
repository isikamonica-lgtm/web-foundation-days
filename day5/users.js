// API endpoint
const USERS_URL = "https://jsonplaceholder.typicode.com/users";

// Select HTML elements
const loadBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const list = document.querySelector("#users-list");

// Store the users returned by the API
let users = [];

// Display users on the webpage
function renderUsers(usersToShow) {
  list.innerHTML = "";

  if (usersToShow.length === 0) {
    const li = document.createElement("li");

    li.textContent = users.length
      ? "No users match your filter."
      : "No users loaded yet.";

    list.appendChild(li);
    return;
  }

  usersToShow.forEach((user) => {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const details = document.createElement("p");

    details.textContent =
      `${user.email} · ${user.address.city} · ${user.company.name}`;

    li.append(name, details);
    list.appendChild(li);
  });
}

// Fetch users from the API
async function loadUsers() {
  statusText.textContent = "Loading users...";
  loadBtn.disabled = true;

  try {
    const response = await fetch(USERS_URL);

    // Check whether the server returned a successful status
    if (!response.ok) {
      throw new Error(
        `Server responded with status ${response.status}`
      );
    }

    // Convert the JSON response into JavaScript data
    users = await response.json();

    // Display the users
    renderUsers(users);

    // Show the success message
    statusText.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    console.error("Could not load users:", error);

    statusText.textContent =
      "Could not load users. Please try again.";
  } finally {
    // Re-enable the button whether the request succeeds or fails
    loadBtn.disabled = false;
  }
}

// Filter users by name without making another API request
function applyFilter() {
  const searchText = filterInput.value.trim().toLowerCase();

  const matchingUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchText)
  );

  renderUsers(matchingUsers);

  // Do not replace the status message before users have loaded
  if (users.length === 0) {
    return;
  }

  if (matchingUsers.length === 0) {
    statusText.textContent = "No users match your filter.";
  } else {
    statusText.textContent =
      `Showing ${matchingUsers.length} of ${users.length} users.`;
  }
}

// Listen for the Load Users button click
loadBtn.addEventListener("click", loadUsers);

// Listen for changes in the filter box
filterInput.addEventListener("input", applyFilter);