
const sizes = ['small', 'medium', 'large'];
const numInputsPerSize = [300, 300, 300];
// const broken_files = ['large-135', 'medium-219', 'large-219', 'large-218', 'large-208', 'large-224', 'medium-225', 'large-235']

let teamSet = new Set();
let firebaseData = null;
var dict = {}

async function getFirebaseData() {
    const response = await fetch('https://www.dropbox.com/s/6bnhgv9qk59z2au/cs170-project-spring-2021-default-rtdb-export.json?dl=1');
    const data = await response.json();
    console.log(data['teams']);
    return data;
}

async function loadTeams() {
  teamSet = new Set();
  if (firebaseData == null) {
      firebaseData = await getFirebaseData();
  }
  for (let key in firebaseData['leaderboard']) {
    const item = firebaseData['leaderboard'][key];
    teamSet.add(item["leaderboard_name"]);
  }
  return teamSet;
}

async function loadAutocomplete(input) {
  if (!teamSet.size) {
    teams = await loadTeams();
    console.warn("Teams not loaded, check pullLeaderboard functions.");
  }
  new Awesomplete(input, {list: Array.from(teamSet)});
}


function round(x) {
    return Math.round((x + Number.EPSILON) * 10000) / 10000;
}

async function pullLeaderboard(graphName) {
    if (firebaseData == null) {
        firebaseData = await getFirebaseData();
    }

    const entries = [];

    for (let key in firebaseData['leaderboard']) {
        const entry = firebaseData['leaderboard'][key];
        if (entry['input'] == graphName) {
            entries.push([entry['leaderboard_name'], round(entry['score'])]);
        }
    }
    return entries.sort((elem1, elem2) => elem2[1] - elem1[1]);
}

async function pullFullLeaderboard(firebase) {
    if (firebaseData == null) {
        firebaseData = await getFirebaseData();
    }

    const leaderboards = {};

    for (let key in firebaseData['leaderboard']) {
        const entry = firebaseData['leaderboard'][key];
        const name = entry['leaderboard_name'];
        const score = round(entry['score']);
        const inputName = entry['input'];
        if (!leaderboards.hasOwnProperty(inputName)) {
            leaderboards[inputName] = [];
        }
        leaderboards[inputName].push([name, score]);
    }
    return leaderboards;
}

async function computeFullLeaderboard() {
    const leaderboards = await pullFullLeaderboard();
    const namesAndRanks = {};
    let totalInputs = 0;
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      for (let j = 1; j <= numInputsPerSize[i]; j++) {
        const graphName = `${size}-${j}`;
        // if (broken_files.includes(graphName)) {continue;}
        const leaderboard = leaderboards[graphName].sort((elem1, elem2) => elem2[1] - elem1[1]);
        const ranks = getRanks(leaderboard);
        for (let i = 0; i < leaderboard.length; i++) {
          entry = leaderboard[i];
          name = entry[0];
          score = entry[1];

          if (!namesAndRanks.hasOwnProperty(name)) {
            namesAndRanks[name] = [];
          }

          namesAndRanks[name].push([graphName, ranks[i]]);
        }
        totalInputs++;
      }
    }
    const finalEntries = [];
    const not_full_outputs = [];
    for (let name in namesAndRanks) {
      const base_scores = namesAndRanks['Welcome_To_The_Leaderboard'];
      const scores = namesAndRanks[name];
      test = scores;
      if (scores.length == totalInputs) {
        const average = scores.reduce((a, b) => a + b[1], 0) / totalInputs;
        finalEntries.push([name, round(average)]);
      } else {
        not_full_outputs.push(name);
        var score = 0;
        for (let i = 0; i < base_scores.length; i++) {
          var found = false;
          for (let j = 0; j < scores.length; j++) {
            if (base_scores[i][0] === scores[j][0]) {
              score = score + scores[j][1];
              found = true;
            }
          }
          if (!found) {
            score = score + base_scores[i][1];
          }
        }
        const average = score / totalInputs;
        finalEntries.push([name, round(average)]);
      }
    }
    return [namesAndRanks, finalEntries.sort((elem1, elem2) => elem1[1] - elem2[1])];
}

function getRanks(sortedEntries) {
    let currentRank = 0;
    let prevValue = -1;

    const ranks = [];

    for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];

        if (entry[1] != prevValue) {
          currentRank = i + 1;
          prevValue = entry[1];
        }
        ranks.push(currentRank);
    }
    return ranks;
}

function formatTable(sortedEntries, header, addRanks) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerElements = [];
  header.forEach((elem) => headerElements.push(`<th>${elem}</th>`));
  thead.innerHTML = headerElements.join('\n');
  table.appendChild(thead);
  table.className = 'table';
  let ranks = null;
  if (addRanks) {
      ranks = getRanks(sortedEntries);
  }
  for (let i = 0; i < sortedEntries.length; i++) {
      const row = document.createElement('tr');
      var currentRank = 0
      entry = sortedEntries[i];
      if (addRanks) {
        currentRank = ranks[i];
        dict[entry[0]] = currentRank
        const rank = document.createElement('th');
        rank.innerHTML = currentRank;
        row.appendChild(rank);
      }
      for (let j = 0; j < entry.length; j++) {
          const elem = document.createElement('td');
          elem.innerHTML = entry[j];
          row.appendChild(elem);
      }
      table.appendChild(row);
  }
  // console.log(dict)
  return table;
}

function createLeaderboard(leaderboardEntries, header, title) {
  for (let i = 0; i < leaderboardEntries.length; i++) {
    const entry = leaderboardEntries[i];
    entry[0] = `<span class="team-link"><a onclick="moveToTeam('${entry[0]}')">${entry[0]}</a></span>`;
  }
  document.getElementById('table-title').innerHTML = title;
  document.getElementById('table').appendChild(
    formatTable(leaderboardEntries, header, true)
  );
}

function createTeamView(teamEntries, teamName) {
  for (let i = 0; i < teamEntries.length; i++) {
    const entry = teamEntries[i];
    entry[0] = `<span class="leaderboard-link"><a onclick="moveToLeaderboard('${entry[0]}')">${entry[0]}</a></span>`;
  }
  document.getElementById('table-title').innerHTML = `Team <code>${teamName}</code>`;
  document.getElementById('table').appendChild(
    formatTable(teamEntries, ["Input Name", "Rank"], false)
  );
}

async function generateRanksForTeam(teamName) {
  fullLeaderboardResults = await computeFullLeaderboard();
  namesAndRanks = fullLeaderboardResults[0];
  return namesAndRanks.hasOwnProperty(teamName) ? namesAndRanks[teamName] : null;
}

async function generateTeamView(teamName) {
   const entries = await generateRanksForTeam(teamName);
   document.getElementById("table").innerHTML = '';
   if (entries == null) {
     const div = document.createElement('h1');
     div.innerHTML = 'Invalid team name';
     div.className = 'invalid';
     document.getElementById("table").appendChild(div);
   } else {
     createTeamView(entries, teamName);
   }
}

async function generateLeaderboard(graphName) {
    let entries = null;
    let header = null;
    let title = null;
    if (graphName === null) {
      fullLeaderboardResults = await computeFullLeaderboard();
      entries = fullLeaderboardResults[1];
      header = ["#", "Team Name", "Average Rank"];
      title = "";
    } else {
      entries = await pullLeaderboard(graphName);
      if (entries.length > 0) {
        header = ["#", "Team Name", "Happiness"];
        title = `<code>${graphName}.in</code>`;
      } else {
        header = [];
        title = "";
      }
    }
    document.getElementById("table").innerHTML = '';
    if (entries.length == 0) {
      const div = document.createElement('h1');
      div.innerHTML = 'Invalid input name';
      div.className = 'invalid';
      document.getElementById("table").appendChild(div);
    } else {
      createLeaderboard(entries, header, title);
    }
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    return null;
}
