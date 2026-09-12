(function () {
  const form = document.querySelector('#login-form');
  const accInput = document.querySelector('#login-account');
  const pwdInput = document.querySelector('#login-password');
  const errorBox = document.querySelector('#login-error');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const account = accInput.value.trim();
    const password = pwdInput.value;
    if (!account || !password) { showError('请输入账户名和密码'); return; }
    const user = EFStore.login(account, password);
    if (!user) { showError('账户名或密码不正确，请重试'); return; }
    errorBox.style.display = 'none';
    location.href = 'workspace.html';
  });

  accInput.focus();
})();
