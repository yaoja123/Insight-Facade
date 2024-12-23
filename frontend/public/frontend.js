document.getElementById("professor").addEventListener("click", findProfessors);
document.getElementById("booster").addEventListener("click", findGPABoosters);

function findProfessors(event) {
  event.preventDefault();
  // query set up
  var department = document.getElementById("department").value;
  var course = document.getElementById("course").value;
  var rawQuery = {
    "WHERE": {
      "AND": [
        {
          "IS": {
            "courses_dept": department
          }
        },
        {
          "IS": {
            "courses_id": course
          }
        }
      ]
    },
    "OPTIONS": {
      "COLUMNS": [
        "courses_dept",
        "courses_id",
        "courses_instructor",
        "overallAvg"
      ],
      "ORDER": {
        "dir": "DOWN",
        "keys": [
          "overallAvg"
        ]
      }
    },
    "TRANSFORMATIONS": {
      "GROUP": [
        "courses_dept",
        "courses_id",
        "courses_instructor"
      ],
      "APPLY": [
        {
          "overallAvg": {
            "AVG": "courses_avg"
          }
        }
      ]
    }
  };
  var query = JSON.stringify(rawQuery);
  callToAPI('http://localhost:4321/query', query);
}

function findGPABoosters(event) {
  event.preventDefault();
  // query set up
  var department = document.getElementById("departmentID").value;
  console.log("reach 78");
  console.log(department);
  var rawQuery = {
    WHERE: {
      AND: [
        {
          IS: {
            courses_dept: department
          }
        }
      ]
    },
    OPTIONS: {
      COLUMNS: [
        "courses_dept",
        "courses_id",
        "courses_title",
        "overallAvg"
      ],
      ORDER: {
        dir: "DOWN",
        keys: [
          "overallAvg"
        ]
      }
    },
    TRANSFORMATIONS: {
      GROUP: [
        "courses_dept",
        "courses_id",
        "courses_title"
      ],
      APPLY: [
        {
          overallAvg: {
            AVG: "courses_avg"
          }
        }
      ]
    }
  };
  var query = JSON.stringify(rawQuery);
  callToAPI('http://localhost:4321/query', query);
}
// call to api
async function callToAPI(url = '', data = {}) {
  console.log("reach api call");
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/JSON'
    },
    body: data
  });
  console.log("done with call");
  // return  makeTable(response.json());
  return makeTable();
}

// Display the result
// Citation: https://www.encodedna.com/javascript/populate-json-data-to-html-table-using-javascript.htm
function makeTable() {
  const result = [{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"greif, chen","overallAvg":80.2},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"eiselt, kurt","overallAvg":76.87},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"mcgrenere, joanna","overallAvg":76.81},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"carter, paul martin","overallAvg":75.4},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"kiczales, gregor","overallAvg":75.12},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"wolfman, steven","overallAvg":74.79},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"garcia, ronald","overallAvg":74.33},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"","overallAvg":74.06},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"berg, celina","overallAvg":72.72},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"allen, meghan","overallAvg":72.47},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"aiello, william","overallAvg":71.02},{"courses_dept":"cpsc","courses_id":"110","courses_instructor":"little, james joseph","overallAvg":69.98}]
  let col = [];
  for (let i = 0; i < result.length; i++) {
    for (let key in result[i]) {
      if (col.indexOf(key) === -1) {
        col.push(key);
      }
    }
  }
  const table = document.createElement("table");
  let tr = table.insertRow(-1);
  for (let i = 0; i < col.length; i++) {
    let th = document.createElement("th");
    th.innerHTML = col[i];
    tr.appendChild(th);
  }
  for (let i = 0; i < result.length; i++) {
    tr = table.insertRow(-1);
    for (let j = 0; j < col.length; j++) {
      let tabCell = tr.insertCell(-1);
      tabCell.innerHTML = result[i][col[j]];
    }
  }
  const showTable = document.getElementById('show');
  showTable.innerHTML = "";
  showTable.appendChild(table);
}
