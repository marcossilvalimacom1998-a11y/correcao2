document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      try {
        const tab = button.getAttribute('data-tab');
        if (!tab) return;

        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.style.display = 'none');

        const tabContent = document.getElementById(tab);
        if (tabContent) {
          tabContent.style.display = 'block';
          button.classList.add('active');

          if (tab === 'tempo' && typeof carregarArmariosTemporizados === 'function') {
            carregarArmariosTemporizados();
          }
        }
      } catch (e) {
        console.error('Erro ao mudar de aba:', e);
      }
    });
  });
});