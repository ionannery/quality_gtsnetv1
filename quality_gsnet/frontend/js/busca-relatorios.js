// Exemplo de busca e exibição de relatórios por UL e data
async function buscarRelatorios(ulCode, data) {
  // Monta a query string
  const params = new URLSearchParams();
  if (ulCode) params.append('ulCode', ulCode);
  if (data) params.append('date', data);

  // Faz a requisição AJAX
  const response = await fetch(`/api/list-reports?${params.toString()}`);
  const relatorios = await response.json();

  // Exemplo de exibição dos resultados (pode adaptar para sua UI)
  const lista = document.getElementById('lista-relatorios');
  lista.innerHTML = '';
  if (relatorios.length === 0) {
    lista.innerHTML = '<li>Nenhum relatório encontrado.</li>';
    return;
  }
  relatorios.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `
      <b>UL:</b> ${r.ulCode} | <b>Data:</b> ${r.date} 
      <button onclick="baixarRelatorio('${r.fileName}')">Baixar PDF</button>
    `;
    lista.appendChild(li);
  });
}

// Função para baixar o relatório
function baixarRelatorio(fileName) {
  window.location.href = `/api/download-report/${encodeURIComponent(fileName)}`;
}

// Exemplo de uso: buscar ao clicar em um botão
document.getElementById('buscar-btn').addEventListener('click', () => {
  const ulCode = document.getElementById('ul-input').value;
  const data = document.getElementById('data-input').value; // formato YYYY-MM-DD
  buscarRelatorios(ulCode, data);
});
