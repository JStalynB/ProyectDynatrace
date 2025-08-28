

// ========== API DE DYNATRACE ==========

const apiUrl = 'https://xyc10065.live.dynatrace.com/api/v2/problems?from=now-7d&to=now&problemSelector=status(\"open\")&pageSize=500';
const apiToken = 'dt0c01.CRWQXFVRIB44RW7ZZYDCLGI3.UJXXLEFF7VZHPN26IRVAVTJOURI5B4BSD4TKI7MC2PAHCD6NPDO6Y5IIYJPPNRQ2';


// ========== entorno no productivo ==========
const apiUrlEnP = 'https://xyc10065.live.dynatrace.com/api/v2/problems?from=now-7d&to=now&problemSelector=status(\"open\")&pageSize=500';
const apiTokenEnP = 'dt0c01.CRWQXFVRIB44RW7ZZYDCLGI3.UJXXLEFF7VZHPN26IRVAVTJOURI5B4BSD4TKI7MC2PAHCD6NPDO6Y5IIYJPPNRQ2';


async function fetchProblems() {
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Api-Token ${apiToken}`,
        'accept': 'application/json; charset=utf-8'
      }
    });

    if (response.ok) {
      const data = await response.json();
      handleNewAlerts(data.problems);
      displayProblems(data.problems);
    } else {
      console.error('Error en la solicitud:', response.statusText);
    }
  } catch (error) {
    console.error('Error al obtener los problemas:', error);
  }
}

async function handleNewAlerts(problems) {
  const selectedValues = Array.from(document.getElementById("impactFilter").selectedOptions).map(o => o.value);
  const tableBody = document.querySelector("#alertTable tbody");
  tableBody.innerHTML = "";

  const csvData = await loadCSVData();

  problems
    .filter(p => selectedValues.length === 0 || selectedValues.includes(p.impactLevel))
    .forEach(problem => {
      const row = document.createElement('tr');



      // === Problem ID con enlace ===
      const problemIdCell = document.createElement('td');
      const problemLink = document.createElement('a');
      problemLink.href = `https://xyc10065.live.dynatrace.com/#problemdetails;gtf=-2h;gf=all;pid=${problem.problemId}`;
      problemLink.textContent = problem.displayId;
      problemLink.target = '_blank';
      problemIdCell.appendChild(problemLink);
      row.appendChild(problemIdCell);


      // === Causa y búsqueda de coincidencia ===
      const causeCell = document.createElement('td');
      const affectedNames = (problem.affectedEntities || []).map(e => e.name || e.entityId);
      causeCell.textContent = affectedNames.join(', ');
      row.appendChild(causeCell);

      // === Buscar coincidencia con el CSV ===
      const affectedBaseNames = affectedNames.map(n => n.split('.')[0].toLowerCase());
      const match = csvData.find(d =>
        d["Nombre Componente"] &&
        affectedBaseNames.includes(d["Nombre Componente"].toLowerCase())
      );

      const titleCell = document.createElement('td');
      titleCell.textContent = problem.title;
      row.appendChild(titleCell);

      const startTimeCell = document.createElement('td');
      startTimeCell.textContent = new Date(problem.startTime).toLocaleString();
      row.appendChild(startTimeCell);


      const extraInfoCell = document.createElement('td');
      if (match) {
        extraInfoCell.innerHTML = `
          <strong>Torre:</strong> ${match["Torre"] || 'N/A'}<br>
          <strong>Componente:</strong> ${match["Nombre Componente"] || 'N/A'}<br>
          <strong>Tipo:</strong> ${match["Tipo de evento"] || 'N/A'}<br>
          <strong>Descripción:</strong> ${match["Descripción Error"] || 'N/A'}<br>
          <strong>Id Conocimiento:</strong> ${match["Id Conocimiento"] || 'N/A'}<br>         
        `;
      } else {
        extraInfoCell.textContent = 'No soportado como N1';
      }
      row.appendChild(extraInfoCell);

      tableBody.appendChild(row);

      // ==========================
      // Enriquecimiento csv torres test
      // ==========================

      const torreResolutora = document.createElement('td');

      // Buscar todas las coincidencias en Inventario Torres.csv
      let torresCoincidentes = [];
      if (affectedBaseNames.length && window.inventarioTorres) {
        torresCoincidentes = window.inventarioTorres.filter(d =>
          d["Nombre componente/instancia"] &&
          affectedBaseNames.includes(d["Nombre componente/instancia"].toLowerCase())
        );
      }

      if (torresCoincidentes.length > 0) {
        const torresHTML = torresCoincidentes.map(item => `
    <strong>Torre:</strong> ${item["TORRE"] || 'N/A'}<br>
    <strong>Componente:</strong> ${item["Nombre componente/instancia"] || 'N/A'}<br><br>
  `).join('');

        torreResolutora.innerHTML = torresHTML;
      } else {
        torreResolutora.textContent = 'no administrado';
      }

      row.appendChild(torreResolutora);
      tableBody.appendChild(row);



            // comentarios

      const commentsCell = document.createElement('td');
      const commentsUrl = `https://xyc10065.live.dynatrace.com/api/v2/problems/${problem.problemId}/comments`;
      fetch(commentsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Api-Token ${apiToken}`,
          'accept': 'application/json; charset=utf-8'
        }
      })
        .then(res => res.json())
        .then(data => {
          commentsCell.innerHTML = (data.comments || []).map(c =>
            `<span class="comment">${c.content || c.text || c.message}</span>`
          ).join('') || 'Sin comentarios';
        })
        .catch(error => {
          commentsCell.textContent = 'Error al cargar comentarios';
        });
      row.appendChild(commentsCell);

      // ==========================
    });

//  if (problems.length > 0) playAudioAlert();
}

// ==========================
// playAudioAlert
// ==========================

// function playAudioAlert() {
//   const audio = document.getElementById("alertSound");
//   if (audio) audio.play().catch(e => console.error("Error al reproducir audio:", e));
// }




// ==========================
// Lectura de CSV
// ==========================

function readCSV() {
  fetch('data/data.csv')
    .then(response => response.text())
    .then(csv => {
      const rows = csv.split(/\r?\n(?=(?:[^"]*"[^"]*")*[^"]*$)/).filter(r => r.trim() !== '');
      const table = document.getElementById('csvTable');
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      tbody.innerHTML = '';

      const headers = rows[0].split(';');
      const headerRow = document.createElement('tr');
      headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h.trim();
        headerRow.appendChild(th);
      });
      thead.innerHTML = '';
      thead.appendChild(headerRow);

      rows.slice(1).forEach(rowText => {
        const row = document.createElement('tr');
        const cells = rowText.split(/;(?![^\"]*\"[^\"]*(?:\"[^\"]*\"[^\"]*)*$)/);
        cells.forEach(cell => {
          const td = document.createElement('td');
          td.textContent = cell.replaceAll('"', '').trim();
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
    });
}


// ==========================
// Cargar y parsear CSV a objeto
// ==========================
async function loadCSVData() {
  const response = await fetch('data/data.csv');
  const text = await response.text();

  const rows = text.split(/\r?\n(?=(?:[^"]*"[^"]*")*[^"]*$)/).filter(r => r.trim() !== '');
  const headers = rows[0].split(';').map(h => h.trim());

  //declaración de un array cuando hay más de una fila
  const data = [];
  rows.slice(1).forEach(row => {
    const cells = row.split(';').map(cell => cell.replaceAll('"', '').trim());
    const rowData = {};
    headers.forEach((h, i) => rowData[h] = cells[i]);

    // === Dividir si hay múltiples componentes en una sola celda ===
    const componentes = (rowData["Nombre Componente"] || "").split(/\r?\n/).map(c => c.trim()).filter(Boolean);

    componentes.forEach(componente => {
      const cloned = { ...rowData, "Nombre Componente": componente };
      data.push(cloned);
    });
  });
  return data;
}


function readCSV() {
  fetch('data/data.csv')
    .then(response => response.text())

   
}


async function loadInventarioTorresCSV() {
  const response = await fetch('data/Inventario Torres.csv');
  const text = await response.text();

  const rows = text.split(/\r?\n(?=(?:[^"]*"[^"]*")*[^"]*$)/).filter(r => r.trim() !== '');
  const headers = rows[0].split(';').map(h => h.trim());
  const data = rows.slice(1).map(row => {
    const cells = row.split(';').map(cell => cell.replaceAll('"', '').trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i]);
    return obj;
  });
  return data;
}

// Mostrar/ocultar panel lateral
const searchIcon = document.getElementById('searchIcon');
const searchPanel = document.getElementById('searchPanel');

searchIcon.addEventListener('click', () => {
  searchPanel.classList.toggle('active');
});

// Evento de búsqueda
document.getElementById('searchBtn').addEventListener('click', async () => {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const resultDiv = document.getElementById('searchResult');

  // Limpiar resaltado anterior
  document.querySelectorAll('#alertTable tbody tr').forEach(row => {
    row.classList.remove('highlight-row');
  });

  if (!query) {
    resultDiv.innerHTML = '<p>Ingrese un término para buscar.</p>';
    return;
  }

  const csvData = await loadCSVData();
  const matches = csvData.filter(d =>
    d["Nombre Componente"] &&
    d["Nombre Componente"].toLowerCase().includes(query)
  );

  if (matches.length > 0) {
    resultDiv.innerHTML = `
      <h3>Resultados para: ${query}</h3>
      ${matches.map(item => `
        <div>
          <strong>Componente:</strong> ${item["Nombre Componente"] || 'N/A'}<br>
          <strong>Torre:</strong> ${item["Torre"] || 'N/A'}<br>
          <strong>Tipo:</strong> ${item["Tipo de evento"] || 'N/A'}<br>
          <strong>Descripción:</strong> ${item["Descripción Error"] || 'N/A'}<br>
          <strong>Solución:</strong> ${item["Solución"] || 'N/A'}<br>
          <strong>Id Conocimiento:</strong> ${item["Id Conocimiento"] || 'N/A'}<br>
        </div>
      `).join('')}
    `;

    // Resaltar filas en la tabla que tengan coincidencias
    const affectedRows = document.querySelectorAll('#alertTable tbody tr');
    affectedRows.forEach(row => {
      const rowText = row.textContent.toLowerCase();
      if (matches.some(item => rowText.includes(item["Nombre Componente"].toLowerCase()))) {
        row.classList.add('highlight-row');
      }
    });

  } else {
    resultDiv.innerHTML = `<p>No se encontró información para <strong>${query}</strong>.</p>`;
  }

// Cargar inventario torres
const inventariocsvData = await loadInventarioTorresCSV();
const matchesinv = inventariocsvData.filter(d =>
  d["Nombre componente/instancia"] &&
  d["Nombre componente/instancia"].toLowerCase().includes(query.toLowerCase())
);

if (matchesinv.length > 0) {
  resultDiv.innerHTML += `
    <h3>Resultados en Inventario Torres para: ${query}</h3>
    ${matchesinv.map(item => `
      <div>
        <strong>Torre:</strong> ${item["TORRE"] || 'N/A'}<br>
        <strong>Componente:</strong> ${item["Nombre componente/instancia"] || 'N/A'}<br><br>
      </div>
    `).join('')}
  `;

  // Resaltar filas en la tabla que tengan coincidencias
  const affectedRows = document.querySelectorAll('#alertTable tbody tr');
  affectedRows.forEach(row => {
    const rowText = row.textContent.toLowerCase();
    if (matchesinv.some(item => rowText.includes(item["Nombre componente/instancia"].toLowerCase()))) {
      row.classList.add('highlight-row');
    }
  });
} else {
  resultDiv.innerHTML += `<p>No se encontró información en Inventario Torres para <strong>${query}</strong>.</p>`;
}
   
  
});



window.onload = async () => {
  fetchProblems();
  readCSV();

  window.inventarioTorres = await loadInventarioTorresCSV();

  setInterval(fetchProblems, 10000);
};

document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', () => {
    updateFilters();
    fetchProblems();
  });
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const table = document.getElementById('problemsTable');
  const workbook = XLSX.utils.table_to_book(table, { sheet: "Problemas Dynatrace" });
  XLSX.writeFile(workbook, "dynatrace_problems.xlsx");
});

