export function renderLoginPage(params: {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
  resource?: string;
  scope?: string;
  error?: string;
}): string {
  const hidden = (name: string, value?: string) =>
    value !== undefined
      ? `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`
      : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Conectar ao credenciamento-api</title>
<style>
  body { margin:0; padding:0; background:#0A1628; font-family:Arial,Helvetica,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .card { background:#0D1F35; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:32px; width:100%; max-width:360px; }
  h1 { color:#fff; font-size:18px; margin:0 0 6px; }
  p.sub { color:rgba(255,255,255,0.6); font-size:13px; margin:0 0 20px; }
  label { display:block; color:rgba(255,255,255,0.8); font-size:13px; margin:0 0 6px; }
  input[type="email"], input[type="password"] {
    width:100%; box-sizing:border-box; padding:10px 12px; margin-bottom:14px;
    border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.05);
    color:#fff; font-size:14px;
  }
  button { width:100%; padding:12px; border:none; border-radius:8px; background:#E91E63; color:#fff; font-size:14px; font-weight:700; cursor:pointer; }
  .error { background:rgba(255,112,67,0.1); border:1px solid rgba(255,112,67,0.3); color:#FF7043; padding:10px 12px; border-radius:6px; font-size:13px; margin-bottom:14px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Conectar ao credenciamento-api</h1>
    <p class="sub">Entre com sua conta de administrador para autorizar este conector.</p>
    ${params.error ? `<div class="error">${escapeHtml(params.error)}</div>` : ''}
    <form method="POST" action="/oauth/authorize">
      ${hidden('client_id', params.client_id)}
      ${hidden('redirect_uri', params.redirect_uri)}
      ${hidden('response_type', params.response_type)}
      ${hidden('code_challenge', params.code_challenge)}
      ${hidden('code_challenge_method', params.code_challenge_method)}
      ${hidden('state', params.state)}
      ${hidden('resource', params.resource)}
      ${hidden('scope', params.scope)}
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autofocus>
      <label for="password">Senha</label>
      <input type="password" id="password" name="password" required>
      <button type="submit">Entrar e autorizar</button>
    </form>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
